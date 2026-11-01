"""
Silence Detection Service
Detects silence in audio to stop ASR processing early
Reduces GPU time and costs
"""

import numpy as np
from typing import Optional
from loguru import logger


class SilenceDetector:
    """
    Detects silence in audio streams
    Stops ASR processing when silence is detected
    """

    def __init__(self, threshold: float = 0.01, min_silence_duration: float = 0.5):
        """
        Args:
            threshold: Amplitude threshold for silence (0-1)
            min_silence_duration: Minimum silence duration in seconds to trigger
        """
        self.threshold = threshold
        self.min_silence_duration = min_silence_duration
        self.silence_start: Optional[float] = None
        self.enabled = True

    def detect_silence(self, audio_data: bytes, sample_rate: int = 8000) -> bool:
        """
        Detect if audio contains silence
        Returns True if silence detected for min_duration
        """
        if not self.enabled:
            return False

        try:
            # Convert bytes to numpy array
            audio_array = np.frombuffer(audio_data, dtype=np.int16)
            
            # Normalize to [-1, 1]
            audio_normalized = audio_array.astype(np.float32) / 32768.0
            
            # Calculate RMS (root mean square) amplitude
            rms = np.sqrt(np.mean(audio_normalized ** 2))
            
            # Check if below threshold
            is_silent = rms < self.threshold
            
            if is_silent:
                if self.silence_start is None:
                    self.silence_start = len(audio_array) / sample_rate
                else:
                    silence_duration = (len(audio_array) / sample_rate) - self.silence_start
                    if silence_duration >= self.min_silence_duration:
                        logger.debug(f"Silence detected: {silence_duration:.2f}s")
                        return True
            else:
                # Reset silence tracking if audio detected
                self.silence_start = None
            
            return False
            
        except Exception as e:
            logger.error(f"Silence detection error: {e}")
            return False

    def reset(self):
        """Reset silence detection state"""
        self.silence_start = None

    def get_energy_level(self, audio_data: bytes) -> float:
        """Get audio energy level (0-1)"""
        try:
            audio_array = np.frombuffer(audio_data, dtype=np.int16)
            audio_normalized = audio_array.astype(np.float32) / 32768.0
            rms = np.sqrt(np.mean(audio_normalized ** 2))
            return min(1.0, rms * 10)  # Scale for visibility
        except:
            return 0.0
