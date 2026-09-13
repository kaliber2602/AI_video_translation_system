# app/services/pipeline_steps.py - Standardized Pipeline Steps (No SQLAlchemy, Integrated Diarization)
import os
import json
import uuid
import shutil
import tempfile
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

from app.services.audio_service import AudioService
from app.services.stt_service import STTService
from app.services.translation_service import TranslationService
from app.services.tts_aligner_service import TTSAlignerService
from app.services.diarization_service import DiarizationService
from app.services.subtitle_service import SubtitleService
from app.services.hls_service import convert_to_hls_adaptive
from app.services.s3_service import upload_file, upload_hls_directory
from app.core.config import SEGMENT_SECONDS, OUTPUT_DIR, UPLOAD_DIR
from app.core.languages import TARGET_LANGUAGE_MAP, SOURCE_LANGUAGE_MAP
from app.core.database import DatabaseSession
from app.models import Video, VideoPipelineConfig, ProjectGlossary, TranscriptSegment, TranslationSegment, SpeakerProfile
from app.models.enums import JobStatus, JobStep


class PipelineSteps:
    def __init__(self, db: DatabaseSession, job_service):
        self.db = db
        self.job_service = job_service
        self.audio_service = AudioService()
        self.stt_service = STTService()
        self.translation_service = TranslationService()
        self.tts_aligner = TTSAlignerService()
        self.diarization_service = DiarizationService()

    def _get_glossary(self, project_id: Optional[int]) -> Dict[str, str]:
        if not project_id:
            return {}
        glossaries = (self.db.query(ProjectGlossary)
                     .filter(ProjectGlossary.project_id == project_id)
                     .all())
        return {g.source_term: g.target_term for g in glossaries if getattr(g, "source_term", None)}

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
            
            # Canonical persistent directory
            canonical_dir = OUTPUT_DIR / f"transcript_{video_id}"
            canonical_dir.mkdir(parents=True, exist_ok=True)
            transcript_path = str(canonical_dir / "transcript.json")
            
            with open(transcript_path, "w", encoding="utf-8") as f:
                json.dump({"language": detected_lang, "segments": segments}, f, indent=2, ensure_ascii=False)

            # Also mirror in temp_dir for local pipeline step chaining
            temp_transcript = os.path.join(temp_dir, "transcript.json")
            with open(temp_transcript, "w", encoding="utf-8") as f:
                json.dump({"language": detected_lang, "segments": segments}, f, indent=2, ensure_ascii=False)

            video = self.db.query(Video).filter(Video.id == video_id).first()
            if video:
                video.transcript_path = transcript_path
                self.db.commit()

            self.job_service.log_task(job_id, "whisperx", "success", f"Detected language: {detected_lang}, Segments: {len(segments)}")
            return {"segments": segments, "detected_language": detected_lang, "transcript_path": transcript_path, "success": True}
        except Exception as e:
            self.job_service.log_task(job_id, "whisperx", "failed", error_trace=str(e))
            raise

    def step_diarize(self, job_id: uuid.UUID, video_id: int, vocal_path: str, transcript_path: str, detected_lang: str) -> Dict[str, Any]:
        """Run speaker diarization and assign speaker tags to transcript segments."""
        self.job_service.log_task(job_id, "diarization", "running", "Analyzing multi-speaker characteristics...")
        try:
            diar_segments = self.diarization_service.diarize(vocal_path)
            updated_segments = self.diarization_service.assign_speakers_to_transcript(
                transcript_path, diar_segments, output_path=transcript_path
            )
            profiles = self.diarization_service.create_speaker_profiles(
                self.db, video_id, updated_segments, language=detected_lang
            )

            # Persist TranscriptSegments in PostgreSQL (BUG-12 fix)
            spk_map = {p.speaker_label: p.id for p in profiles}
            for idx, seg in enumerate(updated_segments):
                spk_label = seg.get("speaker")
                self.db.add(TranscriptSegment(
                    video_id=video_id,
                    speaker_id=spk_map.get(spk_label),
                    sequence=idx + 1,
                    start_time=float(seg.get("start", 0.0)),
                    end_time=float(seg.get("end", 0.0)),
                    original_text=str(seg.get("text", "")).strip(),
                    language=detected_lang,
                    confidence=float(seg.get("confidence", 1.0)) if seg.get("confidence") is not None else 1.0,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                ))
            self.db.commit()

            self.job_service.log_task(
                job_id, "diarization", "success",
                f"Diarization complete. Identified {len(profiles)} speaker profile(s)"
            )
            return {"segments": updated_segments, "profiles": [p.speaker_label for p in profiles], "success": True}
        except Exception as e:
            self.job_service.log_task(job_id, "diarization", "failed", error_trace=f"Diarization non-fatal error: {e}")
            return {"success": False, "error": str(e)}

    def step_translate(self, job_id: uuid.UUID, video_id: int, segments: list, source_lang: str, target_lang: str, temp_dir: str) -> Dict[str, Any]:
        self.job_service.update_job_status(job_id, JobStatus.PROCESSING, progress=50, current_step=JobStep.TRANSLATION)
        self.job_service.log_task(job_id, "translation", "running", f"Translating {source_lang} -> {target_lang}...")
        try:
            target_lang_clean = target_lang.lower().strip()
            lang_config = TARGET_LANGUAGE_MAP.get(target_lang) or TARGET_LANGUAGE_MAP.get(target_lang_clean)
            if not lang_config:
                raise ValueError(f"Unsupported target language: {target_lang}")
            nllb_tgt = lang_config["nllb"]
            nllb_src = SOURCE_LANGUAGE_MAP.get(source_lang, "eng_Latn")
            
            config = (self.db.query(VideoPipelineConfig)
                     .filter(VideoPipelineConfig.video_id == video_id)
                     .first())
            
            glossary = {}
            if config and getattr(config, "project_id", None):
                glossary = self._get_glossary(config.project_id)
            
            translated_segments = self.translation_service.translate_document(
                segments=segments, glossary=glossary, src_lang=nllb_src, tgt_lang=nllb_tgt
            )
            
            # 1. Save to temp_dir for downstream steps in this job
            translation_path = os.path.join(temp_dir, f"translation_{target_lang_clean}.json")
            with open(translation_path, "w", encoding="utf-8") as f:
                json.dump({"source_language": source_lang, "target_language": target_lang_clean, "segments": translated_segments}, f, indent=2)
            
            # 2. Save persistently to canonical directory
            canonical_dir = OUTPUT_DIR / f"transcript_{video_id}"
            canonical_dir.mkdir(parents=True, exist_ok=True)
            persistent_path = canonical_dir / f"translation_{target_lang_clean}.json"
            with open(persistent_path, "w", encoding="utf-8") as f:
                json.dump({"source_language": source_lang, "target_language": target_lang_clean, "segments": translated_segments}, f, indent=2)
                
            # 3. Update video target language
            video = self.db.query(Video).filter(Video.id == video_id).first()
            if video:
                video.target_language = target_lang_clean
                self.db.commit()

            # 4. Save to DB TranslationSegment
            try:
                t_segs = self.db.query(TranscriptSegment).filter(TranscriptSegment.video_id == video_id).order_by(TranscriptSegment.sequence).all()
                for idx, seg in enumerate(translated_segments):
                    if idx < len(t_segs):
                        t_seg_id = t_segs[idx].id
                        existing_ts = self.db.query(TranslationSegment).filter(
                            TranslationSegment.transcript_segment_id == t_seg_id,
                            TranslationSegment.target_language == target_lang_clean
                        ).first()
                        if existing_ts:
                            existing_ts.translated_text = seg.get("translated_text", "")
                            existing_ts.translation_model = "nllb_200_1.3b"
                            existing_ts.updated_at = datetime.utcnow()
                        else:
                            self.db.add(TranslationSegment(
                                transcript_segment_id=t_seg_id,
                                target_language=target_lang_clean,
                                translated_text=seg.get("translated_text", ""),
                                translation_model="nllb_200_1.3b",
                                created_at=datetime.utcnow(),
                                updated_at=datetime.utcnow()
                            ))
                self.db.commit()
            except Exception as e_db:
                self.db.rollback()
                print(f"[step_translate] Warning saving translation to DB: {e_db}")

            # 5. Pre-generate subtitles into canonical dir immediately
            try:
                SubtitleService.save_all_subtitles(
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
                    effect="none",
                )
            except Exception as e_sub:
                print(f"[step_translate] Warning pre-generating subtitles: {e_sub}")

            self.job_service.log_task(job_id, "translation", "success", f"Translated {len(translated_segments)} segments")
            return {"translated_segments": translated_segments, "translation_path": str(persistent_path), "success": True}
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

    def step_mix_and_mux(self, job_id: uuid.UUID, video_id: int, video_path: str, tts_path: str, bgm_path: str, target_lang: str, temp_dir: str, subtitle_path: Optional[str] = None) -> Dict[str, Any]:
        self.job_service.update_job_status(job_id, JobStatus.PROCESSING, progress=75, current_step=JobStep.RENDER_VIDEO)
        self.job_service.log_task(job_id, "render_video", "running", "Mixing audio and rendering video...")
        try:
            video = self.db.query(Video).filter(Video.id == video_id).first()
            output_filename = f"dubbed_{target_lang}_{uuid.uuid4().hex[:8]}.mp4"
            if video and getattr(video, "title", None):
                safe_title = "".join(c for c in video.title if c.isalnum() or c in " ._-")[:50]
                output_filename = f"dubbed_{safe_title}_{target_lang}_{uuid.uuid4().hex[:8]}.mp4"
            output_path = str(OUTPUT_DIR / output_filename)

            # Extract 6-layer options from job config
            quality = "1080p"
            aspect_ratio = None
            burn_subtitles = True
            try:
                job = self.db.query(PipelineJob).filter(PipelineJob.id == str(job_id)).first()
                if job and getattr(job, "config_json", None):
                    cj = job.config_json
                    if isinstance(cj, str):
                        cj = json.loads(cj)
                    cfg_data = cj.get("config_data") or {}
                    export_mux = cfg_data.get("export_muxing") or cj.get("export_muxing") or {}
                    subtitles_cfg = cfg_data.get("subtitles") or {}
                    quality = export_mux.get("resolution", "1080p")
                    aspect_ratio = export_mux.get("aspect_ratio")
                    if "burn_mode" in subtitles_cfg:
                        burn_subtitles = subtitles_cfg["burn_mode"] in ("hardcode", "hardsub")
            except Exception:
                pass

            # If subtitle_path wasn't passed directly, check temp_dir / canonical dir
            if not subtitle_path and burn_subtitles:
                for cand in [
                    os.path.join(temp_dir, f"subtitles_{target_lang}.ass"),
                    os.path.join(temp_dir, f"subtitles_{target_lang}.srt"),
                    str(OUTPUT_DIR / f"transcript_{video_id}" / f"subtitles_{target_lang}.ass"),
                    str(OUTPUT_DIR / f"transcript_{video_id}" / f"subtitles_{target_lang}.srt"),
                ]:
                    if os.path.exists(cand):
                        subtitle_path = cand
                        break

            self.audio_service.mix_and_mux(
                video_path=video_path,
                tts_audio_path=tts_path,
                bgm_audio_path=bgm_path,
                final_output_path=output_path,
                temp_dir=temp_dir,
                video_id=video_id,
                language=target_lang,
                quality=quality,
                subtitle_path=subtitle_path,
                burn_subtitles=burn_subtitles,
                aspect_ratio=aspect_ratio,
            )
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
            video = self.db.query(Video).filter(Video.id == video_id).first()
            source_file = video.original_path if video and video.original_path else None
            if not source_file or not os.path.exists(source_file):
                for f in UPLOAD_DIR.glob(f"{video_id}_*"):
                    if f.exists():
                        source_file = str(f)
                        break

            video_width = None
            video_height = None
            aspect_ratio = "16:9"
            if source_file and os.path.exists(source_file):
                try:
                    import subprocess
                    cmd = ['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', str(source_file)]
                    probe = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
                    if probe.returncode == 0 and probe.stdout.strip():
                        parts = probe.stdout.strip().split(',')
                        if len(parts) >= 2:
                            video_width = int(parts[0])
                            video_height = int(parts[1])
                            ratio = float(video_width) / float(video_height)
                            if 0.9 <= ratio <= 1.1:
                                aspect_ratio = "1:1"
                            elif ratio <= 0.65:
                                aspect_ratio = "9:16"
                            elif ratio <= 0.85:
                                aspect_ratio = "4:5"
                            elif 1.25 <= ratio <= 1.45:
                                aspect_ratio = "4:3"
                except Exception as probe_err:
                    pass

            # Check custom subtitle style from job config if available
            font_size = 22
            font_name = "Montserrat"
            primary_color = "#FFFFFF"
            outline_color = "#000000"
            try:
                job = self.db.query(PipelineJob).filter(PipelineJob.id == str(job_id)).first()
                if job and getattr(job, "config_json", None):
                    cj = job.config_json
                    if isinstance(cj, str):
                        cj = json.loads(cj)
                    style = (cj.get("config_data") or {}).get("subtitles", {}).get("style", {}) or cj.get("subtitle_style", {})
                    if style:
                        font_size = int(style.get("font_size", font_size))
                        font_name = str(style.get("font_name", font_name))
                        primary_color = str(style.get("primary_color", primary_color))
                        outline_color = str(style.get("outline_color", outline_color))
            except Exception:
                pass

            canonical_dir = OUTPUT_DIR / f"transcript_{video_id}"
            canonical_dir.mkdir(parents=True, exist_ok=True)
            paths = SubtitleService.save_all_subtitles(
                segments=translated_segments,
                base_dir=str(canonical_dir),
                language=target_lang,
                text_key="translated_text",
                font_size=font_size,
                position="bottom",
                font_name=font_name,
                primary_color=primary_color,
                outline_color=outline_color,
                max_lines=2,
                effect="pop",
                aspect_ratio=aspect_ratio,
                video_width=video_width,
                video_height=video_height,
                auto_split=True,
            )

            # Copy to temp_dir if needed for downstream muxing
            for ext, p in paths.items():
                dest = os.path.join(temp_dir, os.path.basename(p))
                if os.path.abspath(p) != os.path.abspath(dest):
                    try:
                        shutil.copy2(p, dest)
                    except Exception:
                        pass

            srt_path = paths.get("srt", str(canonical_dir / f"subtitles_{target_lang}.srt"))
            vtt_path = paths.get("vtt", str(canonical_dir / f"subtitles_{target_lang}.vtt"))
            ass_path = paths.get("ass", str(canonical_dir / f"subtitles_{target_lang}.ass"))

            if video:
                # Prefer .ass for rich styles if available, fallback to .srt
                video.subtitle_path = ass_path if os.path.exists(ass_path) else srt_path
                video.target_language = target_lang
                self.db.commit()

            self.job_service.log_task(job_id, "subtitle_generate", "success", "Subtitles generated")
            return {"srt_path": srt_path, "vtt_path": vtt_path, "ass_path": ass_path, "success": True}
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
        self.job_service.log_task(job_id, "s3_upload", "running", "Uploading to S3 / MinIO...")
        try:
            video_type = "original" if is_original else f"translated/{target_lang}"
            s3_prefix = f"videos/{video_id}/{video_type}"
            ext = os.path.splitext(video_path)[1]
            full_s3_key = f"{s3_prefix}/full{ext}"
            upload_file(video_path, full_s3_key, "video/mp4")
            
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
            self.job_service.log_task(job_id, "s3_upload", "success", "Uploaded to S3 / MinIO")
            return {"s3_keys": result, "success": True}
        except Exception as e:
            self.job_service.log_task(job_id, "s3_upload", "failed", error_trace=str(e))
            raise