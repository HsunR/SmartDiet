from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    database_url: str = "postgresql+asyncpg://smartdiet:smartdiet@localhost:5432/smartdiet"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440
    llm_provider: str = "dashscope"
    dashscope_api_key: str = ""
    zhipu_api_key: str = ""
    dashscope_model: str = "qwen-vl-plus"
    zhipu_model: str = "glm-4v-plus"


settings = Settings()
