import aioboto3

from app.config import settings

_session = aioboto3.Session()


def _client_kwargs() -> dict:
    return {
        "service_name": "s3",
        "region_name": settings.aws_region,
        "aws_access_key_id": settings.aws_access_key_id,
        "aws_secret_access_key": settings.aws_secret_access_key,
    }


async def upload_bytes(
    data: bytes, key: str, content_type: str = "application/octet-stream"
) -> str:
    async with _session.client(**_client_kwargs()) as s3:
        await s3.put_object(
            Bucket=settings.s3_bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )
    return key


async def upload_file(
    local_path: str, key: str, content_type: str = "application/pdf"
) -> str:
    async with _session.client(**_client_kwargs()) as s3:
        await s3.upload_file(
            local_path,
            settings.s3_bucket,
            key,
            ExtraArgs={"ContentType": content_type},
        )
    return key


async def get_presigned_url(key: str, expires_in: int = 3600) -> str:
    async with _session.client(**_client_kwargs()) as s3:
        return await s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.s3_bucket, "Key": key},
            ExpiresIn=expires_in,
        )
