"""
NVIDIA Magpie TTS Service
Handles text-to-speech conversion with natural voice synthesis
"""

import asyncio
import httpx
import base64
import logging
from typing import Optional, Dict
from loguru import logger
from config import settings


class MagpieTTSService:
    """
    NVIDIA Magpie TTS service
    Converts text to natural-sounding speech
    """

    def __init__(self):
        self.base_url = settings.MAGPIE_TTS_URL
        self.client: Optional[httpx.AsyncClient] = None
        self.voice_settings: Dict = {
            "speed": 1.0,
            "pitch": 1.0,
            "voice": "default",
        }

    async def initialize(self):
        """Initialize TTS service"""
        logger.info(f"Initializing Magpie TTS service at {self.base_url}")
        headers = {}
        if settings.NVIDIA_API_KEY:
            headers["Authorization"] = f"Bearer {settings.NVIDIA_API_KEY}"
            headers["Content-Type"] = "application/json"
        self.client = httpx.AsyncClient(timeout=30.0, headers=headers)

    async def synthesize(self, text: str, voice_settings: Optional[Dict] = None) -> bytes:
        """
        Synthesize text to speech
        Returns audio data as bytes (PCM, 16-bit, 8kHz)
        """
        if voice_settings:
            self.voice_settings.update(voice_settings)

        if not self.client:
            # Mock audio generation for development
            # Generate silence or a simple tone
            import numpy as np
            sample_rate = 8000
            duration = len(text) * 0.1  # Rough estimate
            samples = int(sample_rate * duration)
            audio = np.zeros(samples, dtype=np.int16)
            return audio.tobytes()

        try:
            # Use NVIDIA NIM API if API key is set
            if settings.NVIDIA_API_KEY:
                # NVIDIA NIM TTS endpoint: /v1/audio/synthesize
                # base_url is already https://integrate.api.nvidia.com/v1
                # So we use /audio/synthesize (not /v1/audio/synthesize to avoid double /v1)
                tts_url = f"{self.base_url.rstrip('/v1')}/v1/audio/synthesize"
                response = await self.client.post(
                    tts_url,
                    json={
                        "model": settings.MAGPIE_TTS_MODEL,
                        "input": text,
                        "voice": self.voice_settings.get("voice", "default"),
                        "speed": self.voice_settings.get("speed", 1.0),
                        "response_format": "pcm",
                        "sample_rate": 8000,
                    },
                )
            else:
                # Local API format
                response = await self.client.post(
                    f"{self.base_url}/v1/tts/synthesize",
                    json={
                        "text": text,
                        "voice": self.voice_settings.get("voice", "default"),
                        "speed": self.voice_settings.get("speed", 1.0),
                        "pitch": self.voice_settings.get("pitch", 1.0),
                        "sample_rate": 8000,
                        "format": "pcm",
                    },
                )
            
            if response.status_code == 200:
                # Check if response is JSON or binary
                content_type = response.headers.get("content-type", "")
                if "application/json" in content_type:
                    data = response.json()
                    audio_base64 = data.get("audio") or data.get("data")
                    if audio_base64:
                        return base64.b64decode(audio_base64)
                else:
                    # Binary audio response
                    return response.content
            else:
                error_text = response.text if hasattr(response, 'text') else str(response.status_code)
                logger.error(f"TTS API error: {response.status_code} - {error_text}")
                
        except Exception as e:
            logger.error(f"Error in TTS synthesis: {e}")
            # Fallback to mock audio (silence with some samples)
            import numpy as np
            sample_rate = 8000
            duration = max(0.5, len(text) * 0.1)  # At least 0.5 seconds
            samples = int(sample_rate * duration)
            if samples > 0:
                audio = np.zeros(samples, dtype=np.int16)
                return audio.tobytes()
            else:
                # Return minimal audio if calculation fails
                return np.zeros(4000, dtype=np.int16).tobytes()  # 0.5 seconds at 8kHz

        # If we get here, TTS failed but no exception - return silence
        logger.warning("TTS returned empty data, using fallback silence")
        import numpy as np
        return np.zeros(4000, dtype=np.int16).tobytes()  # 0.5 seconds at 8kHz

    def set_voice_settings(self, settings: Dict):
        """Update voice settings"""
        self.voice_settings.update(settings)

    async def cleanup(self):
        """Cleanup TTS service"""
        if self.client:
            await self.client.aclose()
            self.client = None
