# app/api/routes.py - UPDATED
import logging
from pathlib import Path
import shutil
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse

from app.core.config import OUTPUT_DIR, UPLOAD_DIR
from app.pipeline import process_video_translation
from app.schemas import ProcessingStatusResponse, UploadResponse

# Import all routers
from app.api.auth_routes import router as auth_router
from app.api.user_settings_routes import router as user_settings_router
from app.api.tag_routes import router as tag_router
from app.api.project_routes import router as project_router
from app.api.subscription_routes import router as subscription_router
from app.api.video_routes import router as video_router
from app.api.payment_routes import router as payment_router
from app.api.contact_routes import router as contact_router
from app.api.admin_routes import router as admin_router
from app.api.notification_routes import router as notification_router
from app.api.integration_routes import router as integration_router
from app.api.preset_routes import router as preset_router
from app.api.batch_routes import router as batch_router

logger = logging.getLogger("app.api.routes")

# Main router
router = APIRouter(prefix="/api")

# Include all sub-routers
router.include_router(auth_router)
router.include_router(user_settings_router)
router.include_router(tag_router)
router.include_router(project_router)
router.include_router(subscription_router)
router.include_router(video_router)
router.include_router(integration_router)
router.include_router(preset_router)
router.include_router(batch_router)


# ============================================================
# LEGACY / HEALTH ENDPOINTS
# ============================================================
router.include_router(payment_router)
router.include_router(contact_router)
router.include_router(admin_router)
router.include_router(notification_router)

@router.get("/health")
def health_check():
    return {"status": "ok", "message": "AI System Backend is ready."}


@router.get("/status", response_model=ProcessingStatusResponse)
def processing_status():
    return ProcessingStatusResponse(
        status="ready",
        message="Processing pipeline is available for uploads."
    )


# ============================================================
# LEGACY UPLOAD ENDPOINT (Keep for backward compatibility)
# ============================================================
@router.post("/uploads", response_model=UploadResponse)
async def upload_video_legacy(
    file: UploadFile = File(...),
    target_language: str = Query("vi"),
):
    """
    Legacy upload endpoint - kept for backward compatibility.
    Use /api/videos/upload for new development.
    """
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
    # Enforce strict path traversal protection
    safe_filename = Path(filename).name
    if not safe_filename or ".." in filename or safe_filename != filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename: path traversal characters are forbidden",
        )

    out_base = OUTPUT_DIR.resolve()
    out_path = (OUTPUT_DIR / safe_filename).resolve()
    if out_path.is_relative_to(out_base) and out_path.is_file():
        return FileResponse(out_path)

    up_base = UPLOAD_DIR.resolve()
    up_path = (UPLOAD_DIR / safe_filename).resolve()
    if up_path.is_relative_to(up_base) and up_path.is_file():
        return FileResponse(up_path)

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")