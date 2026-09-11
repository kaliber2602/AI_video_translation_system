from typing import Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel


class ProjectAssetItem(BaseModel):
    id: str
    project_id: int
    folder_id: Optional[int] = None
    folder_name: Optional[str] = None
    video_id: Optional[int] = None
    video_title: Optional[str] = None
    name: str
    category: str  # video, audio, subtitle, transcript, document, speaker_voice
    format: str = "bin"  # mp4, wav, srt, vtt, json, md, txt, etc.
    size_bytes: int = 0
    size_display: Optional[str] = None
    storage_location: str = "local"  # local, s3, db
    storage_type: Optional[str] = "local"
    path_or_key: str = ""
    download_url: str
    preview_url: Optional[str] = None
    created_at: Optional[datetime] = None


class ProjectAssetsResponse(BaseModel):
    project_id: int
    total_files: int
    total_size_bytes: int
    category_counts: Dict[str, int]
    assets: List[ProjectAssetItem]
