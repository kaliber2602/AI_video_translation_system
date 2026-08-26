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
from app.video.processor import split_video, convert_quality

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


def process_video_with_segments(
    video_path: str,
    video_id: str,
    prefix: str,  # e.g., "original" or "translated/vi"
    content_type: str = "video/mp4",
    create_qualities: bool = True,
) -> dict:
    """
    Process a video into segments and quality versions.
    
    Args:
        video_path: Path to the video file
        video_id: Unique video ID for S3 folder
        prefix: S3 prefix (e.g., "original" or "translated/vi")
        content_type: MIME type of the video
        create_qualities: Whether to create quality versions
    
    Returns:
        Dictionary with S3 keys for segments and qualities
    """
    result = {
        "segments": [],
        "qualities": {},
        "segment_qualities": {}  # For quality versions of each segment
    }
    
    # Create temp directory for this video's processing
    temp_dir = OUTPUT_DIR / f"temp_{video_id}_{prefix.replace('/', '_')}"
    temp_dir.mkdir(exist_ok=True, parents=True)
    
    try:
        # --- STEP 1: Split video into segments ---
        logger.info(f"🎬 Splitting {prefix} video into segments...")
        segments_dir = temp_dir / "segments"
        segments = split_video(str(video_path), str(segments_dir), SEGMENT_SECONDS)
        
        # Upload each segment to S3
        segment_keys = []
        for segment_path in segments:
            filename = os.path.basename(segment_path)
            s3_key = f"videos/{video_id}/{prefix}/segments/{filename}"
            upload_file(segment_path, s3_key, "video/mp4")
            segment_keys.append(s3_key)
            logger.info(f"✅ Uploaded segment: {s3_key}")
        
        result["segments"] = segment_keys
        
        # --- STEP 2: Create quality versions for EACH segment ---
        if create_qualities:
            logger.info(f"🎨 Creating quality versions for each segment of {prefix}...")
            
            qualities = {
                "360p": 360,
                "720p": 720,
                "1080p": 1080,
            }
            
            # For each segment, create quality versions
            for segment_path in segments:
                segment_filename = os.path.basename(segment_path)
                segment_name = os.path.splitext(segment_filename)[0]  # e.g., "segment_001"
                
                # Create a subfolder for this segment's qualities
                segment_qualities_dir = temp_dir / "segment_qualities" / segment_name
                segment_qualities_dir.mkdir(exist_ok=True, parents=True)
                
                for quality_name, height in qualities.items():
                    # Output path for this segment + quality
                    quality_output_path = segment_qualities_dir / f"{quality_name}.mp4"
                    
                    # Convert this segment to the target quality
                    convert_quality(
                        segment_path, 
                        str(quality_output_path), 
                        height
                    )
                    
                    # Upload quality version of this segment
                    s3_key = (
                        f"videos/{video_id}/{prefix}/qualities/"
                        f"{quality_name}/segments/{segment_filename}"
                    )
                    upload_file(str(quality_output_path), s3_key, "video/mp4")
                    logger.info(f"✅ Uploaded {quality_name} quality for {segment_name}: {s3_key}")
                    
                    # Store the S3 key
                    if quality_name not in result["segment_qualities"]:
                        result["segment_qualities"][quality_name] = []
                    result["segment_qualities"][quality_name].append(s3_key)
        
        logger.info(f"✅ Completed processing {prefix} with {len(segments)} segments")
        
    finally:
        # Clean up temp directory
        shutil.rmtree(temp_dir, ignore_errors=True)
    
    return result


@router.post("/uploads", response_model=UploadResponse)
async def upload_video(
    file: UploadFile = File(...),
    target_language: str = Query("vi"),
):
    input_video_path = UPLOAD_DIR / file.filename
    output_video_name = f"dubbed_{file.filename}"
    output_video_path = OUTPUT_DIR / output_video_name
    
    # Generate a unique video ID for S3 organization
    video_id = uuid.uuid4().hex

    # Save uploaded file
    with open(input_video_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # --- STEP 1: Process original video with segments ---
        logger.info(f"📹 Processing original video: {file.filename}")
        original_result = process_video_with_segments(
            video_path=str(input_video_path),
            video_id=video_id,
            prefix="original",
            content_type=file.content_type or "video/mp4",
            create_qualities=True,
        )

        # --- STEP 2: Run translation pipeline ---
        logger.info(f"🌍 Translating video to: {target_language}")
        result = process_video_translation(
            video_input_path=str(input_video_path),
            final_output_path=str(output_video_path),
            target_language=target_language,
            glossary={},
        )
        
        # Extract values from result dictionary
        final_video_path = result["translated_video_path"]
        detected_lang = result["detected_language"]
        translated_segments = result["translated_segments"]

        # --- STEP 3: Process translated video with segments ---
        logger.info(f"📹 Processing translated video")
        translated_result = process_video_with_segments(
            video_path=str(output_video_path),
            video_id=video_id,
            prefix=f"translated/{target_language}",
            content_type="video/mp4",
            create_qualities=True,
        )

        # --- STEP 4: Upload the full translated video (for reference) ---
        s3_full_video_key = f"videos/{video_id}/translated/{target_language}/full.mp4"
        upload_file(str(output_video_path), s3_full_video_key, "video/mp4")
        logger.info(f"✅ Uploaded full translated video: {s3_full_video_key}")

        # --- STEP 5: Upload original full video (for reference) ---
        s3_original_full_key = f"videos/{video_id}/original/full{os.path.splitext(file.filename)[1]}"
        upload_file(str(input_video_path), s3_original_full_key, file.content_type or "video/mp4")
        logger.info(f"✅ Uploaded full original video: {s3_original_full_key}")

        # Prepare transcript
        transcript_text = "\n".join(
            [
                f"[{seg['start']:.1f}s - {seg['end']:.1f}s] "
                f"{seg.get('translated_text', seg['text'])}"
                for seg in translated_segments
            ]
        )

        return UploadResponse(
            filename=file.filename,
            message="Video processed and uploaded to S3 successfully",
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
                    "full": s3_original_full_key,
                    "segments": original_result["segments"],
                    "segment_qualities": original_result["segment_qualities"],
                },
                "translated": {
                    "full": s3_full_video_key,
                    "segments": translated_result["segments"],
                    "segment_qualities": translated_result["segment_qualities"],
                }
            }
        )

    except Exception as e:
        logger.error(f"Pipeline Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        # Clean up local files after upload to S3
        try:
            if input_video_path.exists():
                os.remove(input_video_path)
            if output_video_path.exists():
                os.remove(output_video_path)
            logger.info(f"🧹 Cleaned up local files")
        except Exception as e:
            logger.warning(f"Failed to clean up local files: {e}")


@router.get("/files/{filename}")
def download_file(filename: str):
    out_path = OUTPUT_DIR / filename
    if out_path.exists():
        return FileResponse(out_path)

    up_path = UPLOAD_DIR / filename
    if up_path.exists():
        return FileResponse(up_path)

    raise HTTPException(status_code=404, detail="File not found")