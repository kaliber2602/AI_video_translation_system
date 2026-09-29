# app/tasks/translation_tasks.py
from typing import Optional
from app.tasks.celery_app import celery_app
from app.services.stt_service import STTService
from app.services.translation_service import TranslationService
from app.services.tts_aligner_service import TTSAlignerService


@celery_app.task(name="transcribe_audio")
def transcribe_audio(audio_path: str, model: Optional[str] = None):
    """Transcribe audio using Whisper"""
    stt_svc = STTService(model_size=model) if model else STTService()
    segments, detected_lang = stt_svc.transcribe_audio(audio_path)
    return {
        "segments": segments,
        "detected_language": detected_lang
    }


@celery_app.task(name="translate_segments")
def translate_segments(segments: list, source_lang: str, target_lang: str, glossary: dict = None, model: Optional[str] = None):
    """Translate transcript segments"""
    trans_svc = TranslationService(model_name=model) if model else TranslationService()
    translated_segments = trans_svc.translate_document(
        segments=segments,
        glossary=glossary or {},
        src_lang=source_lang,
        tgt_lang=target_lang,
        model=model or "nllb_200_1.3b"
    )
    return {"translated_segments": translated_segments}


@celery_app.task(name="generate_tts")
def generate_tts(segments: list, vocal_path: str, target_lang: str, output_path: str, temp_dir: str, voice_id: Optional[str] = None, model: Optional[str] = None):
    """Generate TTS with voice cloning"""
    tts_aligner = TTSAlignerService()
    tts_aligner.generate_tts_with_alignment(
        segments=segments,
        output_path=output_path,
        temp_dir=temp_dir,
        vocal_path=vocal_path,
        tgt_lang=target_lang,
        voice_id=voice_id,
        model=model
    )
    return {"tts_path": output_path}