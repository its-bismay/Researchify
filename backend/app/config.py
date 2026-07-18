import re
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


def _clean_db_url(url: str) -> str:
    """Strip sslmode/channel_binding — asyncpg rejects query params."""
    return re.sub(r"[\?&](sslmode|channel_binding)=[^&]+", "", url)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    def model_post_init(self, __context) -> None:
        self.database_url = _clean_db_url(self.database_url)
        self.database_url_direct = _clean_db_url(self.database_url_direct)

    # Auth
    google_client_id: str = ""
    google_client_secret: str = ""
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30

    # LLM
    gemini_api_key: str = ""

    # Database
    database_url: str = (
        "postgresql+asyncpg://user:pass@localhost:5432/research_platform"
    )
    database_url_direct: str = (
        "postgresql://user:pass@localhost:5432/research_platform"
    )

    # AWS S3
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "ap-south-1"
    s3_bucket: str = "research-platform-files"

    # Email (SMTP)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    email_from: str = ""

    # Telegram
    telegram_bot_token: str = ""
    telegram_bot_username: str = ""

    # Branding
    site_name: str = "AI Research Agent"

    # External search APIs
    unsplash_access_key: str = ""
    youtube_api_key: str = ""

    # URLs
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"

    # Cookies
    cookie_secure: bool = False
    cookie_domain: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
