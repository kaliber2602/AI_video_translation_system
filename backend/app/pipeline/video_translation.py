import os
import tempfile
from app.services import AudioService, TranslationService, STTService, TTSAlignerService
from app.core.languages import TARGET_LANGUAGE_MAP, SOURCE_LANGUAGE_MAP
import torch

# ✅ Lazy initialization & dependency injection hooks
audio_service = None
stt_service = None
translation_service = None
tts_aligner = None

def get_audio_service():
    global audio_service
    if audio_service is None:
        audio_service = AudioService()
    return audio_service

def get_stt_service():
    global stt_service
    if stt_service is None:
        stt_service = STTService()
    return stt_service

def get_translation_service():
    global translation_service
    if translation_service is None:
        translation_service = TranslationService()
    return translation_service

def get_tts_aligner():
    global tts_aligner
    if tts_aligner is None:
        tts_url = os.getenv("TTS_API_URL", "http://tts-service:8001/generate_tts")
        tts_aligner = TTSAlignerService(tts_api_url=tts_url)
    return tts_aligner

def _video_translation(video_input_path: str, final_output_path: str, target_language: str, glossary: dict = None):
    """
    Process video translation with auto device detection
    
    Args:
        video_input_path: Path to input video
        final_output_path: Path to output video
        target_language: Target language code (e.g., 'vi', 'en', 'fr')
        glossary: Optional glossary for custom translations
    
    Returns:
        tuple: (output_path, detected_source_language, translated_segments)
    """
    if glossary is None:
        glossary = {}
        
    # Auto-detect and log device
    cuda_available = torch.cuda.is_available()
    device_info = "GPU" if cuda_available else "CPU"
    print(f"[Pipeline] 🚀 Starting translation pipeline using {device_info}", flush=True)
    
    lang_config = TARGET_LANGUAGE_MAP.get(target_language, TARGET_LANGUAGE_MAP["vi"])
    nllb_tgt_lang = lang_config["nllb"]
    xtts_tgt_lang = lang_config["xtts"]
    
    print(f"[Pipeline] 🎯 Target language: {target_language.upper()} ({nllb_tgt_lang})", flush=True)
    print(f"[Pipeline] 🎤 TTS language: {xtts_tgt_lang}", flush=True)
    
    # Get services (lazy initialization)
    audio_service = get_audio_service()
    stt_service = get_stt_service()
    translation_service = get_translation_service()
    tts_aligner = get_tts_aligner()
    
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        temp_raw_audio = os.path.join(temp_dir, "raw_audio.wav")
        temp_final_tts = os.path.join(temp_dir, "final_tts_track.wav")
        
        # --- BƯỚC 1: Tiền xử lý & Tách âm thanh ---
        print("[1/5] 🔄 Trích xuất và bóc tách Vocal / Nhạc nền (Demucs)...", flush=True)
        try:
            audio_service.extract_audio(video_input_path, temp_raw_audio)
            vocal_path, bgm_path = audio_service.separate_vocal_bgm(temp_raw_audio, temp_dir)
            print("[1/5] ✅ Audio extraction and separation complete", flush=True)
        except Exception as e:
            print(f"[1/5] ❌ Audio extraction failed: {e}", flush=True)
            raise
        
        # --- BƯỚC 2: STT & TIN TƯỞNG TUYỆT ĐỐI VÀO WHISPER ---
        print("[2/5] 🔄 Nhận diện giọng nói và phát hiện ngôn ngữ (Whisper)...", flush=True)
        try:
            segments, detected_iso_lang = stt_service.transcribe_audio(vocal_path)
            print(f"[2/5] ✅ Whisper detected {len(segments)} segments, language: {detected_iso_lang.upper()}", flush=True)
        except Exception as e:
            print(f"[2/5] ❌ Transcription failed: {e}", flush=True)
            raise
        
        print(f"[*] 🗣️ Whisper detected source language: {detected_iso_lang.upper()}", flush=True)
        nllb_src_lang = SOURCE_LANGUAGE_MAP.get(detected_iso_lang, "eng_Latn")
        print(f"[*] 🔄 NLLB source language code: {nllb_src_lang}", flush=True)
        
        # --- BƯỚC 3: Dịch thuật bối cảnh (Document Context) & Bảo vệ từ khóa ---
        print(f"[3/5] 🔄 Dịch thuật văn bản ({nllb_src_lang} -> {nllb_tgt_lang}) bằng NLLB-1.3B...", flush=True)
        try:
            translated_segments = translation_service.translate_document(
                segments=segments,
                glossary=glossary,
                src_lang=nllb_src_lang,
                tgt_lang=nllb_tgt_lang
            )
            print(f"[3/5] ✅ Translation complete: {len(translated_segments)} segments", flush=True)
        except Exception as e:
            print(f"[3/5] ❌ Translation failed: {e}", flush=True)
            raise
        
        # --- BƯỚC 4: Lồng tiếng Voice Cloning & Ép Timeline ---
        print(f"[4/5] 🔄 Trích xuất Voice Profile VAD và sinh giọng lồng tiếng ({xtts_tgt_lang})...", flush=True)
        try:
            tts_aligner.generate_tts_with_alignment(
                segments=translated_segments,
                output_path=temp_final_tts,
                temp_dir=temp_dir,
                vocal_path=vocal_path,
                tgt_lang=xtts_tgt_lang
            )
            print("[4/5] ✅ TTS generation complete", flush=True)
        except Exception as e:
            print(f"[4/5] ❌ TTS generation failed: {e}", flush=True)
            raise
        
        # --- BƯỚC 5: Mix Audio & Xuất Video ---
        print("[5/5] 🔄 Trộn âm thanh lồng tiếng + Nhạc nền gốc và đóng gói Video...", flush=True)
        try:
            audio_service.mix_and_mux(
                video_input_path, 
                temp_final_tts, 
                bgm_path, 
                final_output_path, 
                temp_dir
            )
            print("[5/5] ✅ Video rendering complete", flush=True)
        except Exception as e:
            print(f"[5/5] ❌ Video rendering failed: {e}", flush=True)
            raise
        
    print(f"[Pipeline] ✅ Xử lý hoàn tất! Output: {final_output_path}", flush=True)
    print(f"[Pipeline] ℹ️ Source language: {detected_iso_lang.upper()}, Target: {target_language.upper()}", flush=True)
    return final_output_path, detected_iso_lang, translated_segments


# ✅ For backward compatibility - maintain the same function name
def process_video_translation(video_input_path: str, final_output_path: str, target_language: str, glossary: dict = None):
    """Wrapper function for backward compatibility"""
    return _video_translation(video_input_path, final_output_path, target_language, glossary)