# app/tasks/video_tasks.py - Standardized Celery Tasks (No SQLAlchemy)
import os
import logging
import uuid
from typing import Optional, Dict, Any
import torch
try:
    from celery import Task
except ImportError:
    class Task:
        pass

from app.tasks.celery_app import celery_app
from app.models import Video, VideoPipelineConfig, PipelineJob
from app.models.enums import JobStatus
from app.services.job_service import JobService
from app.pipeline.orchestrator import run_full_pipeline
from app.core.database import DatabaseSession, desc

logger = logging.getLogger("app.tasks.video_tasks")

# Auto-detect and log device for Celery worker
cuda_available = torch.cuda.is_available()
if cuda_available:
    logger.info("Celery Worker: CUDA detected - using GPU (%s, Memory: %.1fGB)",
                torch.cuda.get_device_name(0),
                torch.cuda.get_device_properties(0).total_memory / 1e9)
else:
    logger.info("Celery Worker: CUDA not detected - using CPU")


class PipelineTask(Task):
    _db = None
    
    @property
    def db(self) -> DatabaseSession:
        if self._db is None:
            self._db = DatabaseSession()
        return self._db
    
    def after_return(self, status, retval, task_id, args, kwargs, einfo):
        if self._db is not None:
            self._db.close()
            self._db = None


def _send_task_notification(
    user_id: int,
    video_id: int,
    title: str,
    message: str,
    step: str,
    status: str,
    error: Optional[str] = None,
    language: Optional[str] = None,
    db: Optional[DatabaseSession] = None,
) -> None:
    """Safely dispatch in-app and email notifications from Celery worker tasks."""
    try:
        from app.services.notification_service import create_notification
        project_id = None
        if db is not None:
            try:
                v = db.query(Video).filter(Video.id == video_id).first()
                if v and getattr(v, "project_id", None):
                    project_id = v.project_id
            except Exception:
                pass

        action_url = (
            f"/workspace/project/{project_id}/video/{video_id}"
            if project_id
            else f"/workspace/video/{video_id}/editor"
        )
        meta = {
            "video_id": video_id,
            "step": step,
            "status": status,
            "event": "pipeline_success" if status == "completed" else "pipeline_failed",
        }
        if language:
            meta["language"] = language
        if error:
            meta["error"] = error[:300]

        create_notification(
            user_id=user_id,
            type="pipeline",
            title=title,
            message=message,
            action_url=action_url,
            target_type="video",
            target_id=str(video_id),
            metadata=meta,
            background_tasks=None,
        )
        logger.info(
            "[CeleryNotification] Dispatched notification for video %d, user %d, step %s, status %s",
            video_id,
            user_id,
            step,
            status,
        )
    except Exception as n_err:
        logger.warning(
            "[CeleryNotification] Could not dispatch task notification for video %d: %s",
            video_id,
            n_err,
        )


@celery_app.task(bind=True, base=PipelineTask, name="process_video_pipeline", 
                 max_retries=3, soft_time_limit=7200, time_limit=7800)
def process_video_pipeline(self, video_id: int, user_id: int, job_id: Optional[str] = None):
    """Process a video through the full pipeline with auto device detection"""
    db = self.db
    
    try:
        cuda_available = torch.cuda.is_available()
        print(f"🚀 Starting pipeline for video {video_id} using {'GPU' if cuda_available else 'CPU'}", flush=True)
        
        self.update_state(
            state="STARTED", 
            meta={
                "video_id": video_id, 
                "status": "initializing",
                "device": "GPU" if cuda_available else "CPU"
            }
        )
        
        job_service = JobService(db)
        config = db.query(VideoPipelineConfig).filter(
            VideoPipelineConfig.video_id == video_id
        ).first()
        
        if not config:
            raise ValueError(f"No pipeline config found for video {video_id}")
        
        target_lang = config.target_language if config and getattr(config, "target_language", None) else "vi"
        source_lang = config.source_language if config and getattr(config, "source_language", None) else "en"

        job = None
        if job_id:
            try:
                job_uuid = uuid.UUID(job_id) if isinstance(job_id, str) else job_id
                job = job_service.get_job(job_uuid)
            except Exception as e:
                print(f"⚠️ Could not load job {job_id}: {e}", flush=True)

        if not job:
            job = job_service.create_job(
                video_id=video_id,
                triggered_by=user_id,
                config={
                    "target_language": target_lang,
                    "source_language": source_lang,
                    "celery_task_id": self.request.id,
                    "device": "GPU" if cuda_available else "CPU"
                }
            )
            print(f"✅ Job created: {job.id} for video {video_id}", flush=True)
        else:
            job_config = job.config_json or {}
            if isinstance(job_config, str):
                import json
                try:
                    job_config = json.loads(job_config)
                except Exception:
                    job_config = {}
            job_config["celery_task_id"] = self.request.id
            job_config["device"] = "GPU" if cuda_available else "CPU"
            job.config_json = job_config
            job.status = JobStatus.PROCESSING.value
            db.commit()
            print(f"✅ Reusing existing Job: {job.id} for video {video_id}", flush=True)
        
        self.update_state(
            state="PROCESSING",
            meta={
                "job_id": str(job.id),
                "video_id": video_id,
                "current_step": "starting",
                "progress": 0,
                "device": "GPU" if cuda_available else "CPU"
            }
        )
        
        result = run_full_pipeline(
            job.id, 
            video_id, 
            user_id, 
            db
        )
        
        print(f"✅ Pipeline completed for video {video_id}", flush=True)

        _send_task_notification(
            user_id=user_id,
            video_id=video_id,
            title=f"Xử lý video hoàn tất (Video #{video_id})",
            message=f"Toàn bộ quy trình xử lý tự động cho video #{video_id} đã hoàn tất thành công.",
            step="full_pipeline",
            status="completed",
            db=db,
        )

        return {
            "status": "completed",
            "job_id": str(job.id),
            "video_id": video_id,
            "message": "Video processing completed successfully",
            "device": "GPU" if cuda_available else "CPU",
            "result": result
        }
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Pipeline failed for video {video_id}: {error_msg}", flush=True)
        
        try:
            job_service = JobService(db)
            job = db.query(PipelineJob).filter(
                PipelineJob.video_id == video_id
            ).order_by(desc(PipelineJob.created_at)).first()
            if job:
                job_service.update_job_status(job.id, JobStatus.FAILED, error_message=error_msg)
                print(f"✅ Job {job.id} marked as failed", flush=True)
        except Exception as db_error:
            print(f"⚠️ Could not update job status: {db_error}", flush=True)

        _send_task_notification(
            user_id=user_id,
            video_id=video_id,
            title=f"Xử lý video thất bại (Video #{video_id})",
            message=f"Quy trình xử lý cho video #{video_id} gặp sự cố: {error_msg[:120]}",
            step="full_pipeline",
            status="failed",
            error=error_msg,
            db=db,
        )
        
        if self.request.retries < self.max_retries:
            print(f"🔄 Retrying task (attempt {self.request.retries + 1}/{self.max_retries})...", flush=True)
            raise self.retry(exc=e, countdown=60 * (self.request.retries + 1))
        
        raise
        
    finally:
        print(f"🏁 Pipeline task for video {video_id} finished", flush=True)


