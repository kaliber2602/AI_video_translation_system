# app/pipeline/orchestrator.py - NEW FILE
import os
import shutil
import tempfile
import uuid
from sqlalchemy.orm import Session

from app.models import Video, VideoPipelineConfig
from app.models.enums import JobStatus, JobStep
from app.services.job_service import JobService
from app.services.pipeline_steps import PipelineSteps
from app.core.config import UPLOAD_DIR


def run_full_pipeline(
    job_id: uuid.UUID,
    video_id: int,
    user_id: int,
    db: Session
):
    """
    Full pipeline orchestrator - runs all steps in sequence
    """
    job_service = JobService(db)
    pipeline = PipelineSteps(db, job_service)
    
    temp_dir = tempfile.mkdtemp()
    
    try:
        # Get video and config
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            raise ValueError(f"Video {video_id} not found")
        
        config = db.query(VideoPipelineConfig).filter(
            VideoPipelineConfig.video_id == video_id
        ).first()
        if not config:
            raise ValueError(f"Pipeline config for video {video_id} not found")
        
        # Find the uploaded video file
        video_path = None
        for ext in ['.mp4', '.mov', '.avi', '.mkv', '.webm']:
            possible_path = UPLOAD_DIR / f"{video_id}_{video.original_filename}"
            if possible_path.exists():
                video_path = str(possible_path)
                break
        
        if not video_path:
            # Try to find any file with the video_id prefix
            for file in UPLOAD_DIR.glob(f"{video_id}_*"):
                video_path = str(file)
                break
        
        if not video_path:
            raise ValueError(f"Video file for video {video_id} not found")
        
        target_lang = config.target_language or "vi"
        
        # STEP 1: Extract audio
        audio_result = pipeline.step_extract_audio(
            job_id, video_id, video_path, temp_dir
        )
        
        # STEP 2: Separate vocal/BGM
        separate_result = pipeline.step_separate_vocal_bgm(
            job_id, video_id, audio_result["audio_path"], temp_dir
        )
        
        # STEP 3: Transcribe
        transcribe_result = pipeline.step_transcribe(
            job_id, video_id, separate_result["vocal_path"], temp_dir
        )
        
        # STEP 4: Translate
        translate_result = pipeline.step_translate(
            job_id, video_id,
            transcribe_result["segments"],
            transcribe_result["detected_language"],
            target_lang,
            temp_dir
        )
        
        # STEP 5: Generate TTS
        tts_result = pipeline.step_generate_tts(
            job_id, video_id,
            translate_result["translated_segments"],
            separate_result["vocal_path"],
            target_lang,
            temp_dir
        )
        
        # STEP 6: Mix and mux
        mix_result = pipeline.step_mix_and_mux(
            job_id, video_id,
            video_path,
            tts_result["tts_path"],
            separate_result["bgm_path"],
            target_lang,
            temp_dir
        )
        
        # STEP 7: Generate subtitles
        subtitle_result = pipeline.step_generate_subtitles(
            job_id, video_id,
            translate_result["translated_segments"],
            target_lang,
            temp_dir
        )
        
        # STEP 8: Convert to HLS
        hls_result = pipeline.step_hls_convert(
            job_id, video_id,
            mix_result["output_path"],
            is_original=False
        )
        
        # STEP 9: Upload to S3
        upload_result = pipeline.step_upload_s3(
            job_id, video_id,
            mix_result["output_path"],
            hls_result["hls_result"],
            target_lang,
            is_original=False
        )
        
        # Also upload original video to S3
        original_hls_result = pipeline.step_hls_convert(
            job_id, video_id,
            video_path,
            is_original=True
        )
        
        original_upload_result = pipeline.step_upload_s3(
            job_id, video_id,
            video_path,
            original_hls_result["hls_result"],
            target_lang,
            is_original=True
        )
        
        # Mark job as completed
        job_service.update_job_status(
            job_id,
            JobStatus.COMPLETED,
            progress=100,
            current_step=JobStep.COMPLETED
        )
        
        job_service.log_task(
            job_id,
            "pipeline_complete",
            "success",
            "✅ Video processing complete!"
        )
        
    except Exception as e:
        job_service.update_job_status(
            job_id,
            JobStatus.FAILED,
            error_message=str(e)
        )
        job_service.log_task(
            job_id,
            "pipeline_error",
            "failed",
            error_trace=str(e)
        )
        raise
    finally:
        # Clean up temp directory
        shutil.rmtree(temp_dir, ignore_errors=True)