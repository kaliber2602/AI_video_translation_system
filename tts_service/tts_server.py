from fastapi import FastAPI, Form, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from TTS.api import TTS
import uuid
import os
import asyncio
import edge_tts
from gtts import gTTS

app = FastAPI(title="Standalone TTS Service")

os.environ["COQUI_TOS_AGREED"] = "1"

print("[TTS Server] Đang khởi tạo mô hình XTTS v2...", flush=True)
try:
    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to("cuda")
except Exception as e:
    print(f"[TTS Server] Cảnh báo: Không chạy được CUDA ({e}), chuyển XTTS sang CPU...", flush=True)
    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to("cpu")

TEMP_TTS_DIR = "tts_temp_outputs"
os.makedirs(TEMP_TTS_DIR, exist_ok=True)


async def _edge_tts_save(text: str, voice: str, path: str):
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(path)


@app.post("/generate_tts")
async def generate_tts(
    text: str = Form(...),
    language: str = Form("en"),
    speaker_wav: UploadFile = File(None),
    voice: str = Form(None),
    model: str = Form(None)
):
    output_filename = f"{uuid.uuid4().hex}.wav"
    output_path = os.path.join(TEMP_TTS_DIR, output_filename)
    
    # Lưu file Voice Profile tạm thời nếu có
    temp_speaker_path = None
    if speaker_wav:
        temp_speaker_path = os.path.join(TEMP_TTS_DIR, f"speaker_{uuid.uuid4().hex}.wav")
        content = await speaker_wav.read()
        if content:
            with open(temp_speaker_path, "wb") as f:
                f.write(content)
        else:
            temp_speaker_path = None

    try:
        # XỬ LÝ RIÊNG CHO TIẾNG VIỆT (EDGE-TTS / GTTS FALLBACK) HOẶC EDGE-TTS MODE
        tts_model_clean = (model or "").lower()
        if language == "vi" or "edge" in tts_model_clean:
            # Voice mapping for Vietnamese or requested voice
            selected_voice = voice or ("vi-VN-HoaiMyNeural" if language == "vi" else "en-US-JennyNeural")
            # Map legacy/custom voice names if passed
            voice_map = {
                "vi_female_loan": "vi-VN-HoaiMyNeural",
                "vi_male_nam": "vi-VN-NamMinhNeural",
                "female_warm": "vi-VN-HoaiMyNeural",
                "female": "vi-VN-HoaiMyNeural",
                "male": "vi-VN-NamMinhNeural",
                "en_female": "en-US-JennyNeural",
                "en_male": "en-US-GuyNeural"
            }
            target_voice = voice_map.get(selected_voice, selected_voice)
            try:
                await _edge_tts_save(text, target_voice, output_path)
            except Exception as e:
                print(f"[TTS Server] Edge-TTS từ chối ({e}), fallback sang Google TTS...", flush=True)
                tts_google = gTTS(text=text, lang=language if language in ['vi', 'en', 'fr', 'ja', 'ko', 'zh-cn'] else 'vi')
                tts_google.save(output_path)
                
        # VOICE CLONING (XTTS V2) DÀNH CHO CÁC NGÔN NGỮ KHÁC
        else:
            if not temp_speaker_path or not os.path.exists(temp_speaker_path):
                # Fallback to Edge-TTS if no speaker audio is present
                fallback_voice = voice or "en-US-JennyNeural"
                await _edge_tts_save(text, fallback_voice, output_path)
            else:
                tts.tts_to_file(
                    text=text,
                    speaker_wav=temp_speaker_path,
                    language=language,
                    file_path=output_path
                )
            
        if temp_speaker_path and os.path.exists(temp_speaker_path):
            os.remove(temp_speaker_path)
            
        return FileResponse(output_path, media_type="audio/wav")
        
    except Exception as e:
        if os.path.exists(temp_speaker_path):
            os.remove(temp_speaker_path)
        raise HTTPException(status_code=500, detail=str(e))