@celery_app.task(bind=True, base=PipelineTask, name="task_transcribe_step", 
                 max_retries=1, soft_time_limit=1800, time_limit=2400)
def task_transcribe_step(self, video_id: int, user_id: int, enable_diarization: bool = True, job_id: Optional[str] = None):
    """Execute Whisper STT and Pyannote diarization as a decoupled, asynchronous step."""
    db = self.db
    job_service = JobService(db)
    
    try:
        cuda_avail = torch.cuda.is_available()
        logger.info(f"🎙️ [task_transcribe_step] Starting STT for video {video_id} on {'GPU' if cuda_avail else 'CPU'}")
        
        self.update_state(
            state="PROCESSING",
            meta={
                "step": "transcript",
                "progress": 10,
                "message": "Initializing audio and speech models...",
                "device": "GPU" if cuda_avail else "CPU"
            }
        )

        job = None
        if job_id:
            try:
                job_uuid = uuid.UUID(job_id) if isinstance(job_id, str) else job_id
                job = job_service.get_job(job_uuid)
            except Exception as je:
                logger.warning(f"Could not load job {job_id}: {je}")

        if not job:
            job = job_service.create_job(
                video_id=video_id,
                triggered_by=user_id,
                config={
                    "celery_task_id": self.request.id,
                    "mode": "single_step",
                    "step": "transcript",
                    "device": "GPU" if cuda_avail else "CPU",
                    "enable_diarization": enable_diarization
                },
                step="transcript"
            )
        else:
            job_cfg = job.config_json or {}
            if isinstance(job_cfg, str):
                import json
                try:
                    job_cfg = json.loads(job_cfg)
                except Exception:
                    job_cfg = {}
            job_cfg["celery_task_id"] = self.request.id
            job_cfg["mode"] = "single_step"
            job_cfg["step"] = "transcript"
            job.config_json = job_cfg
            job.status = JobStatus.PROCESSING.value
            job.current_step = "transcript"
            db.commit()

        job_service.log_task(job.id, "whisper_stt", "running", "Transcribing vocal track with Whisper...")

        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            raise ValueError(f"Video #{video_id} not found")

        vocal_path = video.extracted_vocal_path
        if not vocal_path or not os.path.exists(vocal_path):
            raise ValueError(f"Vocal track not ready for video #{video_id}. Audio extraction needed first.")

        # --- Milestone 1: Whisper STT ---
        from app.services.stt_service import STTService
        from app.core.config import OUTPUT_DIR
        import json
        from datetime import datetime
        from app.models import TranscriptSegment, SpeakerProfile

        stt_service = STTService()
        self.update_state(
            state="PROCESSING",
            meta={"step": "transcript", "progress": 35, "message": "Transcribing speech into text (Whisper)..."}
        )

        segments, detected_lang = stt_service.transcribe_audio(vocal_path)
        for seg in segments:
            if not seg.get("speaker"):
                seg["speaker"] = "SPEAKER_01"

        transcript_dir = OUTPUT_DIR / f"transcript_{video_id}"
        transcript_dir.mkdir(parents=True, exist_ok=True)
        transcript_path = transcript_dir / "transcript.json"

        with open(transcript_path, 'w', encoding='utf-8') as f:
            json.dump({"language": detected_lang, "segments": segments}, f, indent=2, ensure_ascii=False)

        # Populate DB Milestone 1
        db.query(TranscriptSegment).filter(TranscriptSegment.video_id == video_id).delete()
        db.query(SpeakerProfile).filter(SpeakerProfile.video_id == video_id).delete()
        db.flush()

        default_speaker = SpeakerProfile(
            video_id=video_id,
            speaker_label="SPEAKER_01",
            language=detected_lang,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(default_speaker)
        db.flush()

        for idx, seg in enumerate(segments):
            db.add(TranscriptSegment(
                video_id=video_id,
                speaker_id=default_speaker.id,
                sequence=idx + 1,
                start_time=float(seg.get("start", 0.0)),
                end_time=float(seg.get("end", 0.0)),
                original_text=str(seg.get("text", "")).strip(),
                language=detected_lang,
                confidence=float(seg.get("confidence", 1.0)) if seg.get("confidence") is not None else 1.0,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            ))

        video.transcript_path = str(transcript_path)
        video.current_step = "transcript"
        video.progress = max(int(video.progress or 0), 40)
        db.commit()

        job_service.log_task(job.id, "whisper_stt", "success", f"Transcribed {len(segments)} segments in {detected_lang}")

        # --- Milestone 2: Diarization Enrichment ---
        if enable_diarization:
            self.update_state(
                state="PROCESSING",
                meta={"step": "transcript", "progress": 70, "message": "Analyzing speakers (Pyannote Diarization)..."}
            )
            from app.services.diarization_service import DiarizationService
            diar_service = DiarizationService()
            if diar_service.is_available():
                try:
                    job_service.log_task(job.id, "diarization", "running", "Running speaker diarization...")
                    diar_segments = diar_service.diarize(vocal_path)
                    segments = diar_service.assign_speakers_to_transcript(
                        str(transcript_path), diar_segments, output_path=str(transcript_path)
                    )

                    unique_speakers = sorted(list(set(seg.get("speaker") or "SPEAKER_01" for seg in segments)))
                    if len(unique_speakers) > 1 or unique_speakers != ["SPEAKER_01"]:
                        db.query(TranscriptSegment).filter(TranscriptSegment.video_id == video_id).delete()
                        db.query(SpeakerProfile).filter(SpeakerProfile.video_id == video_id).delete()
                        db.flush()

                        speaker_id_map = {}
                        for spk_label in unique_speakers:
                            spk_prof = SpeakerProfile(
                                video_id=video_id,
                                speaker_label=spk_label,
                                language=detected_lang,
                                created_at=datetime.utcnow(),
                                updated_at=datetime.utcnow()
                            )
                            db.add(spk_prof)
                            db.flush()
                            speaker_id_map[spk_label] = spk_prof.id

                        for idx, seg in enumerate(segments):
                            spk_label = seg.get("speaker") or "SPEAKER_01"
                            db.add(TranscriptSegment(
                                video_id=video_id,
                                speaker_id=speaker_id_map.get(spk_label),
                                sequence=idx + 1,
                                start_time=float(seg.get("start", 0.0)),
                                end_time=float(seg.get("end", 0.0)),
                                original_text=str(seg.get("text", "")).strip(),
                                language=detected_lang,
                                confidence=float(seg.get("confidence", 1.0)) if seg.get("confidence") is not None else 1.0,
                                created_at=datetime.utcnow(),
                                updated_at=datetime.utcnow()
                            ))
                        db.commit()
                        job_service.log_task(job.id, "diarization", "success", f"Diarized {len(unique_speakers)} speakers")
                except Exception as de:
                    logger.warning(f"Diarization in task encountered error: {de}. Falling back to single speaker.")
                    job_service.log_task(job.id, "diarization", "failed", error_trace=str(de))

        # Finalize step job
        from app.models.enums import JobStep
        job_service.update_job_status(
            job.id, 
            JobStatus.COMPLETED, 
            progress=100, 
            current_step=JobStep.WHISPERX, 
            is_full_pipeline=False
        )

        # Release Redis lock
        try:
            from app.core.config import REDIS_URL
            import redis
            r = redis.Redis.from_url(REDIS_URL)
            r.delete(f"lock:video:{video_id}:step:transcript")
        except Exception:
            pass

        # VRAM Cleanup for 8GB GPU architecture
        try:
            from app.services.stt_service import unload_whisper_models
            unload_whisper_models()
        except Exception as cl_err:
            logger.warning(f"Could not unload whisper models: {cl_err}")

        _send_task_notification(
            user_id=user_id,
            video_id=video_id,
            title=f"Bóc băng hoàn tất (Video #{video_id})",
            message=f"Đã trích xuất {len(segments)} phân đoạn phụ đề (ngôn ngữ: {detected_lang}).",
            step="transcript",
            status="completed",
            language=detected_lang,
            db=db,
        )

        return {
            "status": "completed",
            "video_id": video_id,
            "job_id": str(job.id),
            "step": "transcript",
            "total_segments": len(segments),
            "language": detected_lang,
            "message": "Transcription step completed successfully"
        }
    except Exception as e:
        error_msg = str(e)
        logger.exception(f"task_transcribe_step failed for video {video_id}: {error_msg}")
        try:
            job_service.update_job_status(job.id, JobStatus.FAILED, error_message=error_msg, is_full_pipeline=False)
        except Exception:
            pass
        # Release Redis lock on error
        try:
            from app.core.config import REDIS_URL
            import redis
            r = redis.Redis.from_url(REDIS_URL)
            r.delete(f"lock:video:{video_id}:step:transcript")
        except Exception:
            pass

        _send_task_notification(
            user_id=user_id,
            video_id=video_id,
            title=f"Bóc băng thất bại (Video #{video_id})",
            message=f"Bóc băng cho video #{video_id} thất bại: {error_msg[:120]}",
            step="transcript",
            status="failed",
            error=error_msg,
            db=db,
        )

        raise


@celery_app.task(bind=True, base=PipelineTask, name="task_translate_step",
                 max_retries=2, soft_time_limit=1800, time_limit=2400)
def task_translate_step(
    self,
    video_id: int,
    user_id: int,
    target_language: str,
    model: Optional[str] = None,
    job_id: Optional[str] = None
):
    """Asynchronous Translation step in background worker."""
    db = self.db
    job = None
    target_lang_clean = target_language.lower().strip()
    try:
        job_service = JobService(db)
        if job_id:
            try:
                job_uuid = uuid.UUID(job_id) if isinstance(job_id, str) else job_id
                job = job_service.get_job(job_uuid)
            except Exception as e:
                logger.warning(f"Could not load job {job_id}: {e}")

        if not job:
            job = job_service.create_job(
                video_id=video_id,
                triggered_by=user_id,
                config={
                    "target_language": target_lang_clean,
                    "model": model,
                    "celery_task_id": self.request.id,
                    "mode": "single_step",
                    "step": "translation"
                },
                step="translation"
            )
        else:
            job_cfg = job.config_json or {}
            if isinstance(job_cfg, str):
                import json
                try:
                    job_cfg = json.loads(job_cfg)
                except Exception:
                    job_cfg = {}
            job_cfg["celery_task_id"] = self.request.id
            job_cfg["mode"] = "single_step"
            job_cfg["step"] = "translation"
            job.config_json = job_cfg
            job.status = JobStatus.PROCESSING.value
            job.current_step = "translation"
            db.commit()

        job_service.log_task(job.id, "translation", "running", f"Translating transcript into {target_lang_clean}...")
        self.update_state(
            state="PROCESSING",
            meta={"step": "translation", "progress": 15, "message": f"Loading transcript for translation into {target_lang_clean}..."}
        )

        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            raise ValueError(f"Video #{video_id} not found")

        from app.core.config import OUTPUT_DIR
        import json
        import shutil
        from datetime import datetime

        # Check transcript path or fallback canonical
        transcript_path = video.transcript_path
        canonical_dir = OUTPUT_DIR / f"transcript_{video_id}"
        canonical_transcript = canonical_dir / "transcript.json"
        if (not transcript_path or not os.path.exists(transcript_path)) and canonical_transcript.exists():
            transcript_path = str(canonical_transcript)
            video.transcript_path = transcript_path
            db.commit()

        if not transcript_path or not os.path.exists(transcript_path):
            raise ValueError(f"Transcript not available for video #{video_id}. Transcription step required first.")

        from app.core.languages import TARGET_LANGUAGE_MAP, SOURCE_LANGUAGE_MAP
        from app.services import TranslationService, SubtitleService
        from app.models import TranscriptSegment, TranslationSegment
        from app.models.enums import JobStep

        with open(transcript_path, 'r', encoding='utf-8') as f:
            transcript_data = json.load(f)

        segments = transcript_data.get("segments", [])
        detected_lang = transcript_data.get("language", "en")

        lang_config = TARGET_LANGUAGE_MAP.get(target_lang_clean)
        if not lang_config:
            raise ValueError(f"Unsupported target language: {target_language}")

        nllb_tgt = lang_config["nllb"]
        nllb_src = SOURCE_LANGUAGE_MAP.get(detected_lang, "eng_Latn")

        config = db.query(VideoPipelineConfig).filter(VideoPipelineConfig.video_id == video_id).first()
        trans_model = model or (config.translation_model if config and config.translation_model else "nllb_200_1.3b")

        self.update_state(
            state="PROCESSING",
            meta={"step": "translation", "progress": 30, "message": f"Translating {len(segments)} segments using {trans_model}..."}
        )

        translation_service = TranslationService()
        translated_segments = translation_service.translate_document(
            segments=segments,
            glossary={},
            src_lang=nllb_src,
            tgt_lang=nllb_tgt,
            model=trans_model,
        )
        try:
            translation_service.unload_model()
        except Exception as e:
            logger.warning(f"Could not unload translation model: {e}")

        self.update_state(
            state="PROCESSING",
            meta={"step": "translation", "progress": 70, "message": "Saving translated segments..."}
        )

        canonical_dir.mkdir(parents=True, exist_ok=True)
        translation_path = os.path.join(str(canonical_dir), f"translation_{target_lang_clean}.json")

        with open(translation_path, 'w', encoding='utf-8') as f:
            json.dump({
                "source_language": detected_lang,
                "target_language": target_lang_clean,
                "translation_model": trans_model,
                "segments": translated_segments
            }, f, indent=2, ensure_ascii=False)

        # Persist translated segments to DB
        try:
            t_segs = db.query(TranscriptSegment).filter(TranscriptSegment.video_id == video_id).order_by(TranscriptSegment.sequence).all()
            for idx, seg in enumerate(translated_segments):
                if idx < len(t_segs):
                    t_seg_id = t_segs[idx].id
                    existing_ts = db.query(TranslationSegment).filter(
                        TranslationSegment.transcript_segment_id == t_seg_id,
                        TranslationSegment.target_language == target_lang_clean
                    ).first()
                    if existing_ts:
                        existing_ts.translated_text = seg.get("translated_text", "")
                        existing_ts.translation_model = trans_model
                        existing_ts.updated_at = datetime.utcnow()
                    else:
                        db.add(TranslationSegment(
                            transcript_segment_id=t_seg_id,
                            target_language=target_lang_clean,
                            translated_text=seg.get("translated_text", ""),
                            translation_model=trans_model,
                            created_at=datetime.utcnow(),
                            updated_at=datetime.utcnow()
                        ))
            db.flush()
        except Exception as dbe:
            logger.warning(f"Could not persist translation_segments to DB: {dbe}")

        # Pre-generate subtitles
        self.update_state(
            state="PROCESSING",
            meta={"step": "translation", "progress": 85, "message": "Generating subtitle files (ASS/SRT)..."}
        )
        try:
            subtitle_service = SubtitleService()
            sub_paths = subtitle_service.save_all_subtitles(
                segments=translated_segments,
                base_dir=str(canonical_dir),
                language=target_lang_clean,
                text_key="translated_text",
                font_size=22,
                position="bottom",
                font_name="Montserrat",
                primary_color="#FFFFFF",
                outline_color="#000000",
                max_lines=2,
                effect="pop",
                auto_split=True,
            )
            if sub_paths.get("ass"):
                video.subtitle_path = sub_paths["ass"]
            elif sub_paths.get("srt"):
                video.subtitle_path = sub_paths["srt"]
        except Exception as sub_err:
            logger.warning(f"Could not pre-generate subtitles on translation: {sub_err}")

        video.target_language = target_lang_clean
        if config:
            config.target_language = target_lang_clean
        video.current_step = "translation"
        video.progress = max(int(video.progress or 0), 60)
        db.commit()

        job_service.log_task(job.id, "translation", "success", f"Translated {len(translated_segments)} segments into {target_lang_clean}")

        # Finalize step job
        job_service.update_job_status(
            job.id,
            JobStatus.COMPLETED,
            progress=100,
            current_step=JobStep.TRANSLATION,
            is_full_pipeline=False
        )

        # Release Redis lock
        try:
            from app.core.config import REDIS_URL
            import redis
            r = redis.Redis.from_url(REDIS_URL)
            r.delete(f"lock:video:{video_id}:step:translate")
        except Exception:
            pass

        _send_task_notification(
            user_id=user_id,
            video_id=video_id,
            title=f"Dịch thuật hoàn tất ({target_lang_clean.upper()}) (Video #{video_id})",
            message=f"Đã dịch thành công {len(translated_segments)} câu sang tiếng {target_lang_clean.upper()}.",
            step="translation",
            status="completed",
            language=target_lang_clean,
            db=db,
        )

        return {
            "status": "completed",
            "video_id": video_id,
            "job_id": str(job.id),
            "step": "translation",
            "target_language": target_lang_clean,
            "total_segments": len(translated_segments),
            "message": "Translation step completed successfully"
        }
    except Exception as e:
        error_msg = str(e)
        logger.exception(f"task_translate_step failed for video {video_id}: {error_msg}")
        try:
            if job:
                job_service.update_job_status(job.id, JobStatus.FAILED, error_message=error_msg, is_full_pipeline=False)
        except Exception:
            pass
        try:
            from app.core.config import REDIS_URL
            import redis
            r = redis.Redis.from_url(REDIS_URL)
            r.delete(f"lock:video:{video_id}:step:translate")
        except Exception:
            pass

        _send_task_notification(
            user_id=user_id,
            video_id=video_id,
            title=f"Dịch thuật thất bại ({target_lang.upper()}) (Video #{video_id})",
            message=f"Dịch video #{video_id} sang {target_lang.upper()} thất bại: {error_msg[:120]}",
            step="translation",
            status="failed",
            error=error_msg,
            language=target_lang,
            db=db,
        )

        raise


@celery_app.task(bind=True, base=PipelineTask, name="task_generate_tts_step",
                 max_retries=2, soft_time_limit=3600, time_limit=4200)
def task_generate_tts_step(
    self,
    video_id: int,
    user_id: int,
    language: str,
    speaker_id: Optional[int] = None,
    style: str = "neutral",
    speed: float = 1.0,
    job_id: Optional[str] = None
):
    """Asynchronous Voice Synthesis (TTS) step in background worker."""
    db = self.db
    job = None
    lang_clean = language.lower().strip()
    try:
        job_service = JobService(db)
        if job_id:
            try:
                job_uuid = uuid.UUID(job_id) if isinstance(job_id, str) else job_id
                job = job_service.get_job(job_uuid)
            except Exception as e:
                logger.warning(f"Could not load job {job_id}: {e}")

        if not job:
            job = job_service.create_job(
                video_id=video_id,
                triggered_by=user_id,
                config={
                    "language": lang_clean,
                    "speaker_id": speaker_id,
                    "style": style,
                    "speed": speed,
                    "celery_task_id": self.request.id,
                    "mode": "single_step",
                    "step": "tts"
                },
                step="tts"
            )
        else:
            job_cfg = job.config_json or {}
            if isinstance(job_cfg, str):
                import json
                try:
                    job_cfg = json.loads(job_cfg)
                except Exception:
                    job_cfg = {}
            job_cfg["celery_task_id"] = self.request.id
            job_cfg["mode"] = "single_step"
            job_cfg["step"] = "tts"
            job.config_json = job_cfg
            job.status = JobStatus.PROCESSING.value
            job.current_step = "tts"
            db.commit()

        job_service.log_task(job.id, "tts", "running", f"Generating TTS speech for {lang_clean}...")
        self.update_state(
            state="PROCESSING",
            meta={"step": "tts", "progress": 10, "message": f"Locating translation files for {lang_clean}..."}
        )

        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            raise ValueError(f"Video #{video_id} not found")

        from app.core.config import OUTPUT_DIR
        import json
        import subprocess
        import shutil
        from pathlib import Path
        from app.models.enums import JobStep

        # Find translation data
        canonical_dir = OUTPUT_DIR / f"transcript_{video_id}"
        translation_path = canonical_dir / f"translation_{lang_clean}.json"
        if not translation_path.exists() and video.transcript_path:
            alt_path = Path(os.path.dirname(video.transcript_path)) / f"translation_{lang_clean}.json"
            if alt_path.exists():
                translation_path = alt_path

        if not translation_path.exists():
            raise ValueError(f"Translation for language '{lang_clean}' not found. Run translation step first.")

        with open(translation_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            segments = data.get("segments", [])

        if not segments:
            raise ValueError("No segments found in translation.")

        # Vocal path for voice cloning
        vocal_path = video.extracted_vocal_path
        if not vocal_path or not os.path.exists(vocal_path):
            vocal_path = None

        from app.core.languages import TARGET_LANGUAGE_MAP
        from app.services import TTSAlignerService

        lang_config = TARGET_LANGUAGE_MAP.get(lang_clean)
        xtts_lang = lang_config["xtts"] if lang_config else "en"

        tts_service = TTSAlignerService()
        tts_dir = OUTPUT_DIR / f"tts_{video_id}"
        tts_dir.mkdir(parents=True, exist_ok=True)
        tts_path = tts_dir / f"tts_{lang_clean}.wav"

        self.update_state(
            state="PROCESSING",
            meta={"step": "tts", "progress": 25, "message": f"Synthesizing voice audio for {len(segments)} segments..."}
        )

        tts_service.generate_tts_with_alignment(
            segments=segments,
            output_path=str(tts_path),
            temp_dir=str(tts_dir),
            vocal_path=vocal_path,
            tgt_lang=xtts_lang
        )

        if not os.path.exists(tts_path):
            raise ValueError("TTS audio output file was not created.")

        file_size = os.path.getsize(tts_path)
        if file_size < 1024:
            raise ValueError(f"TTS audio file is corrupted or empty ({file_size} bytes).")

        if speed != 1.0:
            self.update_state(
                state="PROCESSING",
                meta={"step": "tts", "progress": 85, "message": f"Adjusting audio playback speed ({speed}x)..."}
            )
            temp_path = tts_dir / f"tts_{lang_clean}_temp.wav"
            try:
                subprocess.run([
                    "ffmpeg", "-y", "-i", str(tts_path),
                    "-filter:a", f"atempo={speed}",
                    str(temp_path)
                ], check=True, capture_output=True)
                shutil.move(str(temp_path), str(tts_path))
            except subprocess.CalledProcessError as e:
                logger.warning(f"Speed adjustment failed: {e.stderr}")

        video.dubbed_audio_path = str(tts_path)
        video.current_step = "dubbing"
        video.progress = max(int(video.progress or 0), 85)
        db.commit()

        job_service.log_task(job.id, "tts", "success", f"Generated TTS audio ({os.path.getsize(tts_path)} bytes)")

        # Finalize step job
        job_service.update_job_status(
            job.id,
            JobStatus.COMPLETED,
            progress=100,
            current_step=JobStep.TTS_GENERATE,
            is_full_pipeline=False
        )

        # Release Redis lock
        try:
            from app.core.config import REDIS_URL
            import redis
            r = redis.Redis.from_url(REDIS_URL)
            r.delete(f"lock:video:{video_id}:step:tts")
        except Exception:
            pass

        _send_task_notification(
            user_id=user_id,
            video_id=video_id,
            title=f"Tổng hợp giọng nói hoàn tất ({lang_clean.upper()}) (Video #{video_id})",
            message=f"Đã tạo file âm thanh lồng tiếng chất lượng cao cho ngôn ngữ {lang_clean.upper()}.",
            step="tts",
            status="completed",
            language=lang_clean,
            db=db,
        )

        return {
            "status": "completed",
            "video_id": video_id,
            "job_id": str(job.id),
            "step": "tts",
            "language": lang_clean,
            "tts_path": str(tts_path),
            "file_size": os.path.getsize(tts_path),
            "message": "TTS step completed successfully"
        }
    except Exception as e:
        error_msg = str(e)
        logger.exception(f"task_generate_tts_step failed for video {video_id}: {error_msg}")
        try:
            if job:
                job_service.update_job_status(job.id, JobStatus.FAILED, error_message=error_msg, is_full_pipeline=False)
        except Exception:
            pass
        try:
            from app.core.config import REDIS_URL
            import redis
            r = redis.Redis.from_url(REDIS_URL)
            r.delete(f"lock:video:{video_id}:step:tts")
        except Exception:
            pass

        _send_task_notification(
            user_id=user_id,
            video_id=video_id,
            title=f"Tổng hợp giọng nói thất bại ({language.upper()}) (Video #{video_id})",
            message=f"Tạo âm thanh TTS cho video #{video_id} thất bại: {error_msg[:120]}",
            step="tts",
            status="failed",
            error=error_msg,
            language=language,
            db=db,
        )

        raise


@celery_app.task(bind=True, base=PipelineTask, name="task_dub_mux_step",
                 max_retries=2, soft_time_limit=3600, time_limit=4200)
def task_dub_mux_step(
    self,
    video_id: int,
    user_id: int,
    language: str,
    video_format: str = "mp4",
    quality: str = "1080p",
    burn_subtitles: bool = True,
    aspect_ratio: Optional[str] = None,
    job_id: Optional[str] = None
):
    """Asynchronous Dubbing & Muxing step in background worker."""
    db = self.db
    job = None
    lang_clean = language.lower().strip()
    try:
        job_service = JobService(db)
        if job_id:
            try:
                job_uuid = uuid.UUID(job_id) if isinstance(job_id, str) else job_id
                job = job_service.get_job(job_uuid)
            except Exception as e:
                logger.warning(f"Could not load job {job_id}: {e}")

        if not job:
            job = job_service.create_job(
                video_id=video_id,
                triggered_by=user_id,
                config={
                    "language": lang_clean,
                    "video_format": video_format,
                    "quality": quality,
                    "burn_subtitles": burn_subtitles,
                    "aspect_ratio": aspect_ratio,
                    "celery_task_id": self.request.id,
                    "mode": "single_step",
                    "step": "dub"
                },
                step="dub"
            )
        else:
            job_cfg = job.config_json or {}
            if isinstance(job_cfg, str):
                import json
                try:
                    job_cfg = json.loads(job_cfg)
                except Exception:
                    job_cfg = {}
            job_cfg["celery_task_id"] = self.request.id
            job_cfg["mode"] = "single_step"
            job_cfg["step"] = "dub"
            job.config_json = job_cfg
            job.status = JobStatus.PROCESSING.value
            job.current_step = "dub"
            db.commit()

        job_service.log_task(job.id, "dub_mux", "running", f"Muxing video with dubbed audio ({quality}, {video_format})...")
        self.update_state(
            state="PROCESSING",
            meta={"step": "dub", "progress": 15, "message": "Locating video, audio, and subtitle assets..."}
        )

        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            raise ValueError(f"Video #{video_id} not found")

        from app.core.config import OUTPUT_DIR, UPLOAD_DIR
        from app.models.enums import JobStep, VideoStatus
        import json
        import tempfile
        from datetime import datetime
        from app.services import AudioService

        # Find original video file
        video_path = None
        for file in UPLOAD_DIR.glob(f"{video_id}_*"):
            video_path = str(file)
            break
        if not video_path:
            raise ValueError(f"Original video file not found for video #{video_id}")

        # Check TTS audio
        tts_path = video.dubbed_audio_path
        if not tts_path or not os.path.exists(tts_path):
            raise ValueError("TTS audio not found. Run TTS synthesis step first.")

        # Handle BGM
        bgm_path = None
        if video.background_music_path and os.path.exists(video.background_music_path):
            bgm_path = video.background_music_path
        else:
            bgm_dir = OUTPUT_DIR / f"audio_{video_id}"
            if bgm_dir.exists():
                possible_patterns = ["*bgm*.wav", "*no_vocals*.wav", "*background*.wav", "*instrumental*.wav", "*.wav"]
                bgm_files = []
                for pattern in possible_patterns:
                    bgm_files = list(bgm_dir.glob(pattern))
                    if bgm_files:
                        break
                if not bgm_files:
                    htdemucs_dir = bgm_dir / "htdemucs"
                    if htdemucs_dir.exists():
                        for subdir in htdemucs_dir.iterdir():
                            if subdir.is_dir():
                                for pattern in possible_patterns:
                                    bgm_files = list(subdir.glob(pattern))
                                    if bgm_files:
                                        break
                                if bgm_files:
                                    break
                if bgm_files:
                    bgm_files_filtered = [f for f in bgm_files if ("no_vocals" in f.name.lower() or "bgm" in f.name.lower() or "background" in f.name.lower())]
                    if bgm_files_filtered:
                        bgm_files = bgm_files_filtered
                    bgm_path = str(bgm_files[0])

        # Resolve subtitle
        resolved_sub_path = None
        if burn_subtitles:
            cand_dir = OUTPUT_DIR / f"transcript_{video_id}"
            ass_file = cand_dir / f"subtitles_{lang_clean}.ass" if cand_dir.exists() else None
            if ass_file and ass_file.exists():
                resolved_sub_path = str(ass_file)
            elif video.subtitle_path and os.path.exists(video.subtitle_path):
                resolved_sub_path = video.subtitle_path
            elif cand_dir.exists():
                for ext in [".ass", ".srt", ".vtt"]:
                    sub_candidate = cand_dir / f"subtitles_{lang_clean}{ext}"
                    if sub_candidate.exists():
                        resolved_sub_path = str(sub_candidate)
                        break

        final_aspect_ratio = aspect_ratio
        if not final_aspect_ratio:
            snap = getattr(video, "snapshot_data", None) or {}
            sub_cfg = snap.get("subtitle_config", {})
            final_aspect_ratio = sub_cfg.get("aspect_ratio")

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_filename = f"dubbed_{lang_clean}_{quality}_{timestamp}_{uuid.uuid4().hex[:8]}.{video_format}"
        output_path = str(OUTPUT_DIR / output_filename)

        audio_service = AudioService()

        self.update_state(
            state="PROCESSING",
            meta={"step": "dub", "progress": 35, "message": "Rendering video with audio blending (FFmpeg)..."}
        )

        with tempfile.TemporaryDirectory() as temp_dir:
            result = audio_service.mix_and_mux(
                video_path=video_path,
                tts_audio_path=tts_path,
                bgm_audio_path=bgm_path,
                final_output_path=output_path,
                temp_dir=temp_dir,
                video_id=video_id,
                language=lang_clean,
                quality=quality,
                generate_hls=True,
                subtitle_path=resolved_sub_path,
                burn_subtitles=burn_subtitles,
                aspect_ratio=final_aspect_ratio,
            )

        video.output_path = output_path
        video.status = VideoStatus.COMPLETED.value
        video.current_step = "export"
        video.progress = 100

        # Also register VideoRenderOutput for caching and download lookups (Upsert)
        try:
            from app.models import VideoRenderOutput
            file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0
            existing_vro = db.query(VideoRenderOutput).filter(
                VideoRenderOutput.video_id == video_id,
                VideoRenderOutput.target_language == lang_clean,
                VideoRenderOutput.resolution == quality.lower().strip(),
            ).first()
            if existing_vro:
                existing_vro.output_video_path = output_path
                existing_vro.format = video_format.lower().strip()
                existing_vro.dubbed_audio_path = video.dubbed_audio_path
                existing_vro.subtitle_path = video.subtitle_path
                existing_vro.file_size_bytes = file_size
                existing_vro.status = "completed"
            else:
                vro = VideoRenderOutput(
                    video_id=video_id,
                    target_language=lang_clean,
                    resolution=quality.lower().strip(),
                    format=video_format.lower().strip(),
                    dubbed_audio_path=video.dubbed_audio_path,
                    subtitle_path=video.subtitle_path,
                    output_video_path=output_path,
                    file_size_bytes=file_size,
                    status="completed",
                )
                db.add(vro)
        except Exception as vro_err:
            logger.warning(f"Could not record VideoRenderOutput: {vro_err}")

        db.commit()

        job_service.log_task(job.id, "dub_mux", "success", f"Dubbed video rendered successfully: {output_filename}")

        # Finalize step job
        job_service.update_job_status(
            job.id,
            JobStatus.COMPLETED,
            progress=100,
            current_step=JobStep.RENDER_VIDEO,
            is_full_pipeline=False
        )

        # Release Redis lock
        try:
            from app.core.config import REDIS_URL
            import redis
            r = redis.Redis.from_url(REDIS_URL)
            r.delete(f"lock:video:{video_id}:step:dub")
        except Exception:
            pass

        _send_task_notification(
            user_id=user_id,
            video_id=video_id,
            title=f"Render video hoàn tất ({lang_clean.upper()}) (Video #{video_id})",
            message=f"Video lồng tiếng ({quality}, {video_format}) đã sẵn sàng để xem lại và tải về.",
            step="dub",
            status="completed",
            language=lang_clean,
            db=db,
        )

        return {
            "status": "completed",
            "video_id": video_id,
            "job_id": str(job.id),
            "step": "dub",
            "language": lang_clean,
            "output_path": output_path,
            "result": result,
            "message": "Dubbed video rendered successfully"
        }
    except Exception as e:
        error_msg = str(e)
        logger.exception(f"task_dub_mux_step failed for video {video_id}: {error_msg}")
        try:
            if job:
                job_service.update_job_status(job.id, JobStatus.FAILED, error_message=error_msg, is_full_pipeline=False)
        except Exception:
            pass
        try:
            from app.core.config import REDIS_URL
            import redis
            r = redis.Redis.from_url(REDIS_URL)
            r.delete(f"lock:video:{video_id}:step:dub")
        except Exception:
            pass

        _send_task_notification(
            user_id=user_id,
            video_id=video_id,
            title=f"Render video thất bại ({language.upper()}) (Video #{video_id})",
            message=f"Render video lồng tiếng cho video #{video_id} thất bại: {error_msg[:120]}",
            step="dub",
            status="failed",
            error=error_msg,
            language=language,
            db=db,
        )

        raise


@celery_app.task(name="check_task_status")
def check_task_status(task_id: str):
    """Check the status of a Celery task"""
    from celery.result import AsyncResult
    from app.tasks.celery_app import celery_app
    
    try:
        task = AsyncResult(task_id, app=celery_app)
        info = task.info if task.ready() else None
        device_info = info.get("device", "Unknown") if info and isinstance(info, dict) else "Unknown"
        
        return {
            "task_id": task_id,
            "state": task.state,
            "info": info,
            "ready": task.ready(),
            "successful": task.successful() if task.ready() else None,
            "failed": task.failed() if task.ready() else None,
            "device": device_info,
            "traceback": task.traceback if task.failed() and task.ready() else None
        }
    except Exception as e:
        return {
            "task_id": task_id,
            "state": "ERROR",
            "error": str(e)
        }


@celery_app.task(name="get_celery_worker_info")
def get_celery_worker_info():
    """Get information about the celery worker environment"""
    import platform
    import sys
    import torch
    
    cuda_available = torch.cuda.is_available()
    
    info = {
        "python_version": sys.version,
        "platform": platform.platform(),
        "cuda_available": cuda_available,
        "device": "GPU" if cuda_available else "CPU",
        "torch_version": torch.__version__,
    }
    
    if cuda_available:
        info.update({
            "gpu_count": torch.cuda.device_count(),
            "gpu_name": torch.cuda.get_device_name(0),
            "gpu_memory": f"{torch.cuda.get_device_properties(0).total_memory / 1e9:.1f}GB",
            "cuda_version": torch.version.cuda,
        })
    else:
        info.update({
            "cpu_count": os.cpu_count(),
            "cpu_cores": os.cpu_count(),
        })
    
    return info


@celery_app.task(name="clear_task_queue")
def clear_task_queue():
    """Clear all pending Celery tasks (for maintenance)"""
    from celery.result import AsyncResult
    from app.tasks.celery_app import celery_app
    
    i = celery_app.control.inspect()
    active = i.active() if i else None
    scheduled = i.scheduled() if i else None
    reserved = i.reserved() if i else None
    
    result = {
        "active": active,
        "scheduled": scheduled,
        "reserved": reserved,
        "cleared": []
    }
    
    if active:
        for worker, tasks in active.items():
            for task in tasks:
                task_id = task.get("id")
                if task_id:
                    AsyncResult(task_id, app=celery_app).revoke(terminate=True)
                    result["cleared"].append({
                        "task_id": task_id,
                        "worker": worker,
                        "name": task.get("name")
                    })
    
    return result


@celery_app.task(
    bind=True,
    base=PipelineTask,
    name="task_process_batch_job",
    soft_time_limit=14400,
    time_limit=18000
)
def task_process_batch_job(self, batch_id: str, user_id: int):
    """
    Sequential execution engine for batch video processing.
    Executes one video at a time to strictly prevent VRAM contention on RTX 4060.
    Sends an Omni-Channel Batch Digest Notification upon completion.
    """
    db = self.db
    logger.info(f"🚀 [BatchEngine] Starting batch processing job {batch_id} for user {user_id}")
    
    from app.services.batch_service import BatchService
    from app.core.database import get_connection
    import psycopg2.extras
    
    batch = BatchService.get_batch_job(batch_id)
    if not batch:
        logger.error(f"[BatchEngine] Batch {batch_id} not found.")
        return {"status": "failed", "error": "Batch not found"}
        
    project_id = batch.get("project_id")
    batch_name = batch.get("name") or f"Batch {batch_id[:8]}"
    items = batch.get("items", [])
    total_videos = len(items)
    snapshot = batch.get("config_snapshot") or {}
    
    # Update batch status to processing
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE batch_jobs
                SET status = 'processing', started_at = NOW(), updated_at = NOW()
                WHERE id = %s;
                """,
                (batch_id,),
            )
            conn.commit()
    finally:
        conn.close()
        
    self.update_state(
        state="PROCESSING",
        meta={
            "batch_id": batch_id,
            "status": "processing",
            "completed": 0,
            "failed": 0,
            "total": total_videos,
            "progress": 0
        }
    )
    
    completed_count = 0
    failed_count = 0
    is_cancelled = False
    
    for idx, item in enumerate(items):
        item_id = item["id"]
        video_id = item["video_id"]
        
        # Check cancellation before starting each video
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT status FROM batch_jobs WHERE id = %s;", (batch_id,))
                current_batch_status = cur.fetchone()
                if current_batch_status and current_batch_status[0] == 'cancelled':
                    is_cancelled = True
                    break
        finally:
            conn.close()
            
        logger.info(f"▶️ [BatchEngine] Processing item {idx+1}/{total_videos}: video {video_id} (batch {batch_id})")
        
        # Mark item as processing
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE batch_job_items
                    SET status = 'processing', started_at = NOW(), updated_at = NOW()
                    WHERE id = %s;
                    """,
                    (item_id,),
                )
                conn.commit()
        finally:
            conn.close()
            
        try:
            # 1. Update or create VideoPipelineConfig for this video using config_snapshot & 6-layer config_data
            cfg_data = snapshot.get("config_data") or {}
            if isinstance(cfg_data, str):
                try:
                    cfg_data = json.loads(cfg_data)
                except Exception:
                    cfg_data = {}

            audio_sep = cfg_data.get("audio_separation", {})
            transcription = cfg_data.get("transcription", {})
            translation = cfg_data.get("translation", {})
            tts = cfg_data.get("tts_dubbing", {})
            subtitles = cfg_data.get("subtitles", {})
            export_mux = cfg_data.get("export_muxing", {})

            target_lang = translation.get("target_language") or snapshot.get("target_language", "vi")
            source_lang = snapshot.get("source_language", "auto")
            stt_model = transcription.get("model_size") or snapshot.get("stt_model", "whisper_medium")
            enable_diarization = transcription.get("diarization", snapshot.get("enable_diarization", True))
            translation_model = translation.get("model_name") or snapshot.get("translation_model", "nllb_200_1.3b")
            tts_model = tts.get("engine") or snapshot.get("tts_model", "coqui_xtts_v2")
            voice_speed = float(tts.get("speed_rate", snapshot.get("voice_speed", 1.0)))

            v_cfg = db.query(VideoPipelineConfig).filter(VideoPipelineConfig.video_id == video_id).first()
            if not v_cfg:
                v_cfg = VideoPipelineConfig(
                    video_id=video_id,
                    target_language=target_lang,
                    source_language=source_lang,
                    stt_model=stt_model,
                    diarization_model="pyannote_3.1" if enable_diarization else None,
                    translation_model=translation_model,
                    tts_model=tts_model,
                    voice_speed=voice_speed,
                    auto_generate_subtitles=bool(subtitles.get("burn_mode") != "none") if "burn_mode" in subtitles else True,
                    auto_generate_dubbing=(tts_model != "none"),
                    enable_noise_reduction=bool(snapshot.get("enable_noise_reduction", False)),
                    enable_audio_normalization=bool(snapshot.get("enable_audio_normalization", True)),
                    enable_vocal_isolation=bool(snapshot.get("enable_vocal_isolation", False)),
                    enable_filler_word_removal=bool(transcription.get("filter_fillers", snapshot.get("enable_filler_word_removal", False))),
                )
                db.add(v_cfg)
                db.commit()
            else:
                v_cfg.target_language = target_lang
                v_cfg.source_language = source_lang
                v_cfg.stt_model = stt_model
                v_cfg.diarization_model = "pyannote_3.1" if enable_diarization else None
                v_cfg.translation_model = translation_model
                v_cfg.tts_model = tts_model
                v_cfg.auto_generate_dubbing = (tts_model != "none")
                v_cfg.voice_speed = voice_speed
                if "burn_mode" in subtitles:
                    v_cfg.auto_generate_subtitles = (subtitles.get("burn_mode") != "none")
                if "filter_fillers" in transcription:
                    v_cfg.enable_filler_word_removal = bool(transcription["filter_fillers"])
                db.commit()

            # 2. Create pipeline job for tracking
            job_service = JobService(db)
            job = job_service.create_job(
                video_id=video_id,
                triggered_by=user_id,
                config={
                    "target_language": v_cfg.target_language,
                    "source_language": v_cfg.source_language,
                    "batch_id": batch_id,
                    "batch_item_id": item_id,
                    "celery_task_id": self.request.id,
                    "config_data": cfg_data,
                    "subtitle_style": subtitles.get("style", {}),
                    "export_muxing": export_mux,
                    "audio_separation": audio_sep,
                    "tts_dubbing": tts,
                }
            )

            # Link job_id to batch_job_items
            conn = get_connection()
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE batch_job_items SET job_id = %s WHERE id = %s;",
                        (str(job.id), item_id),
                    )
                    conn.commit()
            finally:
                conn.close()

            # 3. Run full pipeline
            run_full_pipeline(
                job.id,
                video_id,
                user_id,
                db
            )

            # 4. Success for this item
            completed_count += 1
            conn = get_connection()
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE batch_job_items
                        SET status = 'completed', progress = 100, finished_at = NOW(), updated_at = NOW()
                        WHERE id = %s;
                        """,
                        (item_id,),
                    )
                    cur.execute(
                        """
                        UPDATE batch_jobs
                        SET completed_videos = %s, updated_at = NOW()
                        WHERE id = %s;
                        """,
                        (completed_count, batch_id),
                    )
                    conn.commit()
            finally:
                conn.close()

            logger.info(f"✅ [BatchEngine] Item {idx+1}/{total_videos} (video {video_id}) completed successfully.")

        except Exception as item_err:
            failed_count += 1
            err_msg = str(item_err)
            logger.error(f"❌ [BatchEngine] Item {idx+1}/{total_videos} (video {video_id}) failed: {err_msg}", exc_info=True)
            conn = get_connection()
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE batch_job_items
                        SET status = 'failed', error_message = %s, finished_at = NOW(), updated_at = NOW()
                        WHERE id = %s;
                        """,
                        (err_msg[:500], item_id),
                    )
                    cur.execute(
                        """
                        UPDATE batch_jobs
                        SET failed_videos = %s, updated_at = NOW()
                        WHERE id = %s;
                        """,
                        (failed_count, batch_id),
                    )
                    conn.commit()
            finally:
                conn.close()

        # Update batch progress in Celery state
        curr_progress = round(((completed_count + failed_count) / total_videos) * 100) if total_videos > 0 else 0
        self.update_state(
            state="PROCESSING",
            meta={
                "batch_id": batch_id,
                "completed": completed_count,
                "failed": failed_count,
                "total": total_videos,
                "progress": curr_progress
            }
        )

    # Finalize batch status
    if is_cancelled:
        final_status = "cancelled"
    elif failed_count == total_videos and total_videos > 0:
        final_status = "failed"
    else:
        final_status = "completed"

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE batch_jobs
                SET status = %s, finished_at = NOW(), updated_at = NOW(),
                    completed_videos = %s, failed_videos = %s
                WHERE id = %s;
                """,
                (final_status, completed_count, failed_count, batch_id),
            )
            conn.commit()
    finally:
        conn.close()

    logger.info(f"🏁 [BatchEngine] Batch {batch_id} finished with status '{final_status}' ({completed_count} success, {failed_count} failed)")

    # Dispatch Batch Digest Omni-Channel Notification
    try:
        from app.services.notification_service import create_notification
        digest_title = f"Xử lý hàng loạt hoàn tất ({batch_name})"
        digest_msg = (
            f"Đã xử lý xong {total_videos} video trong dự án: "
            f"{completed_count} video thành công, {failed_count} video thất bại."
        )
        create_notification(
            user_id=user_id,
            type="pipeline",
            title=digest_title,
            message=digest_msg,
            action_url=f"/workspace/project/{project_id}" if project_id else "/workspace",
            target_type="project",
            target_id=str(project_id) if project_id else "0",
            metadata={
                "batch_id": batch_id,
                "total_videos": total_videos,
                "completed_videos": completed_count,
                "failed_videos": failed_count,
                "status": final_status,
                "event": "batch_completed",
            },
            background_tasks=None,
        )
        logger.info(f"📬 [BatchEngine] Dispatched batch digest notification for user {user_id}, batch {batch_id}")
    except Exception as notif_err:
        logger.warning(f"⚠️ [BatchEngine] Could not dispatch digest notification: {notif_err}")

    return {
        "status": final_status,
        "batch_id": batch_id,
        "total": total_videos,
        "completed": completed_count,
        "failed": failed_count,
    }