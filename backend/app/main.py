import logging
import sys
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.pipeline import (
    assign_speakers,
    create_chapters,
    diarize,
    extract_audio,
    transcribe_segments,
)
from app.schemas import ProcessingStatusResponse, UploadResponse
from app.services import (
    UPLOAD_DIR,
    build_faq_content,
    build_json_content,
    build_markdown,
    build_mindmap_content,
    build_quiz_content,
    build_srt_content,
    build_subtitle_file,
    build_txt_content,
    build_vtt_content,
    create_burned_subtitle_video,
    create_docx_document,
    create_html_document,
    detect_language,
    save_upload,
    translate_segments,
)

# Explicit, force-configured logging so tracebacks always reach `docker
# compose logs` regardless of how uvicorn --reload buffers its own logger.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
    force=True,
)
logger = logging.getLogger("app.main")

app = FastAPI(title="AI Video Translation Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    status: str
    message: str


@app.get("/api/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    # return HealthResponse(status="ok", message="API is running")
    return {"status": "ok", "message": "API is running"}
    

@app.post("/api/uploads", response_model=UploadResponse)
def upload_video(
    file: UploadFile = File(...),
    target_language: str = "en",
    enable_diarization: bool = False,
) -> UploadResponse:
    try:
        saved = save_upload(file)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    stem = Path(saved["stored_name"]).stem
    video_path = str(UPLOAD_DIR / saved["stored_name"])
    warnings: list[str] = []
    logger.info("Upload received: %s -> %s", saved["original_name"], saved["stored_name"])

    try:
        # --- Core stages: must succeed for a meaningful result -----------
        logger.info("Extracting audio...")
        audio_path = extract_audio(video_path)

        logger.info("Transcribing (faster-whisper, first run downloads the model)...")
        segments = transcribe_segments(audio_path)
        logger.info("Transcription done: %d segments", len(segments))

        diarization_available = False
        if enable_diarization:
            try:
                logger.info("Running diarization...")
                turns = diarize(audio_path)
                if turns:
                    segments = assign_speakers(segments, turns)
                    diarization_available = True
                else:
                    warnings.append(
                        "Diarization requested but unavailable (pyannote.audio not "
                        "installed or HF_TOKEN not set/authorized)."
                    )
            except Exception as exc:  # noqa: BLE001 - diarization is best-effort
                logger.exception("Diarization failed")
                warnings.append(f"Diarization failed: {exc}")

        transcript = "\n".join(f"[{s['start']:.1f}s] {s['text']}" for s in segments)
        detected_language = detect_language(transcript)
        chapters = create_chapters(segments)
        markdown = build_markdown(transcript, chapters)

        subtitle_path = build_subtitle_file(saved["stored_name"], segments)
        txt_path = UPLOAD_DIR / f"{stem}.txt"
        vtt_path = UPLOAD_DIR / f"{stem}.vtt"
        json_path = UPLOAD_DIR / f"{stem}.json"
        faq_path = UPLOAD_DIR / f"{stem}.faq.md"
        quiz_path = UPLOAD_DIR / f"{stem}.quiz.md"
        mindmap_path = UPLOAD_DIR / f"{stem}.mindmap"
        docx_path = UPLOAD_DIR / f"{stem}.docx"
        html_path = UPLOAD_DIR / f"{stem}.html"
        translated_subtitle_path = UPLOAD_DIR / f"{stem}.translated.srt"

        txt_path.write_text(build_txt_content(transcript), encoding="utf-8")
        vtt_path.write_text(build_vtt_content(segments), encoding="utf-8")
        json_path.write_text(build_json_content(transcript, chapters, segments), encoding="utf-8")

        try:
            faq_path.write_text(build_faq_content(transcript), encoding="utf-8")
            quiz_path.write_text(build_quiz_content(transcript), encoding="utf-8")
            mindmap_path.write_text(build_mindmap_content(transcript, chapters), encoding="utf-8")
        except RuntimeError as exc:
            logger.warning("FAQ/quiz/mindmap generation skipped: %s", exc)
            warnings.append(str(exc))

        logger.info("Translating to %s (first run downloads NLLB-200, ~2.4GB)...", target_language)
        try:
            translated_segments = translate_segments(
                segments, target_language=target_language, source_language=detected_language
            )
            # 1. CẬP NHẬT BIẾN TRANSCRIPT MỚI
            transcript = "\n".join(f"[{s['start']:.1f}s] {s['text']}" for s in translated_segments)
            
            translated_subtitle_path.write_text(build_srt_content(translated_segments), encoding="utf-8")
            
            # 2. CẬP NHẬT LẠI CÁC TÀI LIỆU VỚI TRANSCRIPT ĐÃ DỊCH
            logger.info("Regenerating docx/html/markdown with translated content...")
            chapters = create_chapters(translated_segments) # Re-create chapters for translated text
            markdown = build_markdown(transcript, chapters)
            txt_path.write_text(build_txt_content(transcript), encoding="utf-8")
            create_docx_document(transcript, chapters, docx_path)
            create_html_document(transcript, chapters, html_path)
            
        except RuntimeError as exc:
            logger.exception("Translation failed")
            warnings.append(f"Translation unavailable: {exc}")
            translated_subtitle_path = None
        create_html_document(transcript, chapters, html_path)

        logger.info("Burning subtitles into video...")
        try:
            final_subtitle_path = translated_subtitle_path if (translated_subtitle_path and translated_subtitle_path.exists()) else subtitle_path
            
            output_video_path = create_burned_subtitle_video(video_path, str(final_subtitle_path))

        except RuntimeError as exc:
            logger.warning("Subtitle burn-in skipped: %s", exc)
            warnings.append(str(exc))
            output_video_path = None

    except Exception as exc:  # noqa: BLE001 - guarantee a logged traceback + useful 500
        logger.exception("Upload processing failed for %s", saved["stored_name"])
        raise HTTPException(
            status_code=500, detail=f"{type(exc).__name__}: {exc}"
        ) from exc

    logger.info("Upload processed successfully: %s", saved["stored_name"])
    return UploadResponse(
        filename=saved["original_name"],
        content_type=file.content_type,
        message="Upload processed successfully." if not warnings else "Upload processed with warnings.",
        stored_name=saved["stored_name"],
        transcript=transcript,
        segments=segments,
        markdown=markdown,
        subtitle_path=subtitle_path,
        translated_subtitle_path=str(translated_subtitle_path) if translated_subtitle_path else None,
        detected_language=detected_language,
        target_language=target_language,
        docx_path=str(docx_path) if docx_path else None,
        html_path=str(html_path),
        txt_path=str(txt_path),
        vtt_path=str(vtt_path),
        json_path=str(json_path),
        faq_path=str(faq_path) if faq_path.exists() else None,
        quiz_path=str(quiz_path) if quiz_path.exists() else None,
        mindmap_path=str(mindmap_path) if mindmap_path.exists() else None,
        audio_path=audio_path,
        output_video_path=output_video_path,
        diarization_available=diarization_available,
        chapters=chapters,
        status="completed",
        warnings=warnings,
    )


@app.get("/api/status", response_model=ProcessingStatusResponse)
def processing_status() -> ProcessingStatusResponse:
    return ProcessingStatusResponse(
        status="ready",
        message="Processing pipeline is available for uploads.",
    )


@app.get("/api/files/{filename}")
def download_file(filename: str) -> FileResponse:
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)


@app.get("/{filename}")
def download_file_root(filename: str) -> FileResponse:
    if filename.startswith("api") or "/" in filename:
        raise HTTPException(status_code=404, detail="File not found")
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)