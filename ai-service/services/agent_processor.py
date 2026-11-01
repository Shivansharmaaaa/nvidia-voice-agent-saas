"""
Agent Processor
Orchestrates the complete voice agent flow for a call session
"""

import asyncio
import json
import logging
from typing import Optional, Dict
from loguru import logger
import httpx
from config import settings

from services.voice_pipeline import VoicePipeline


class AgentProcessor:
    """
    Processes audio chunks and manages the complete agent interaction flow
    """

    def __init__(self, call_session_id: str, pipeline: VoicePipeline, websocket=None):
        self.call_session_id = call_session_id
        self.pipeline = pipeline
        self.websocket = websocket
        self.backend_client = httpx.AsyncClient(timeout=30.0)
        
        # Metrics
        self.metrics = {
            "total_turns": 0,
            "interruptions": 0,
            "escalations": 0,
        }
        
        # Set up pipeline callbacks
        self.pipeline.set_callbacks(
            on_text=self._on_transcription,  # User speech transcription
            on_response=self._on_llm_response,  # Agent text response
            on_audio=self._on_audio_response,  # Agent audio response
        )

    async def process_audio_chunk(self, audio_payload: str):
        """Process incoming audio chunk"""
        await self.pipeline.process_audio_chunk(audio_payload)
    
    async def process_text_input(self, text: str):
        """Process text input directly (fallback mode)"""
        logger.info(f"Processing text input: {text}")
        # Send user message back to frontend
        if self.websocket:
            try:
                await self.websocket.send_json({
                    "type": "transcription",
                    "text": text,
                    "timestamp": asyncio.get_event_loop().time(),
                })
            except Exception as e:
                logger.error(f"Error sending text transcription: {e}")
        
        # Process through LLM pipeline
        try:
            import time
            start_time = time.time()
            
            # Get agent response
            response_text = await self.pipeline.llm_service.generate_response(text)
            
            llm_latency = (time.time() - start_time) * 1000
            
            if response_text:
                # Send LLM response text to frontend
                if self.websocket:
                    try:
                        await self.websocket.send_json({
                            "type": "response",
                            "text": response_text,
                            "latency": llm_latency,
                            "timestamp": asyncio.get_event_loop().time(),
                        })
                    except Exception as e:
                        logger.error(f"Error sending LLM response: {e}")
                
                # Convert response to audio
                await self.pipeline._text_to_speech(response_text)
        except Exception as e:
            logger.error(f"Error processing text input: {e}")

    async def _on_transcription(self, text: str):
        """Callback when transcription is received"""
        # Send transcription back to frontend via WebSocket
        if self.websocket:
            try:
                await self.websocket.send_json({
                    "type": "transcription",
                    "text": text,
                    "timestamp": asyncio.get_event_loop().time(),
                })
            except (ConnectionError, RuntimeError, Exception) as e:
                # WebSocket might be closed - log but don't crash
                logger.warning(f"Could not send transcription (WebSocket may be closed): {e}")
                # Don't raise - just log the error
        
        # Save transcript to backend (optional)
        try:
            await self.backend_client.post(
                f"{settings.BACKEND_API_URL}/calls/{self.call_session_id}/transcripts",
                json={
                    "speaker": "user",
                    "text": text,
                },
            )
        except Exception as e:
            logger.debug(f"Backend not available for transcript save: {e}")

    async def _on_llm_response(self, response_text: str, latency: float):
        """Callback when LLM text response is generated"""
        # Send LLM response text back to frontend via WebSocket
        if self.websocket:
            try:
                await self.websocket.send_json({
                    "type": "response",
                    "text": response_text,
                    "latency": latency,
                    "timestamp": asyncio.get_event_loop().time(),
                })
            except (ConnectionError, RuntimeError, Exception) as e:
                # WebSocket might be closed - log but don't crash
                logger.warning(f"Could not send LLM response (WebSocket may be closed): {e}")
                # Don't raise - just log the error
    
    async def _on_audio_response(self, audio_base64: str):
        """Callback when audio response is generated"""
        # Send audio back to frontend via WebSocket
        if self.websocket:
            try:
                await self.websocket.send_json({
                    "type": "audio",
                    "audio": audio_base64,
                    "timestamp": asyncio.get_event_loop().time(),
                })
            except (ConnectionError, RuntimeError, Exception) as e:
                # WebSocket might be closed - log but don't crash
                logger.warning(f"Could not send audio (WebSocket may be closed): {e}")
                # Don't raise - just log the error
        
        logger.debug(f"Generated audio response for session: {self.call_session_id}")

    async def handle_call_start(self):
        """Handle call start event"""
        logger.info(f"Call started: {self.call_session_id}")
        # Update call status in backend
        try:
            await self.backend_client.patch(
                f"{settings.BACKEND_API_URL}/calls/{self.call_session_id}",
                json={"status": "in-progress"},
            )
        except Exception as e:
            logger.error(f"Error updating call status: {e}")

    async def handle_call_end(self):
        """Handle call end event"""
        logger.info(f"Call ended: {self.call_session_id}")
        
        # Get final metrics
        pipeline_metrics = self.pipeline.get_metrics()
        
        # Update call in backend with metrics
        try:
            await self.backend_client.patch(
                f"{settings.BACKEND_API_URL}/calls/{self.call_session_id}",
                json={
                    "status": "completed",
                    "latency": pipeline_metrics,
                    "interruptions": self.metrics["interruptions"],
                    "escalations": self.metrics["escalations"],
                },
            )
        except Exception as e:
            logger.error(f"Error updating call metrics: {e}")

    def get_metrics(self) -> Dict:
        """Get processing metrics"""
        pipeline_metrics = self.pipeline.get_metrics()
        return {
            **pipeline_metrics,
            "total_turns": self.metrics["total_turns"],
            "interruptions": self.metrics["interruptions"],
            "escalations": self.metrics["escalations"],
        }
