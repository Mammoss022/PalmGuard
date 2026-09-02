"""Image storage adapter.

docs/ARCHITECTURE.md#storage-architecture. Two implementations behind the
same `save()` interface — chosen by `settings.STORAGE_BACKEND` — so no other
code (app/api/v1/diagnoses.py) needs to change either way:
- `LocalImageStorage`: writes to local disk. Fine for local dev, but most
  free hosts (Render's free web services included) don't give you a
  persistent disk — files vanish on every restart/redeploy.
- `SupabaseImageStorage`: uploads to a Supabase Storage bucket over its
  REST API (plain httpx call — Supabase's Python SDK would be another
  dependency for one PUT request). Used for the deployed app.
"""

import uuid
from pathlib import Path

import httpx

from app.core.config import settings

CONTENT_TYPE_EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


class LocalImageStorage:
    def __init__(self, base_dir: str, public_url: str):
        self._base_dir = Path(base_dir)
        self._base_dir.mkdir(parents=True, exist_ok=True)
        self._public_url = public_url.rstrip("/")

    def save(self, content: bytes, content_type: str) -> str:
        extension = CONTENT_TYPE_EXTENSIONS[content_type]
        filename = f"{uuid.uuid4().hex}.{extension}"
        (self._base_dir / filename).write_bytes(content)
        return f"{self._public_url}/{filename}"

    @property
    def base_dir(self) -> Path:
        return self._base_dir


class SupabaseImageStorage:
    """Uploads to a Supabase Storage bucket — docs/ARCHITECTURE.md#storage-architecture.

    The bucket must exist and be set to Public (Supabase Dashboard -> Storage
    -> New bucket -> Public bucket) so the returned URL is directly usable as
    `diagnoses.image_url` / `<img src>` without generating signed URLs.
    """

    def __init__(self, supabase_url: str, service_role_key: str, bucket: str):
        if not supabase_url or not service_role_key:
            raise RuntimeError(
                "STORAGE_BACKEND=supabase ต้องตั้งค่า SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY — ดู backend/.env.example"
            )
        self._base_url = supabase_url.rstrip("/")
        self._key = service_role_key
        self._bucket = bucket

    def save(self, content: bytes, content_type: str) -> str:
        extension = CONTENT_TYPE_EXTENSIONS[content_type]
        filename = f"{uuid.uuid4().hex}.{extension}"
        upload_url = f"{self._base_url}/storage/v1/object/{self._bucket}/{filename}"
        response = httpx.post(
            upload_url,
            content=content,
            headers={
                "Authorization": f"Bearer {self._key}",
                "Content-Type": content_type,
            },
            timeout=30.0,
        )
        response.raise_for_status()
        return f"{self._base_url}/storage/v1/object/public/{self._bucket}/{filename}"


def _build_storage() -> LocalImageStorage | SupabaseImageStorage:
    if settings.STORAGE_BACKEND == "supabase":
        return SupabaseImageStorage(
            settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY, settings.SUPABASE_STORAGE_BUCKET
        )
    return LocalImageStorage(settings.STORAGE_DIR, settings.STORAGE_PUBLIC_URL)


storage = _build_storage()
