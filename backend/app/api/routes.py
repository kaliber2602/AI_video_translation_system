import os
import shutil
import uuid
import logging
from pathlib import Path
from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse

from app.core.config import OUTPUT_DIR, UPLOAD_DIR, SEGMENT_SECONDS
from app.pipeline import process_video_translation
from app.schemas import ProcessingStatusResponse, UploadResponse
from app.services.s3_service import upload_file
from app.services.hls_service import convert_to_hls_adaptive, upload_hls_to_s3

logger = logging.getLogger("app.api.routes")

router = APIRouter(prefix="/api")


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
    
    video_id = uuid.uuid4().hex

    # Save uploaded file
    with open(input_video_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # ============================================================
        # STEP 1: Run Translation Pipeline
        # ============================================================
        logger.info(f"Translating video to: {target_language}")
        
        result = process_video_translation(
            video_input_path=str(input_video_path),
            final_output_path=str(output_video_path),
            target_language=target_language,
            glossary={},
            video_id=video_id,
            upload_to_s3=False,
            create_segments=False,
            create_qualities=False,
        )
        
        # Extract values from the dictionary
        final_video_path = result["translated_video_path"]
        detected_lang = result["detected_language"]
        translated_segments = result["translated_segments"]

        # ============================================================
        # STEP 2: Convert to HLS (POST-PROCESSING)
        # ============================================================
        logger.info(f"Converting translated video to HLS format...")
        
        # Convert translated video to HLS
        hls_dir = OUTPUT_DIR / f"hls_{video_id}_{target_language}"
        hls_result = convert_to_hls_adaptive(
            input_path=str(output_video_path),
            output_dir=str(hls_dir),
            segment_seconds=SEGMENT_SECONDS,
        )
        
        # Upload HLS to S3
        s3_hls_prefix = f"videos/{video_id}/translated/{target_language}/hls"
        hls_uploaded = upload_hls_to_s3(hls_result, s3_hls_prefix)
        logger.info(f"Uploaded HLS to S3: {s3_hls_prefix}")

        # ============================================================
        # STEP 3: Upload original as HLS too
        # ============================================================
        logger.info(f"Converting original video to HLS format...")
        
        original_hls_dir = OUTPUT_DIR / f"hls_original_{video_id}"
        original_hls_result = convert_to_hls_adaptive(
            input_path=str(input_video_path),
            output_dir=str(original_hls_dir),
            segment_seconds=SEGMENT_SECONDS,
        )
        
        s3_original_hls_prefix = f"videos/{video_id}/original/hls"
        original_hls_uploaded = upload_hls_to_s3(original_hls_result, s3_original_hls_prefix)
        logger.info(f"Uploaded original HLS to S3: {s3_original_hls_prefix}")

        # ============================================================
        # STEP 4: Upload full videos (optional, for backup)
        # ============================================================
        s3_original_full = f"videos/{video_id}/original/full{os.path.splitext(file.filename)[1]}"
        upload_file(str(input_video_path), s3_original_full, file.content_type or "video/mp4")
        
        s3_translated_full = f"videos/{video_id}/translated/{target_language}/full.mp4"
        upload_file(str(output_video_path), s3_translated_full, "video/mp4")

        # ============================================================
        # STEP 5: Prepare response
        # ============================================================
        transcript_text = "\n".join(
            [
                f"[{seg['start']:.1f}s - {seg['end']:.1f}s] "
                f"{seg.get('translated_text', seg['text'])}"
                for seg in translated_segments
            ]
        )

        return UploadResponse(
            filename=file.filename,
            message="Video processed and uploaded as HLS to S3 successfully",
            stored_name=file.filename,
            transcript=transcript_text,
            detected_language=detected_lang,
            target_language=target_language,
            output_video_path=output_video_name,
            dubbed_video_path=output_video_name,
            status="completed",
            s3_info={
                "video_id": video_id,
                "original": {
                    "full": s3_original_full,
                    "hls_master": original_hls_uploaded["master_playlist"],
                },
                "translated": {
                    "full": s3_translated_full,
                    "hls_master": hls_uploaded["master_playlist"],
                }
            }
        )

    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        # Clean up local files
        try:
            if input_video_path.exists():
                os.remove(input_video_path)
            if output_video_path.exists():
                os.remove(output_video_path)
            # Clean HLS temp dirs
            shutil.rmtree(OUTPUT_DIR / f"hls_{video_id}_{target_language}", ignore_errors=True)
            shutil.rmtree(OUTPUT_DIR / f"hls_original_{video_id}", ignore_errors=True)
            logger.info("Cleaned up local files")
        except Exception as e:
            logger.warning(f"Cleanup failed: {e}")