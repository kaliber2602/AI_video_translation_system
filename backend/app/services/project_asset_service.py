import os
import io
import zipfile
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.core.config import UPLOAD_DIR, OUTPUT_DIR
from app.core.database import DatabaseSession
from app.models import Video, ProjectFolder, VideoDocument, SpeakerProfile
from app.schemas.asset import ProjectAssetItem, ProjectAssetsResponse

logger = logging.getLogger(__name__)


def _get_file_size(path_str: Optional[str]) -> int:
    if not path_str:
        return 0
    try:
        p = Path(path_str)
        if p.exists() and p.is_file():
            return p.stat().st_size
    except Exception:
        pass
    return 0


def _is_s3_key(path_str: Optional[str]) -> bool:
    if not path_str:
        return False
    return path_str.startswith("videos/") or path_str.startswith("s3://")


def _format_size_display(bytes_val: int) -> str:
    if not bytes_val or bytes_val <= 0:
        return "0 B"
    if bytes_val < 1024:
        return f"{bytes_val} B"
    if bytes_val < 1024 * 1024:
        return f"{bytes_val / 1024:.1f} KB"
    if bytes_val < 1024 * 1024 * 1024:
        return f"{bytes_val / (1024 * 1024):.1f} MB"
    return f"{bytes_val / (1024 * 1024 * 1024):.2f} GB"



