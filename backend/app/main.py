import logging
import sys
import shutil
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.pipeline import process_video_translation
from app.schemas import ProcessingStatusResponse, UploadResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
    force=True,
)
logger = logging.getLogger("app.main")

app = FastAPI(title="AI Video Translation Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = Path("outputs")
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "AI System Backend is ready."}


@app.get("/api/status", response_model=ProcessingStatusResponse)
def processing_status():
    return ProcessingStatusResponse(
        status="ready",
        message="Processing pipeline is available for uploads."
    )


@app.post("/api/uploads", response_model=UploadResponse)
async def upload_video(
    file: UploadFile = File(...),
    target_language: str = Query("vi")
):
    input_video_path = UPLOAD_DIR / file.filename
    output_video_name = f"dubbed_{file.filename}"
    output_video_path = OUTPUT_DIR / output_video_name
    
    # Lưu file upload
    with open(input_video_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        # Thực thi pipeline AI
        final_video_path, detected_lang, translated_segments = process_video_translation(
            video_input_path=str(input_video_path),
            final_output_path=str(output_video_path),
            target_language=target_language,
            glossary={}
        )
        
        # Gom transcript đã dịch
        transcript_text = "\n".join([f"[{seg['start']:.1f}s - {seg['end']:.1f}s] {seg.get('translated_text', seg['text'])}" for seg in translated_segments])
        
        return UploadResponse(
            filename=file.filename,
            message="Video processed successfully",
            stored_name=file.filename,
            transcript=transcript_text,
            detected_language=detected_lang,
            target_language=target_language,
            output_video_path=output_video_name,
            dubbed_video_path=output_video_name,
            status="completed"
        )
    except Exception as e:
        logger.error(f"Pipeline Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/files/{filename}")
def download_file(filename: str):
    out_path = OUTPUT_DIR / filename
    if out_path.exists():
        return FileResponse(out_path)
        
    up_path = UPLOAD_DIR / filename
    if up_path.exists():
        return FileResponse(up_path)
        
    raise HTTPException(status_code=404, detail="File not found")