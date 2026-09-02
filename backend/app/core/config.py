from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    PROJECT_NAME: str = "PalmGuard AI"
    API_V1_PREFIX: str = "/api/v1"

    # docs/DATABASE.md targets PostgreSQL.
    DATABASE_URL: str = "postgresql+psycopg://palmguard:palmguard@localhost:5432/palmguard"

    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Object Storage provider — docs/ARCHITECTURE.md#storage-architecture.
    # "local" (default, dev only — disk is ephemeral on most free hosts, see
    # app/services/storage.py) or "supabase" (Supabase Storage, free tier, no
    # card required — used for the Render/Vercel deployment).
    STORAGE_BACKEND: str = "local"
    STORAGE_DIR: str = "./storage/images"
    STORAGE_PUBLIC_URL: str = "http://localhost:8000/media"
    MAX_UPLOAD_SIZE_MB: int = 10

    # Only used when STORAGE_BACKEND=supabase (app/services/storage.py).
    # SUPABASE_URL is the project's API URL (https://<project-ref>.supabase.co);
    # SUPABASE_SERVICE_ROLE_KEY is the *service_role* key (Project Settings ->
    # API), not the anon key — uploads go through the Backend, never the
    # client, so the more-privileged key never reaches the browser.
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_STORAGE_BUCKET: str = "diagnosis-images"

    # Plain str, not list[str] — pydantic-settings tries to JSON-decode env
    # vars for list-typed fields *before* any field_validator runs, so a
    # comma-separated value (no brackets) blows up with a SettingsError
    # before our own parsing ever gets a chance to run. Comma-separated is
    # how you'd naturally type this into Render's Environment Variables UI,
    # so parse it ourselves instead — see cors_origins_list below.
    CORS_ORIGINS: str = "http://localhost:3000"

    # Google Gemini Vision (see app/services/ai_inference.py) — ported from
    # ~/BaiScan's googleAiService.ts. Used for full classification when
    # AI_BACKEND=gemini, and as the fast "is this a palm leaf?" gate in front
    # of the local model when AI_BACKEND=mobilenet (the default).
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.6-flash"
    # Separate (cheaper/faster) model for is_palm_leaf()'s yes/no gate check —
    # GEMINI_MODEL is a "thinking" model that's noticeably slower (20-35s) for
    # a call that doesn't need deep reasoning; a "-lite" model answers the
    # same gate question correctly in ~1-2s.
    GEMINI_GATE_MODEL: str = "gemini-3.5-flash-lite"
    GEMINI_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta"
    MIN_CONFIDENCE_THRESHOLD: float = 0.55

    # Which inference backend app/services/inference.py dispatches to.
    # "mobilenet" (default — the real trained model at
    # ai/models/mobilenetv2-v1.2.keras, see ai/README.md) or "gemini" (full
    # classification via Gemini alone, no local model needed).
    AI_BACKEND: str = "mobilenet"
    MOBILENET_MODEL_PATH: str = "../ai/models/mobilenetv2-v1.2.keras"

    @property
    def cors_origins_list(self) -> list[str]:
        """Accepts either a comma-separated string (e.g. Render's Environment
        Variables UI: `http://localhost:3000,https://foo.vercel.app`) or a
        JSON array string (the old `.env` convention, still supported)."""
        raw = self.CORS_ORIGINS.strip()
        if raw.startswith("["):
            import json

            return [str(origin) for origin in json.loads(raw)]
        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


settings = Settings()
