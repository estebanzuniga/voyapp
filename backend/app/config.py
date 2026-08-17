from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    environment: str = "development"

    database_url: str = "postgresql+asyncpg://localhost/voyapp"

    jwt_secret_key: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7

    cors_origins: list[str] = ["http://localhost:5173"]

    client_url: str = "http://localhost:5173"

    brevo_api_key: str | None = None
    email_from: str = "noreply@voyapp.app"


settings = Settings()
