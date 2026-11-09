import re
from pathlib import Path

p = Path("/workspace/AI_video_translation_system/backend/app/tasks/video_tasks.py")
if not p.exists():
    p = Path("backend/app/tasks/video_tasks.py")

text = p.read_text(encoding="utf-8")

# 1. Top-level imports
if "from pathlib import Path" not in text:
    text = text.replace("import uuid\n", "import uuid\nfrom pathlib import Path\n")
if "from app.core.config import OUTPUT_DIR, UPLOAD_DIR" not in text:
    text = text.replace("import torch\n", "import torch\nfrom app.core.config import OUTPUT_DIR, UPLOAD_DIR\n")

# 2. Ensure resolve_video_input_path is defined
helper = '''
def resolve_video_input_path(video, upload_dir) -> Optional[str]:
    """Resolve video path on local disk, or auto-download from Object Storage (MinIO/S3)."""
    if video.original_path and os.path.exists(video.original_path):
        return video.original_path
    for file in sorted(upload_dir.glob(f"{video.id}_*"), key=lambda f: f.stat().st_size, reverse=True):
        if file.suffix.lower() in [".mp4", ".mov", ".avi", ".mkv", ".webm"] and file.stat().st_size > 1024:
            return str(file)
    try:
        from app.services.s3_service import storage_manager
        ext = Path(video.original_filename or "video.mp4").suffix or ".mp4"
        candidates = [
            f"videos/{video.id}/original{ext}",
            f"videos/{video.id}/original.mp4",
            f"uploads/{video.id}_{video.original_filename or 'video.mp4'}",
            f"{video.id}_{video.original_filename or 'video.mp4'}",
        ]
        target_path = upload_dir / f"{video.id}_{video.original_filename or 'video.mp4'}"
        upload_dir.mkdir(parents=True, exist_ok=True)
        for s3_key in candidates:
            if storage_manager.download_file(s3_key, str(target_path)):
                logger.info(f"Successfully downloaded video #{video.id} from Object Storage ({s3_key}) -> {target_path}")
                return str(target_path)
    except Exception as e:
        logger.warning(f"Could not download video #{video.id} from storage: {e}")
    return None
'''

if "def resolve_video_input_path" not in text:
    target = 'logger.info("Celery Worker: CUDA not detected - using CPU")\n'
    if target in text:
        text = text.replace(target, target + helper + "\n")
    else:
        text = text.replace("class PipelineTask(Task):", helper + "\nclass PipelineTask(Task):")

# 3. Use resolve_video_input_path in task_extract_audio_step and task_dub_mux_step
old_find = '''        video_path = None
        if video.original_path and os.path.exists(video.original_path):
            video_path = video.original_path
        else:
            for file in sorted(UPLOAD_DIR.glob(f"{video_id}_*"), key=lambda f: f.stat().st_size, reverse=True):
                if file.suffix.lower() in [".mp4", ".mov", ".avi", ".mkv", ".webm"] and file.stat().st_size > 1024:
                    video_path = str(file)
                    break
        if not video_path:
            raise ValueError(f"Original video file not found for video #{video_id}")'''

new_find = '''        video_path = resolve_video_input_path(video, UPLOAD_DIR)
        if not video_path:
            raise ValueError(f"Original video file not found for video #{video_id}")'''

text = text.replace(old_find, new_find)

p.write_text(text, encoding="utf-8")
print("SUCCESS: video_tasks.py fixed with top-level Path and OUTPUT_DIR/UPLOAD_DIR!")
