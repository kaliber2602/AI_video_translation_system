import logging
import shutil
from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse

from app.core.config import OUTPUT_DIR, UPLOAD_DIR
from app.pipeline import process_video_translation
from app.schemas import ProcessingStatusResponse, UploadResponse

from app.api.auth_routes import router as auth_router
from app.api.user_settings_routes import router as user_settings_router
from app.api.tag_routes import router as tag_router
from app.api.project_routes import router as project_router

logger = logging.getLogger("app.api.routes")

router = APIRouter(prefix="/api")
router.include_router(auth_router)
router.include_router(user_settings_router)
router.include_router(tag_router)
router.include_router(project_router)

@router.get("/health")
def health_check():
    return {"status": "ok", "message": "AI System Backend is ready."}


@router.get("/status", response_model=ProcessingStatusResponse)
def processing_status():
    return ProcessingStatusResponse(
        status="ready",
        message="Processing pipeline is available for uploads."
    )


@router.post("/uploads", response_model=UploadResponse)
async def upload_video(
    file: UploadFile = File(...),
    target_language: str = Query("vi"),
):
    input_video_path = UPLOAD_DIR / file.filename
    output_video_name = f"dubbed_{file.filename}"
    output_video_path = OUTPUT_DIR / output_video_name

    with open(input_video_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        final_video_path, detected_lang, translated_segments = process_video_translation(
            video_input_path=str(input_video_path),
            final_output_path=str(output_video_path),
            target_language=target_language,
            glossary={},
        )

        transcript_text = "\n".join(
            [
                f"[{seg['start']:.1f}s - {seg['end']:.1f}s] "
                f"{seg.get('translated_text', seg['text'])}"
                for seg in translated_segments
            ]
        )

        return UploadResponse(
            filename=file.filename,
            message="Video processed successfully",
            stored_name=file.filename,
            transcript=transcript_text,
            detected_language=detected_lang,
            target_language=target_language,
            output_video_path=output_video_name,
            dubbed_video_path=output_video_name,
            status="completed",
        )

    except Exception as e:
        logger.error(f"Pipeline Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/files/{filename}")
def download_file(filename: str):
    out_path = OUTPUT_DIR / filename
    if out_path.exists():
        return FileResponse(out_path)

    up_path = UPLOAD_DIR / filename
    if up_path.exists():
        return FileResponse(up_path)

    raise HTTPException(status_code=404, detail="File not found")
