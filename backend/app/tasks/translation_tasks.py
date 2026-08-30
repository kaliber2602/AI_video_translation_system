# app/tasks/translation_tasks.py
from app.tasks.celery_app import celery_app
from app.services.stt_service import STTService
from app.services.translation_service import TranslationService
from app.services.tts_aligner_service import TTSAlignerService

stt_service = STTService()
translation_service = TranslationService()
tts_aligner = TTSAlignerService()


@celery_app.task(name="transcribe_audio")
def transcribe_audio(audio_path: str):
    """Transcribe audio using Whisper"""
    segments, detected_lang = stt_service.transcribe_audio(audio_path)
    return {
        "segments": segments,
        "detected_language": detected_lang
    }


@celery_app.task(name="translate_segments")
def translate_segments(segments: list, source_lang: str, target_lang: str, glossary: dict = None):
    """Translate transcript segments"""
    translated_segments = translation_service.translate_document(
        segments=segments,
        glossary=glossary or {},
        src_lang=source_lang,
        tgt_lang=target_lang
    )
    return {"translated_segments": translated_segments}


@celery_app.task(name="generate_tts")
def generate_tts(segments: list, vocal_path: str, target_lang: str, output_path: str, temp_dir: str):
    """Generate TTS with voice cloning"""
    tts_aligner.generate_tts_with_alignment(
        segments=segments,
        output_path=output_path,
        temp_dir=temp_dir,
        vocal_path=vocal_path,
        tgt_lang=target_lang
    )
    return {"tts_path": output_path}