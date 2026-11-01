"""
Configuration settings for the AI service
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 3003
    DEBUG: bool = False

    # Database
    DATABASE_URL: Optional[str] = None

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # NVIDIA API keys (if using cloud APIs)
    NVIDIA_API_KEY: Optional[str] = None

    # Model endpoints (for local/self-hosted models or cloud APIs)
    # NVIDIA NIM (NVIDIA Inference Microservice) endpoints
    # These will use NVIDIA cloud APIs when NVIDIA_API_KEY is set
    NEMOTRON_SPEECH_URL: str = "https://integrate.api.nvidia.com/v1"
    NEMOTRON_LLM_URL: str = "https://integrate.api.nvidia.com/v1"
    MAGPIE_TTS_URL: str = "https://integrate.api.nvidia.com/v1"
    
    # Model IDs for NVIDIA NIM
    NEMOTRON_SPEECH_MODEL: str = "nvidia/nemotron-speech-1.1"
    NEMOTRON_LLM_MODEL: str = "nvidia/nemotron-3-8b-instruct"
    MAGPIE_TTS_MODEL: str = "nvidia/magpie-tts-1.0"

    # Backend API
    BACKEND_API_URL: str = "http://localhost:3001/api"

    # WebSocket settings
    WS_URL: str = "ws://localhost:3002"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
