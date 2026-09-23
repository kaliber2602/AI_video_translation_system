# app/tasks/celery_app.py
import os

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

try:
    from celery import Celery

    celery_app = Celery(
        "video_translation",
        broker=REDIS_URL,
        backend=REDIS_URL,
        include=["app.tasks.video_tasks"],
    )

    celery_app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
        task_track_started=True,
        task_time_limit=30 * 60,
        task_soft_time_limit=25 * 60,
        worker_prefetch_multiplier=1,
        task_acks_late=True,
        task_reject_on_worker_lost=True,
        result_expires=3600,
        task_default_queue="queue_pipeline",
        task_routes={
            "task_transcribe_step": {"queue": "queue_stt"},
            "task_translate_step": {"queue": "queue_translate"},
            "task_generate_tts_step": {"queue": "queue_tts"},
            "task_extract_audio_step": {"queue": "queue_media"},
            "task_dub_mux_step": {"queue": "queue_media"},
            "process_video_pipeline": {"queue": "queue_pipeline"},
            "task_process_batch_job": {"queue": "queue_pipeline"},
            "check_task_status": {"queue": "queue_pipeline"},
            "get_celery_worker_info": {"queue": "queue_pipeline"},
            "clear_task_queue": {"queue": "queue_pipeline"},
            "periodic_clean_temp_files": {"queue": "queue_pipeline"},
            "periodic_cleanup_stale_jobs": {"queue": "queue_pipeline"},
        },
        beat_schedule={
            "clean-temp-files-every-4-hours": {
                "task": "periodic_clean_temp_files",
                "schedule": 4 * 3600.0,  # Run every 4 hours
                "args": (12,),  # files older than 12 hours
            },
            "cleanup-stale-jobs-every-30-minutes": {
                "task": "periodic_cleanup_stale_jobs",
                "schedule": 30 * 60.0,  # Run every 30 minutes
                "args": (60,),  # jobs stuck > 60 minutes
            },
        },
    )
except ImportError:
    class DummyTask:
        def delay(self, *args, **kwargs):
            class AsyncResult:
                id = "dummy-task-id"
                status = "PENDING"
            return AsyncResult()

    class DummyCelery:
        conf = {}

        def task(self, *args, **kwargs):
            def decorator(f):
                f.delay = DummyTask().delay
                return f
            return decorator

    celery_app = DummyCelery()