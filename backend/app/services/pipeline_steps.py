# app/services/pipeline_steps.py
import os
import json
import uuid
import shutil
import tempfile
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.services.audio_service import AudioService
from app.services.stt_service import STTService
from app.services.translation_service import TranslationService
from app.services.tts_aligner_service import TTSAlignerService
from app.services.hls_service import convert_to_hls_adaptive
from app.services.s3_service import upload_file, upload_hls_directory  # ✅ FIXED: Changed to upload_hls_directory
from app.core.config import SEGMENT_SECONDS, OUTPUT_DIR, UPLOAD_DIR
from app.core.languages import TARGET_LANGUAGE_MAP, SOURCE_LANGUAGE_MAP
from app.models import Video, VideoPipelineConfig, ProjectGlossary
from app.models.enums import JobStatus, JobStep


class PipelineSteps:
    def __init__(self, db: Session, job_service):
        self.db = db
        self.job_service = job_service
        self.audio_service = AudioService()
        self.stt_service = STTService()
        self.translation_service = TranslationService()
        self.tts_aligner = TTSAlignerService()

    def _get_glossary(self, project_id: Optional[int]) -> Dict[str, str]:
        if not project_id:
            return {}
        glossaries = (self.db.query(ProjectGlossary)
                     .filter(ProjectGlossary.project_id == project_id)
                     .all())
        return {g.source_term: g.target_term for g in glossaries}

    def step_extract_audio(self, job_id: uuid.UUID, video_id: int, video_path: str, temp_dir: str) -> Dict[str, Any]:
        self.job_service.update_job_status(job_id, JobStatus.PROCESSING, progress=10, current_step=JobStep.AUDIO_EXTRACT)
        self.job_service.log_task(job_id, "audio_extract", "running", "Extracting audio from video...")
        try:
            audio_path = os.path.join(temp_dir, "raw_audio.wav")
            self.audio_service.extract_audio(video_path, audio_path)
            self.job_service.log_task(job_id, "audio_extract", "success", "Audio extracted")
            return {"audio_path": audio_path, "success": True}
        except Exception as e:
            self.job_service.log_task(job_id, "audio_extract", "failed", error_trace=str(e))
            raise

    def step_separate_vocal_bgm(self, job_id: uuid.UUID, video_id: int, audio_path: str, temp_dir: str) -> Dict[str, Any]:
        self.job_service.update_job_status(job_id, JobStatus.PROCESSING, progress=20, current_step=JobStep.AUDIO_SEPARATE)
        self.job_service.log_task(job_id, "demucs_separate", "running", "Separating vocal and BGM...")
        try:
            vocal_path, bgm_path = self.audio_service.separate_vocal_bgm(audio_path, temp_dir)
            self.job_service.log_task(job_id, "demucs_separate", "success", "Vocal and BGM separated")
            return {"vocal_path": vocal_path, "bgm_path": bgm_path, "success": True}
        except Exception as e:
            self.job_service.log_task(job_id, "demucs_separate", "failed", error_trace=str(e))
            raise

    def step_transcribe(self, job_id: uuid.UUID, video_id: int, vocal_path: str, temp_dir: str) -> Dict[str, Any]:
        self.job_service.update_job_status(job_id, JobStatus.PROCESSING, progress=35, current_step=JobStep.WHISPERX)
        self.job_service.log_task(job_id, "whisperx", "running", "Transcribing with Whisper...")
        try:
            segments, detected_lang = self.stt_service.transcribe_audio(vocal_path)
            transcript_path = os.path.join(temp_dir, "transcript.json")
            with open(transcript_path, "w") as f:
                json.dump({"language": detected_lang, "segments": segments}, f, indent=2)
            self.job_service.log_task(job_id, "whisperx", "success", f"Detected language: {detected_lang}, Segments: {len(segments)}")
            return {"segments": segments, "detected_language": detected_lang, "transcript_path": transcript_path, "success": True}
        except Exception as e:
            self.job_service.log_task(job_id, "whisperx", "failed", error_trace=str(e))
            raise

    def step_translate(self, job_id: uuid.UUID, video_id: int, segments: list, source_lang: str, target_lang: str, temp_dir: str) -> Dict[str, Any]:
        self.job_service.update_job_status(job_id, JobStatus.PROCESSING, progress=50, current_step=JobStep.TRANSLATION)
        self.job_service.log_task(job_id, "translation", "running", f"Translating {source_lang} -> {target_lang}...")
        try:
            lang_config = TARGET_LANGUAGE_MAP.get(target_lang)
            if not lang_config:
                raise ValueError(f"Unsupported target language: {target_lang}")
            nllb_tgt = lang_config["nllb"]
            nllb_src = SOURCE_LANGUAGE_MAP.get(source_lang, "eng_Latn")
            
            video = self.db.query(Video).filter(Video.id == video_id).first()
            config = (self.db.query(VideoPipelineConfig)
                     .filter(VideoPipelineConfig.video_id == video_id)
                     .first())
            
            glossary = {}
            if config and config.project_id:
                glossary = self._get_glossary(config.project_id)
            
            translated_segments = self.translation_service.translate_document(
                segments=segments, glossary=glossary, src_lang=nllb_src, tgt_lang=nllb_tgt
            )
            
            translation_path = os.path.join(temp_dir, f"translation_{target_lang}.json")
            with open(translation_path, "w") as f:
                json.dump({"source_language": source_lang, "target_language": target_lang, "segments": translated_segments}, f, indent=2)
            
            self.job_service.log_task(job_id, "translation", "success", f"Translated {len(translated_segments)} segments")
            return {"translated_segments": translated_segments, "translation_path": translation_path, "success": True}
        except Exception as e:
            self.job_service.log_task(job_id, "translation", "failed", error_trace=str(e))
            raise

    def step_generate_tts(self, job_id: uuid.UUID, video_id: int, translated_segments: list, vocal_path: str, target_lang: str, temp_dir: str) -> Dict[str, Any]:
        self.job_service.update_job_status(job_id, JobStatus.PROCESSING, progress=65, current_step=JobStep.TTS_GENERATE)
        self.job_service.log_task(job_id, "tts_generate", "running", "Generating TTS with voice cloning...")
        try:
            lang_config = TARGET_LANGUAGE_MAP.get(target_lang)
            xtts_lang = lang_config["xtts"]
            tts_path = os.path.join(temp_dir, "tts_track.wav")
            self.tts_aligner.generate_tts_with_alignment(
                segments=translated_segments, output_path=tts_path, temp_dir=temp_dir,
                vocal_path=vocal_path, tgt_lang=xtts_lang
            )
            self.job_service.log_task(job_id, "tts_generate", "success", "TTS generated")
            return {"tts_path": tts_path, "success": True}
        except Exception as e:
            self.job_service.log_task(job_id, "tts_generate", "failed", error_trace=str(e))
            raise

    def step_mix_and_mux(self, job_id: uuid.UUID, video_id: int, video_path: str, tts_path: str, bgm_path: str, target_lang: str, temp_dir: str) -> Dict[str, Any]:
        self.job_service.update_job_status(job_id, JobStatus.PROCESSING, progress=75, current_step=JobStep.RENDER_VIDEO)
        self.job_service.log_task(job_id, "render_video", "running", "Mixing audio and rendering video...")
        try:
            video = self.db.query(Video).filter(Video.id == video_id).first()
            output_filename = f"dubbed_{target_lang}_{uuid.uuid4().hex[:8]}.mp4"
            if video and video.title:
                safe_title = "".join(c for c in video.title if c.isalnum() or c in " ._-")[:50]
                output_filename = f"dubbed_{safe_title}_{target_lang}_{uuid.uuid4().hex[:8]}.mp4"
            output_path = str(OUTPUT_DIR / output_filename)
            self.audio_service.mix_and_mux(video_path, tts_path, bgm_path, output_path, temp_dir)
            if video:
                video.output_path = output_path
                self.db.commit()
            self.job_service.log_task(job_id, "render_video", "success", "Video rendered")
            return {"output_path": output_path, "success": True}
        except Exception as e:
            self.job_service.log_task(job_id, "render_video", "failed", error_trace=str(e))
            raise

    def step_generate_subtitles(self, job_id: uuid.UUID, video_id: int, translated_segments: list, target_lang: str, temp_dir: str) -> Dict[str, Any]:
        self.job_service.update_job_status(job_id, JobStatus.PROCESSING, progress=80, current_step=JobStep.SUBTITLE_GENERATE)
        self.job_service.log_task(job_id, "subtitle_generate", "running", "Generating subtitles...")
        try:
            def format_time_srt(s): return f"{int(s//3600):02d}:{int((s%3600)//60):02d}:{int(s%60):02d},{int((s%1)*1000):03d}"
            def format_time_vtt(s): return f"{int(s//3600):02d}:{int((s%3600)//60):02d}:{int(s%60):02d}.{int((s%1)*1000):03d}"
            
            srt_path = os.path.join(temp_dir, f"subtitles_{target_lang}.srt")
            with open(srt_path, "w", encoding="utf-8") as f:
                for i, seg in enumerate(translated_segments, 1):
                    text = seg.get("translated_text", seg["text"])
                    f.write(f"{i}\n{format_time_srt(seg['start'])} --> {format_time_srt(seg['end'])}\n{text}\n\n")
            
            vtt_path = os.path.join(temp_dir, f"subtitles_{target_lang}.vtt")
            with open(vtt_path, "w", encoding="utf-8") as f:
                f.write("WEBVTT\n\n")
                for i, seg in enumerate(translated_segments, 1):
                    text = seg.get("translated_text", seg["text"])
                    f.write(f"{i}\n{format_time_vtt(seg['start'])} --> {format_time_vtt(seg['end'])}\n{text}\n\n")
            
            video = self.db.query(Video).filter(Video.id == video_id).first()
            if video:
                video.subtitle_path = srt_path
                self.db.commit()
            
            self.job_service.log_task(job_id, "subtitle_generate", "success", "Subtitles generated")
            return {"srt_path": srt_path, "vtt_path": vtt_path, "success": True}
        except Exception as e:
            self.job_service.log_task(job_id, "subtitle_generate", "failed", error_trace=str(e))
            raise

    def step_hls_convert(self, job_id: uuid.UUID, video_id: int, video_path: str, is_original: bool = False) -> Dict[str, Any]:
        self.job_service.update_job_status(job_id, JobStatus.PROCESSING, progress=85, current_step=JobStep.HLS_CONVERT)
        self.job_service.log_task(job_id, "hls_convert", "running", "Converting to HLS...")
        try:
            hls_dir = OUTPUT_DIR / f"hls_{video_id}_{uuid.uuid4().hex[:8]}"
            hls_result = convert_to_hls_adaptive(input_path=video_path, output_dir=str(hls_dir), segment_seconds=SEGMENT_SECONDS)
            self.job_service.log_task(job_id, "hls_convert", "success", "HLS generated")
            return {"hls_result": hls_result, "hls_dir": str(hls_dir), "success": True}
        except Exception as e:
            self.job_service.log_task(job_id, "hls_convert", "failed", error_trace=str(e))
            raise

    def step_upload_s3(self, job_id: uuid.UUID, video_id: int, video_path: str, hls_result: Dict, target_lang: str, is_original: bool = False) -> Dict[str, Any]:
        self.job_service.update_job_status(job_id, JobStatus.PROCESSING, progress=90, current_step=JobStep.S3_UPLOAD)
        self.job_service.log_task(job_id, "s3_upload", "running", "Uploading to S3...")
        try:
            video_type = "original" if is_original else f"translated/{target_lang}"
            s3_prefix = f"videos/{video_id}/{video_type}"
            ext = os.path.splitext(video_path)[1]
            full_s3_key = f"{s3_prefix}/full{ext}"
            upload_file(video_path, full_s3_key, "video/mp4")
            
            # ✅ FIXED: Use upload_hls_directory with the output_dir from hls_result
            hls_prefix = f"{s3_prefix}/hls"
            hls_uploaded = upload_hls_directory(hls_result["output_dir"], hls_prefix)
            
            result = {"full": full_s3_key, "hls": hls_uploaded}
            video = self.db.query(Video).filter(Video.id == video_id).first()
            if video:
                if is_original:
                    video.original_path = full_s3_key
                else:
                    video.output_path = full_s3_key
                self.db.commit()
            self.job_service.log_task(job_id, "s3_upload", "success", "Uploaded to S3")
            return {"s3_keys": result, "success": True}
        except Exception as e:
            self.job_service.log_task(job_id, "s3_upload", "failed", error_trace=str(e))
            raise