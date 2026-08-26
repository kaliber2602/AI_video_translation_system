import os
import tempfile
import shutil
from app.services import AudioService, TranslationService, STTService, TTSAlignerService
from app.services.s3_service import upload_file  # ← NEW
from app.video.processor import split_video, convert_all_qualities  # ← NEW
from app.core.languages import TARGET_LANGUAGE_MAP, SOURCE_LANGUAGE_MAP
from app.core.config import SEGMENT_SECONDS  # ← NEW

# Load mô hình 1 lần duy nhất khi ứng dụng khởi chạy
audio_service = AudioService()
stt_service = STTService()
translation_service = TranslationService()

# Lấy URL của TTS từ biến môi trường của Docker
tts_url = os.getenv("TTS_API_URL", "http://tts-service:8001/generate_tts")
tts_aligner = TTSAlignerService(tts_api_url=tts_url)

def process_video_translation(
    video_input_path: str, 
    final_output_path: str, 
    target_language: str, 
    glossary: dict = None,
    video_id: str = None,        # ← NEW: For S3 folder structure
    upload_to_s3: bool = True,   # ← NEW: Control S3 upload
    create_segments: bool = True, # ← NEW: Also create segments from translated video
    create_qualities: bool = True # ← NEW: Also create quality versions
):
    if glossary is None: 
        glossary = {}
        
    lang_config = TARGET_LANGUAGE_MAP.get(target_language, TARGET_LANGUAGE_MAP["vi"])
    nllb_tgt_lang = lang_config["nllb"]
    xtts_tgt_lang = lang_config["xtts"]
    
    print(f"[Pipeline] Khởi động tiến trình dịch sang: {target_language.upper()}", flush=True)
    
    result = {
        "translated_video_path": final_output_path,
        "detected_language": None,
        "translated_segments": None,
        "s3_keys": {
            "translated_video": None,
            "segments": [],
            "qualities": {}
        }
    }
    
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
        
        # Store results
        result["detected_language"] = detected_iso_lang
        result["translated_segments"] = translated_segments
        
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
        
        # --- NEW: Upload to S3 ---
        if upload_to_s3 and video_id:
            print(f"[S3] Uploading translated video to S3...", flush=True)
            
            # Upload the translated video
            s3_key = f"videos/{video_id}/translated/{target_language}/source.mp4"
            upload_file(final_output_path, s3_key, "video/mp4")
            result["s3_keys"]["translated_video"] = s3_key
            print(f"✅ Uploaded to S3: {s3_key}", flush=True)
            
            # Create and upload segments from translated video
            if create_segments:
                print(f"[S3] Creating segments from translated video...", flush=True)
                segments_dir = os.path.join(temp_dir, "segments")
                segments = split_video(final_output_path, segments_dir, SEGMENT_SECONDS)
                
                segment_keys = []
                for segment_path in segments:
                    filename = os.path.basename(segment_path)
                    s3_key = f"videos/{video_id}/translated/{target_language}/segments/{filename}"
                    upload_file(segment_path, s3_key, "video/mp4")
                    segment_keys.append(s3_key)
                
                result["s3_keys"]["segments"] = segment_keys
                print(f"✅ Uploaded {len(segment_keys)} segments to S3", flush=True)
            
            # Create and upload quality versions from translated video
            if create_qualities:
                print(f"[S3] Creating quality versions from translated video...", flush=True)
                qualities_dir = os.path.join(temp_dir, "qualities")
                quality_files = convert_all_qualities(final_output_path, qualities_dir)
                
                quality_keys = {}
                for quality, local_path in quality_files.items():
                    s3_key = f"videos/{video_id}/translated/{target_language}/qualities/{quality}/video.mp4"
                    upload_file(local_path, s3_key, "video/mp4")
                    quality_keys[quality] = s3_key
                
                result["s3_keys"]["qualities"] = quality_keys
                print(f"✅ Uploaded {len(quality_keys)} quality versions to S3", flush=True)
        
    print("[Pipeline] Xử lý hoàn tất! Đã tự động dọn dẹp các tệp tạm.", flush=True)
    return result