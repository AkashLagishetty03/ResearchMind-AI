from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    OPENROUTER_API_KEY: str = ""
    DATABASE_URL: str = "sqlite+aiosqlite:///./researchmind.db"
    APP_NAME: str = "ResearchMind AI"
    APP_ENV: str = "development"
    FRONTEND_URL: str = "http://localhost:5173"

    # Comma-separated list of allowed CORS origins (overrides FRONTEND_URL when set)
    # Example: "https://researchmind.vercel.app,https://researchmind-ai.vercel.app"
    ALLOWED_ORIGINS: str = ""

    # ─── JWT Authentication ───────────────────────────────────────────────────
    JWT_SECRET_KEY: str = "researchmind-super-secret-key-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080   # 7 days

settings = Settings()