def get_project_assets(
    db: DatabaseSession,
    project_id: int,
    folder_id: Optional[int] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
) -> ProjectAssetsResponse:
    """
    Aggregates all physical and logical files generated in a project.
    Maps assets across videos, folders, video documents, and speaker profiles.
    """
    # 1. Map folders: id -> name
    folders = db.query(ProjectFolder).filter(ProjectFolder.project_id == project_id).all()
    folder_map: Dict[int, str] = {f.id: f.name for f in folders}

    # 2. Query videos in this project
    v_query = db.query(Video).filter(
        Video.project_id == project_id,
        Video.deleted_at.is_(None)
    )
    if folder_id is not None:
        v_query = v_query.filter(Video.folder_id == folder_id)

    videos = v_query.order_by(Video.created_at.desc()).all()
    video_ids = [v.id for v in videos]

    assets: List[ProjectAssetItem] = []

    for v in videos:
        v_folder_name = folder_map.get(v.folder_id, "Project Root") if v.folder_id else "Project Root"
        v_title = v.title or v.original_filename or f"Video #{v.id}"

        # A. Original Video
        orig_path = v.original_path
        if not orig_path or not os.path.exists(orig_path):
            for file in UPLOAD_DIR.glob(f"{v.id}_*"):
                if file.is_file():
                    orig_path = str(file)
                    break

        orig_size = v.file_size or _get_file_size(orig_path)
        ext = os.path.splitext(v.original_filename or orig_path or ".mp4")[1].replace(".", "").lower() or "mp4"

        assets.append(
            ProjectAssetItem(
                id=f"video_{v.id}_original",
                project_id=project_id,
                folder_id=v.folder_id,
                folder_name=v_folder_name,
                video_id=v.id,
                video_title=v_title,
                name=f"Original - {v.original_filename or f'video_{v.id}.{ext}'}",
                category="video",
                format=ext,
                size_bytes=orig_size,
                storage_location="s3" if _is_s3_key(orig_path) else "local",
                path_or_key=orig_path or "",
                download_url=f"/api/videos/{v.id}/download?kind=original",
                preview_url=f"/api/videos/{v.id}/original",
                created_at=v.created_at,
            )
        )

        # B. Output Dubbed Video (if generated or completed)
        if v.output_path or (v.status in ["completed", "editing"]):
            out_path = v.output_path
            out_size = _get_file_size(out_path) or (orig_size if orig_size else 0)
            is_s3 = _is_s3_key(out_path)
            assets.append(
                ProjectAssetItem(
                    id=f"video_{v.id}_output",
                    project_id=project_id,
                    folder_id=v.folder_id,
                    folder_name=v_folder_name,
                    video_id=v.id,
                    video_title=v_title,
                    name=f"Translated Output - {v_title}.mp4",
                    category="video",
                    format="mp4",
                    size_bytes=out_size,
                    storage_location="s3" if is_s3 else "local",
                    path_or_key=out_path or "",
                    download_url=f"/api/videos/{v.id}/download?kind=output",
                    preview_url=f"/api/videos/{v.id}/preview",
                    created_at=v.updated_at or v.created_at,
                )
            )

        # C. Vocal Isolation Stem
        vocal_path = v.extracted_vocal_path
        if not vocal_path:
            candidate = OUTPUT_DIR / f"audio_{v.id}" / "vocals.wav"
            if candidate.exists():
                vocal_path = str(candidate)

        if vocal_path and os.path.exists(vocal_path):
            assets.append(
                ProjectAssetItem(
                    id=f"video_{v.id}_vocal",
                    project_id=project_id,
                    folder_id=v.folder_id,
                    folder_name=v_folder_name,
                    video_id=v.id,
                    video_title=v_title,
                    name=f"Vocal Stem - {v_title}.wav",
                    category="audio",
                    format="wav",
                    size_bytes=_get_file_size(vocal_path),
                    storage_location="s3" if _is_s3_key(vocal_path) else "local",
                    path_or_key=vocal_path,
                    download_url=f"/api/videos/{v.id}/audio/vocals",
                    preview_url=f"/api/videos/{v.id}/audio/vocals",
                    created_at=v.updated_at or v.created_at,
                )
            )

        # D. Background Music Stem
        bgm_path = v.background_music_path
        if not bgm_path:
            candidate = OUTPUT_DIR / f"audio_{v.id}" / "no_vocals.wav"
            if candidate.exists():
                bgm_path = str(candidate)

        if bgm_path and os.path.exists(bgm_path):
            assets.append(
                ProjectAssetItem(
                    id=f"video_{v.id}_bgm",
                    project_id=project_id,
                    folder_id=v.folder_id,
                    folder_name=v_folder_name,
                    video_id=v.id,
                    video_title=v_title,
                    name=f"Background Music - {v_title}.wav",
                    category="audio",
                    format="wav",
                    size_bytes=_get_file_size(bgm_path),
                    storage_location="s3" if _is_s3_key(bgm_path) else "local",
                    path_or_key=bgm_path,
                    download_url=f"/api/videos/{v.id}/audio/background",
                    preview_url=f"/api/videos/{v.id}/audio/background",
                    created_at=v.updated_at or v.created_at,
                )
            )

        # E. Dubbed TTS Audio Track
        dub_path = v.dubbed_audio_path
        if not dub_path:
            candidate = OUTPUT_DIR / f"tts_{v.id}" / "dubbed_audio.wav"
            if candidate.exists():
                dub_path = str(candidate)

        if dub_path and os.path.exists(dub_path):
            assets.append(
                ProjectAssetItem(
                    id=f"video_{v.id}_dub_audio",
                    project_id=project_id,
                    folder_id=v.folder_id,
                    folder_name=v_folder_name,
                    video_id=v.id,
                    video_title=v_title,
                    name=f"Dubbed Voice Track - {v_title}.wav",
                    category="audio",
                    format="wav",
                    size_bytes=_get_file_size(dub_path),
                    storage_location="s3" if _is_s3_key(dub_path) else "local",
                    path_or_key=dub_path,
                    download_url=f"/api/videos/{v.id}/audio/dubbed",
                    preview_url=f"/api/videos/{v.id}/audio/dubbed",
                    created_at=v.updated_at or v.created_at,
                )
            )

        # F. Subtitle File (.srt / .vtt)
        sub_path = v.subtitle_path
        if not sub_path:
            candidate = OUTPUT_DIR / f"transcript_{v.id}" / "subtitles.srt"
            if candidate.exists():
                sub_path = str(candidate)

        if sub_path and os.path.exists(sub_path):
            assets.append(
                ProjectAssetItem(
                    id=f"video_{v.id}_subtitles",
                    project_id=project_id,
                    folder_id=v.folder_id,
                    folder_name=v_folder_name,
                    video_id=v.id,
                    video_title=v_title,
                    name=f"Subtitles - {v_title}.srt",
                    category="subtitle",
                    format="srt",
                    size_bytes=_get_file_size(sub_path),
                    storage_location="s3" if _is_s3_key(sub_path) else "local",
                    path_or_key=sub_path,
                    download_url=f"/api/videos/{v.id}/subtitles/download",
                    preview_url=f"/api/videos/{v.id}/subtitles/download",
                    created_at=v.updated_at or v.created_at,
                )
            )

        # G. Transcript File (.json)
        trans_path = v.transcript_path
        if not trans_path:
            candidate = OUTPUT_DIR / f"transcript_{v.id}" / "transcript.json"
            if candidate.exists():
                trans_path = str(candidate)

        if trans_path and os.path.exists(trans_path):
            assets.append(
                ProjectAssetItem(
                    id=f"video_{v.id}_transcript",
                    project_id=project_id,
                    folder_id=v.folder_id,
                    folder_name=v_folder_name,
                    video_id=v.id,
                    video_title=v_title,
                    name=f"Transcript - {v_title}.json",
                    category="transcript",
                    format="json",
                    size_bytes=_get_file_size(trans_path),
                    storage_location="s3" if _is_s3_key(trans_path) else "local",
                    path_or_key=trans_path,
                    download_url=f"/api/videos/{v.id}/transcript/download",
                    preview_url=f"/api/videos/{v.id}/transcript/download",
                    created_at=v.updated_at or v.created_at,
                )
            )

    # 3. Query AI Documents across these videos
    if video_ids:
        docs = db.query(VideoDocument).filter(VideoDocument.video_id.in_(video_ids)).all()
        video_map = {v.id: v for v in videos}
        for d in docs:
            parent_v = video_map.get(d.video_id)
            f_name = folder_map.get(parent_v.folder_id, "Project Root") if parent_v and parent_v.folder_id else "Project Root"
            v_t = parent_v.title if parent_v else f"Video #{d.video_id}"
            d_size = d.file_size_bytes or len((d.content_markdown or "").encode("utf-8"))

            assets.append(
                ProjectAssetItem(
                    id=f"doc_{d.id}",
                    project_id=project_id,
                    folder_id=parent_v.folder_id if parent_v else None,
                    folder_name=f_name,
                    video_id=d.video_id,
                    video_title=v_t,
                    name=f"{d.title} ({d.doc_type.upper()}).md",
                    category="document",
                    format="md",
                    size_bytes=d_size,
                    storage_location="db",
                    path_or_key=d.file_path or f"database://video_documents/{d.id}",
                    download_url=f"/api/videos/{d.video_id}/documents/{d.id}",
                    preview_url=f"/api/videos/{d.video_id}/documents/{d.id}",
                    created_at=d.created_at,
                )
            )

        # 4. Query Speaker Profiles with samples
        speakers = db.query(SpeakerProfile).filter(SpeakerProfile.video_id.in_(video_ids)).all()
        for sp in speakers:
            if sp.voice_sample_path:
                parent_v = video_map.get(sp.video_id)
                f_name = folder_map.get(parent_v.folder_id, "Project Root") if parent_v and parent_v.folder_id else "Project Root"
                v_t = parent_v.title if parent_v else f"Video #{sp.video_id}"
                sample_size = _get_file_size(sp.voice_sample_path)

                assets.append(
                    ProjectAssetItem(
                        id=f"speaker_{sp.id}",
                        project_id=project_id,
                        folder_id=parent_v.folder_id if parent_v else None,
                        folder_name=f_name,
                        video_id=sp.video_id,
                        video_title=v_t,
                        name=f"Voice Sample - {sp.speaker_label}.wav",
                        category="speaker_voice",
                        format="wav",
                        size_bytes=sample_size,
                        storage_location="s3" if _is_s3_key(sp.voice_sample_path) else "local",
                        path_or_key=sp.voice_sample_path,
                        download_url=f"/api/videos/{sp.video_id}/speakers/{sp.id}/sample",
                        preview_url=f"/api/videos/{sp.video_id}/speakers/{sp.id}/sample",
                        created_at=sp.created_at,
                    )
                )

    # 5. Normalize fields and compute counts
    for a in assets:
        if not a.storage_type:
            a.storage_type = a.storage_location or "local"
        if not a.size_display:
            a.size_display = _format_size_display(a.size_bytes or 0)
        if not a.format:
            a.format = "bin"

    total_files = len(assets)
    total_size = sum(a.size_bytes for a in assets)
    category_counts: Dict[str, int] = {
        "all": total_files,
        "video": sum(1 for a in assets if a.category == "video"),
        "audio": sum(1 for a in assets if a.category == "audio"),
        "subtitle": sum(1 for a in assets if a.category == "subtitle"),
        "transcript": sum(1 for a in assets if a.category == "transcript"),
        "document": sum(1 for a in assets if a.category == "document"),
        "speaker_voice": sum(1 for a in assets if a.category == "speaker_voice"),
    }

    # 6. Apply category filter if requested
    filtered_assets = assets
    if category and category != "all":
        if category == "subtitles":
            filtered_assets = [a for a in filtered_assets if a.category in ["subtitle", "transcript"]]
        else:
            filtered_assets = [a for a in filtered_assets if a.category == category]

    # 7. Apply search query filter if requested
    if search and search.strip():
        q = search.strip().lower()
        filtered_assets = [
            a for a in filtered_assets
            if q in a.name.lower() or (a.video_title and q in a.video_title.lower()) or q in (a.folder_name or "").lower()
        ]

    return ProjectAssetsResponse(
        project_id=project_id,
        total_files=len(filtered_assets),
        total_size_bytes=total_size,
        category_counts=category_counts,
        assets=filtered_assets,
    )


