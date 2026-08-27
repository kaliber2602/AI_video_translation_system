import os
import boto3
from pathlib import Path
from typing import List, Optional

from app.core.config import (
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_REGION,
    AWS_S3_BUCKET,
)

s3 = boto3.client(
    "s3",
    region_name=AWS_REGION,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
)


def upload_file(local_path: str, s3_key: str, content_type: str | None = None) -> None:
    extra_args = {}
    if content_type:
        extra_args["ContentType"] = content_type

    s3.upload_file(
        local_path,
        AWS_S3_BUCKET,
        s3_key,
        ExtraArgs=extra_args,
    )


def upload_hls_directory(
    local_dir: str,
    s3_prefix: str,
    content_type_map: dict = None,
) -> dict:
    """
    Upload all files in an HLS directory (.m3u8 and .ts files)
    
    Args:
        local_dir: Local directory containing HLS files
        s3_prefix: S3 prefix (e.g., "videos/abc123/translated/vi")
        content_type_map: Optional mapping for file extensions
    
    Returns:
        dict with uploaded file keys
    """
    if content_type_map is None:
        content_type_map = {
            ".m3u8": "application/x-mpegURL",
            ".ts": "video/mp2t",
        }
    
    uploaded_files = {
        "playlists": [],
        "segments": [],
        "master_playlist": None,
    }
    
    for root, dirs, files in os.walk(local_dir):
        for file in files:
            local_path = os.path.join(root, file)
            relative_path = os.path.relpath(local_path, local_dir)
            
            # Determine content type
            ext = os.path.splitext(file)[1]
            content_type = content_type_map.get(ext, "application/octet-stream")
            
            # Build S3 key
            s3_key = f"{s3_prefix}/{relative_path}".replace("\\", "/")
            
            # Upload file
            upload_file(local_path, s3_key, content_type)
            
            # Track uploaded files
            if ext == ".m3u8":
                if "master.m3u8" in file:
                    uploaded_files["master_playlist"] = s3_key
                else:
                    uploaded_files["playlists"].append(s3_key)
            elif ext == ".ts":
                uploaded_files["segments"].append(s3_key)
    
    return uploaded_files