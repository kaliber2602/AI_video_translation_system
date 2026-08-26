import boto3
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