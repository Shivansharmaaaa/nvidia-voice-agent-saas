"""
Graceful Degradation Service
Provides fallback responses when AI services fail
"""

from typing import Optional, Dict
from loguru import logger


class GracefulDegradation:
    """
    Provides fallback responses and handling when services degrade
    """

    FALLBACK_RESPONSES = {
        "asr_failure": "I'm having trouble hearing you. Could you please repeat that?",
        "llm_failure": "I apologize, but I'm experiencing technical difficulties. Please hold while I connect you to a representative.",
        "tts_failure": "Please hold.",
        "timeout": "I'm taking longer than expected to respond. Please hold.",
        "rate_limit": "We're experiencing high call volume. Please try again in a moment.",
    }

    def __init__(self, agent_config: Optional[Dict] = None):
        self.agent_config = agent_config or {}
        self.fallback_enabled = True

    def get_fallback_response(self, failure_type: str) -> str:
        """Get appropriate fallback response"""
        if not self.fallback_enabled:
            return ""

        # Check for custom fallback in agent config
        custom_fallbacks = self.agent_config.get("fallbackResponses", {})
        if failure_type in custom_fallbacks:
            return custom_fallbacks[failure_type]

        return self.FALLBACK_RESPONSES.get(
            failure_type, "I apologize for the inconvenience. Please hold."
        )

    def should_escalate(self, failure_count: int, failure_type: str) -> bool:
        """Determine if escalation is needed based on failure pattern"""
        # Escalate after 3 consecutive failures
        if failure_count >= 3:
            return True

        # Escalate immediately for critical failures
        if failure_type in ["llm_failure", "timeout"]:
            return failure_count >= 2

        return False

    def get_silence_audio(self, duration_ms: int = 500) -> bytes:
        """Generate silence audio for fallback"""
        import numpy as np

        sample_rate = 8000
        samples = int(sample_rate * duration_ms / 1000)
        silence = np.zeros(samples, dtype=np.int16)
        return silence.tobytes()
