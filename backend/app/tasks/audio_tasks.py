# app/tasks/audio_tasks.py
from app.tasks.celery_app import celery_app
from app.services.audio_service import AudioService

audio_service = AudioService()


@celery_app.task(name="extract_audio")
def extract_audio(video_path: str, output_path: str):
    """Extract audio from video"""
    audio_service.extract_audio(video_path, output_path)
    return {"audio_path": output_path}


@celery_app.task(name="separate_vocal_bgm")
def separate_vocal_bgm(audio_path: str, output_dir: str):
    """Separate vocal and BGM using Demucs"""
    vocal_path, bgm_path = audio_service.separate_vocal_bgm(audio_path, output_dir)
    return {
        "vocal_path": vocal_path,
        "bgm_path": bgm_path
    }


@celery_app.task(name="mix_and_mux")
def mix_and_mux(video_path: str, tts_path: str, bgm_path: str, output_path: str, temp_dir: str):
    """Mix TTS + BGM and mux with video"""
    audio_service.mix_and_mux(video_path, tts_path, bgm_path, output_path, temp_dir)
    return {"output_path": output_path}