def create_project_zip_bundle(
    db: DatabaseSession,
    project_id: int,
    folder_id: Optional[int] = None,
) -> io.BytesIO:
    """
    Creates an in-memory zip bundle containing all project files organized in folders.
    """
    assets_response = get_project_assets(db, project_id, folder_id=folder_id)
    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for a in assets_response.assets:
            # Construct folder hierarchy inside ZIP
            safe_folder = "".join(c for c in (a.folder_name or "Root") if c.isalnum() or c in " ._-")
            safe_video = "".join(c for c in (a.video_title or "General") if c.isalnum() or c in " ._-")
            safe_filename = "".join(c for c in a.name if c.isalnum() or c in " ._()-")

            zip_arc_path = f"{safe_folder}/{safe_video}/{a.category}/{safe_filename}"

            # Check if file exists on disk
            if a.path_or_key and os.path.exists(a.path_or_key) and os.path.isfile(a.path_or_key):
                try:
                    zip_file.write(a.path_or_key, arcname=zip_arc_path)
                    continue
                except Exception as e:
                    logger.warning(f"Could not add {a.path_or_key} to zip: {e}")

            # For DB markdown documents, write string content directly
            if a.category == "document" and a.id.startswith("doc_"):
                doc_id = int(a.id.replace("doc_", ""))
                doc_record = db.query(VideoDocument).filter(VideoDocument.id == doc_id).first()
                if doc_record and doc_record.content_markdown:
                    zip_file.writestr(zip_arc_path, doc_record.content_markdown)

    zip_buffer.seek(0)
    return zip_buffer
