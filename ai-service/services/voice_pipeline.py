"""
Voice Pipeline using Pipecat framework
Orchestrates ASR -> LLM -> TTS flow with NVIDIA models
"""

import asyncio
import base64
import json
import logging
from typing import Optional, Callable
from loguru import logger

try:
    from pipecat.frames.frames import (
        AudioFrame,
        TextFrame,
        LLMMessagesFrame,
        LLMResponseStartFrame,
        LLMResponseEndFrame,
    )
    from pipecat.processors.aggregators.llm_response import LLMUserResponseAggregator
    from pipecat.services.nemotron import NemotronSpeechService, NemotronLLMService
    from pipecat.services.magpie import MagpieTTSService
except ImportError:
    logger.warning("Pipecat not installed, using mock implementations")
    # Mock implementations for development
    class AudioFrame:
        pass
    class TextFrame:
        pass

from services.nemotron_asr import NemotronASRService
from services.nemotron_llm import NemotronLLMService as CustomLLMService
from services.magpie_tts import MagpieTTSService as CustomTTSService
from services.silence_detector import SilenceDetector
from config import settings


class VoicePipeline:
    """
    Real-time voice processing pipeline:
    1. Audio chunks -> Nemotron Speech ASR -> Text
    2. Text -> Context assembly -> Prompt injection -> LLM (Nemotron 3 Nano)
    3. LLM response -> Magpie TTS -> Audio
    """

    def __init__(self, call_session_id: str):
        self.call_session_id = call_session_id
        self.asr_service: Optional[NemotronASRService] = None
        self.llm_service: Optional[CustomLLMService] = None
        self.tts_service: Optional[CustomTTSService] = None
        
        # Audio buffers
        self.audio_buffer = bytearray()
        self.text_buffer = ""
        
        # Silence detector (cost optimization)
        self.silence_detector = SilenceDetector(
            threshold=0.01,
            min_silence_duration=0.5,
        )
        
        # Callbacks
        self.on_text_callback: Optional[Callable] = None  # For transcriptions (user speech)
        self.on_response_callback: Optional[Callable] = None  # For LLM text responses (agent)
        self.on_audio_callback: Optional[Callable] = None
        
        # Metrics
        self.metrics = {
            "asr_latency": [],
            "llm_latency": [],
            "tts_latency": [],
            "total_latency": [],
        }

    async def initialize(self):
        """Initialize all services"""
        logger.info(f"Initializing voice pipeline for session: {self.call_session_id}")
        
        try:
            # Initialize ASR
            self.asr_service = NemotronASRService()
            await self.asr_service.initialize()
            
            # Initialize LLM
            self.llm_service = CustomLLMService(self.call_session_id)
            await self.llm_service.initialize()
            
            # Initialize TTS
            self.tts_service = CustomTTSService()
            await self.tts_service.initialize()
            
            logger.info("Voice pipeline initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing voice pipeline: {e}")
            raise

    async def process_audio_chunk(self, audio_payload: str):
        """
        Process incoming audio chunk
        Audio can be base64-encoded mu-law PCM (Twilio) or raw PCM (browser)
        """
        try:
            # Decode base64 audio
            audio_bytes = base64.b64decode(audio_payload)
            
            # Browser sends Int16Array as base64, which is already linear PCM
            # Twilio sends mu-law, but we'll handle that separately if needed
            # For now, assume browser format (linear PCM)
            linear_audio = audio_bytes
            logger.info(f"Received audio chunk: {len(linear_audio)} bytes (buffer now: {len(self.audio_buffer) + len(linear_audio)} bytes)")
            
            # Check for silence (cost optimization: skip processing silent chunks)
            # Disable silence detection for now to ensure we process audio
            # if self.silence_detector.detect_silence(linear_audio):
            #     logger.debug("Silence detected, skipping ASR processing")
            #     return  # Early exit to save GPU time
            
            # Add to buffer
            self.audio_buffer.extend(linear_audio)
            
            # Process when buffer reaches threshold (e.g., 320ms of audio)
            # 320ms at 8kHz, 16-bit = 8000 * 0.32 * 2 = 5120 bytes
            # Lower threshold for faster response (160ms = 2560 bytes)
            threshold = 2560  # 160ms of audio for faster transcription
            if len(self.audio_buffer) >= threshold:
                await self._process_audio_buffer()
                
        except Exception as e:
            logger.error(f"Error processing audio chunk: {e}", exc_info=True)

    async def _process_audio_buffer(self):
        """Process accumulated audio buffer through ASR"""
        if not self.asr_service or len(self.audio_buffer) == 0:
            return

        try:
            import time
            start_time = time.time()
            
            # Convert buffer to bytes for ASR
            audio_bytes = bytes(self.audio_buffer)
            logger.debug(f"Processing audio buffer: {len(audio_bytes)} bytes")
            
            # Run ASR
            text_result = await self.asr_service.transcribe(audio_bytes)
            
            asr_latency = (time.time() - start_time) * 1000
            self.metrics["asr_latency"].append(asr_latency)
            
            logger.info(f"ASR result: '{text_result}' (latency: {asr_latency:.1f}ms)")
            
            if text_result and text_result.strip():
                self.text_buffer += text_result + " "
                
                # Send transcription via callback
                if self.on_text_callback:
                    await self.on_text_callback(text_result.strip())
                
                # Trigger LLM processing
                await self._process_text_with_llm(text_result)
            else:
                logger.warning("ASR returned empty result - this may indicate ASR service is unavailable")
                # Send error notification to frontend via callback
                # We'll send a message indicating ASR failed but continue processing
                if self.on_text_callback:
                    # Send a fallback message so user knows something happened
                    await self.on_text_callback("(Audio received but transcription unavailable)")
                    # Process with a generic prompt
                    await self._process_text_with_llm("I heard you speak but couldn't transcribe it. Can you repeat that?")
            
            # Clear buffer
            self.audio_buffer.clear()
            
        except Exception as e:
            logger.error(f"Error in ASR processing: {e}", exc_info=True)

    async def _process_text_with_llm(self, user_text: str):
        """Process transcribed text through LLM"""
        if not self.llm_service:
            logger.warning("LLM service not available")
            return

        try:
            import time
            start_time = time.time()
            
            # Get agent response
            response_text = await self.llm_service.generate_response(user_text)
            
            llm_latency = (time.time() - start_time) * 1000
            self.metrics["llm_latency"].append(llm_latency)
            
            if response_text:
                # Send LLM response text via callback (for frontend display)
                if self.on_response_callback:
                    await self.on_response_callback(response_text, llm_latency)
                
                # Convert response to audio
                await self._text_to_speech(response_text)
            else:
                logger.warning("LLM returned empty response")
                # Send fallback response
                if self.on_response_callback:
                    await self.on_response_callback("I'm sorry, I couldn't generate a response. Please try again.", 0)
                
        except Exception as e:
            logger.error(f"Error in LLM processing: {e}", exc_info=True)
            # Send error response via callback
            if self.on_response_callback:
                try:
                    await self.on_response_callback("I apologize, but I'm having trouble processing that. Could you please repeat?", 0)
                except Exception as callback_error:
                    logger.error(f"Error sending error callback: {callback_error}")

    async def _text_to_speech(self, text: str):
        """Convert text response to audio using Magpie TTS"""
        if not self.tts_service:
            return

        try:
            import time
            start_time = time.time()
            
            # Generate audio
            audio_data = await self.tts_service.synthesize(text)
            
            tts_latency = (time.time() - start_time) * 1000
            self.metrics["tts_latency"].append(tts_latency)
            
            # Encode audio to base64 (keep as linear PCM for browser)
            if not audio_data or len(audio_data) == 0:
                logger.warning("TTS returned empty audio data")
                # Don't send empty audio
                return
            
            # For browser playback, send as base64-encoded raw PCM
            audio_base64 = base64.b64encode(audio_data).decode('utf-8')
            
            # Send audio back via callback
            if self.on_audio_callback and audio_base64:
                await self.on_audio_callback(audio_base64)
            else:
                logger.warning("No audio callback or empty audio base64")
            
            # Also send text response for display
            if self.on_text_callback:
                # We need to track that this is an agent response
                # For now, we'll send it separately - but the frontend should handle it
                pass
                
        except Exception as e:
            logger.error(f"Error in TTS processing: {e}")

    def set_callbacks(
        self,
        on_text: Optional[Callable] = None,  # User transcription
        on_response: Optional[Callable] = None,  # Agent text response
        on_audio: Optional[Callable] = None,  # Agent audio response
    ):
        """Set callbacks for transcription, text responses, and audio responses"""
        self.on_text_callback = on_text
        self.on_response_callback = on_response
        self.on_audio_callback = on_audio

    def get_metrics(self) -> dict:
        """Get performance metrics"""
        def avg(lst):
            return sum(lst) / len(lst) if lst else 0

        return {
            "avg_asr_latency_ms": avg(self.metrics["asr_latency"]),
            "avg_llm_latency_ms": avg(self.metrics["llm_latency"]),
            "avg_tts_latency_ms": avg(self.metrics["tts_latency"]),
            "total_turns": len(self.metrics["asr_latency"]),
        }

    async def cleanup(self):
        """Cleanup resources"""
        logger.info(f"Cleaning up voice pipeline for session: {self.call_session_id}")
        
        if self.asr_service:
            await self.asr_service.cleanup()
        if self.llm_service:
            await self.llm_service.cleanup()
        if self.tts_service:
            await self.tts_service.cleanup()
