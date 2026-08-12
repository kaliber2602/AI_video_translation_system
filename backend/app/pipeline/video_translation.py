import os
import tempfile
from app.services import AudioService, TranslationService, STTService, TTSAlignerService

from app.core.languages import TARGET_LANGUAGE_MAP, SOURCE_LANGUAGE_MAP

# Load mô hình 1 lần duy nhất khi ứng dụng khởi chạy
audio_service = AudioService()
stt_service = STTService()
translation_service = TranslationService()

# Lấy URL của TTS từ biến môi trường của Docker
tts_url = os.getenv("TTS_API_URL", "http://tts-service:8001/generate_tts")
tts_aligner = TTSAlignerService(tts_api_url=tts_url)

def process_video_translation(video_input_path: str, final_output_path: str, target_language: str, glossary: dict = None):
    if glossary is None: 
        glossary = {}
        
    lang_config = TARGET_LANGUAGE_MAP.get(target_language, TARGET_LANGUAGE_MAP["vi"])
    nllb_tgt_lang = lang_config["nllb"]
    xtts_tgt_lang = lang_config["xtts"]
    
    print(f"[Pipeline] Khởi động tiến trình dịch sang: {target_language.upper()}", flush=True)
    
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_raw_audio = os.path.join(temp_dir, "raw_audio.wav")
        temp_final_tts = os.path.join(temp_dir, "final_tts_track.wav")
        
        # --- BƯỚC 1: Tiền xử lý & Tách âm thanh ---
        print("[1/5] Trích xuất và bóc tách Vocal / Nhạc nền (Demucs)...", flush=True)
        audio_service.extract_audio(video_input_path, temp_raw_audio)
        vocal_path, bgm_path = audio_service.separate_vocal_bgm(temp_raw_audio, temp_dir)
        
        # --- BƯỚC 2: STT & TIN TƯỞNG TUYỆT ĐỐI VÀO WHISPER ---
        print("[2/5] Nhận diện giọng nói và phát hiện ngôn ngữ (Whisper)...", flush=True)
        segments, detected_iso_lang = stt_service.transcribe_audio(vocal_path)
        
        print(f"[*] Whisper phát hiện ngôn ngữ gốc là: {detected_iso_lang.upper()}", flush=True)
        nllb_src_lang = SOURCE_LANGUAGE_MAP.get(detected_iso_lang, "eng_Latn")
        print(f"[*] CHỐT NGÔN NGỮ ĐƯA VÀO NLLB: {nllb_src_lang}", flush=True)
        
        # --- BƯỚC 3: Dịch thuật bối cảnh (Document Context) & Bảo vệ từ khóa ---
        print(f"[3/5] Dịch thuật văn bản ({nllb_src_lang} -> {nllb_tgt_lang}) bằng NLLB-1.3B...", flush=True)
        translated_segments = translation_service.translate_document(
            segments=segments,
            glossary=glossary,
            src_lang=nllb_src_lang,
            tgt_lang=nllb_tgt_lang
        )
        
        # --- BƯỚC 4: Lồng tiếng Voice Cloning & Ép Timeline ---
        print(f"[4/5] Trích xuất Voice Profile VAD và sinh giọng lồng tiếng ({xtts_tgt_lang})...", flush=True)
        tts_aligner.generate_tts_with_alignment(
            segments=translated_segments, 
            output_path=temp_final_tts, 
            temp_dir=temp_dir,
            vocal_path=vocal_path,
            tgt_lang=xtts_tgt_lang 
        )
        
        # --- BƯỚC 5: Mix Audio & Xuất Video ---
        print("[5/5] Trộn âm thanh lồng tiếng + Nhạc nền gốc và đóng gói Video...", flush=True)
        audio_service.mix_and_mux(video_input_path, temp_final_tts, bgm_path, final_output_path, temp_dir)
        
    print("[Pipeline] Xử lý hoàn tất! Đã tự động dọn dẹp các tệp tạm.", flush=True)
    return final_output_path, detected_iso_lang, translated_segments