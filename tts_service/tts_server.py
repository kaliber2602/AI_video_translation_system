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
    speaker_wav: UploadFile = File(...)
):
    output_filename = f"{uuid.uuid4().hex}.wav"
    output_path = os.path.join(TEMP_TTS_DIR, output_filename)
    
    # Lưu file Voice Profile tạm thời
    temp_speaker_path = os.path.join(TEMP_TTS_DIR, f"speaker_{uuid.uuid4().hex}.wav")
    with open(temp_speaker_path, "wb") as f:
        f.write(await speaker_wav.read())

    try:
        # XỬ LÝ RIÊNG CHO TIẾNG VIỆT (EDGE-TTS / GTTS FALLBACK)
        if language == "vi":
            voice = "vi-VN-HoaiMyNeural"
            try:
                asyncio.run(_edge_tts_save(text, voice, output_path))
            except Exception as e:
                print(f"[TTS Server] Edge-TTS từ chối ({e}), fallback sang Google TTS...", flush=True)
                tts_google = gTTS(text=text, lang='vi')
                tts_google.save(output_path)
                
        # VOICE CLONING (XTTS V2) DÀNH CHO CÁC NGÔN NGỮ KHÁC
        else:
            tts.tts_to_file(
                text=text,
                speaker_wav=temp_speaker_path,
                language=language,
                file_path=output_path
            )
            
        if os.path.exists(temp_speaker_path):
            os.remove(temp_speaker_path)
            
        return FileResponse(output_path, media_type="audio/wav")
        
    except Exception as e:
        if os.path.exists(temp_speaker_path):
            os.remove(temp_speaker_path)
        raise HTTPException(status_code=500, detail=str(e))