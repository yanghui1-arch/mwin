from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str
    judge_api_base: str
    judge_api_key: str
    judge_model: str = "anthropic/claude-haiku-4-5"
    judge_timeout_seconds: int = 30   # abort LLM call if it hangs beyond this
    worker_concurrency: int = 4


settings = Settings()
