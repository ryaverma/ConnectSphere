from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Fields without a default are required and must be set in .env (see .env.example).
    mongodb_uri: str
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str
    pinecone_api_key: str = ""
    pinecone_environment: str = "us-east-1-aws"
    pinecone_index: str = "connectsphere"
    redis_url: str
    celery_broker_url: str
    celery_result_backend: str
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    llm_provider: str = "anthropic"
    fast_llm_model: str = "claude-haiku-4-5-20251001"
    primary_llm_model: str = "claude-sonnet-4-6"
    sentence_transformer_model: str = "all-MiniLM-L6-v2"
    internal_service_secret: str
    fastapi_port: int = 8001
    # AES key for decrypting OAuth tokens stored by Node.js service
    encryption_key: str = ""
    ticketmaster_api_key: str = ""
    ticketmaster_api_base: str = "https://app.ticketmaster.com/discovery/v2"
    ticketmaster_page_size: int = 24
    ticketmaster_default_query: str = ""
    ticketmaster_country_code: str = "US"

    class Config:
        env_file = ".env"


settings = Settings()
