"""
Voice Agent AI Service
Handles real-time voice processing using NVIDIA models and Pipecat framework
"""

import asyncio
import json
import logging
from typing import Dict, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from loguru import logger

from services.voice_pipeline import VoicePipeline
from services.agent_processor import AgentProcessor
from services.session_manager import SessionManager
from services.gpu_pool import gpu_pool, CallPriority
from config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger.add("logs/voice_service.log", rotation="10 MB")

app = FastAPI(title="Voice Agent AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global session manager
session_manager = SessionManager()


@app.websocket("/stream/{call_session_id}")
async def websocket_endpoint(websocket: WebSocket, call_session_id: str):
    """
    WebSocket endpoint for real-time audio streaming
    Receives audio chunks from Twilio and processes them through the voice pipeline
    """
    await websocket.accept()
    logger.info(f"WebSocket connection established for call session: {call_session_id}")
    
    # Set WebSocket timeout to prevent keepalive issues
    # FastAPI/Starlette WebSocket doesn't have direct timeout, but we can handle it in the loop

    try:
        # Get organization priority for GPU queue
        # In production, query from backend API
        priority = CallPriority.FREE  # Default, would query from backend
        
        # Enqueue call in GPU pool
        await gpu_pool.enqueue_call(
            call_session_id,
            organization_id="",  # Would get from backend
            agent_id="",  # Would get from backend
            priority=priority,
        )

        # Initialize voice pipeline for this session
        pipeline = VoicePipeline(call_session_id)
        await pipeline.initialize()

        # Create agent processor
        agent_processor = AgentProcessor(call_session_id, pipeline, websocket)

        # Register session
        session_manager.register_session(call_session_id, {
            "websocket": websocket,
            "pipeline": pipeline,
            "processor": agent_processor,
        })

        # Main processing loop
        while True:
            try:
                # Receive message from client
                data = await websocket.receive_json()
                
                if data.get("event") == "media":
                    # Process audio chunk
                    audio_payload = data.get("media", {}).get("payload")
                    if audio_payload:
                        await agent_processor.process_audio_chunk(audio_payload)
                
                elif data.get("event") == "start":
                    logger.info(f"Call started: {call_session_id}")
                    await agent_processor.handle_call_start()
                
                elif data.get("event") == "stop":
                    logger.info(f"Call ended: {call_session_id}")
                    await agent_processor.handle_call_end()
                    break
                
                elif data.get("event") == "text":
                    # Handle text input from frontend
                    text = data.get("text", "")
                    if text:
                        await agent_processor.process_text_input(text)

            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected: {call_session_id}")
                break
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                await websocket.send_json({
                    "error": str(e),
                    "type": "error"
                })

    except Exception as e:
        logger.error(f"Error in WebSocket handler: {e}")
    finally:
        # Cleanup
        session_manager.unregister_session(call_session_id)
        if pipeline:
            await pipeline.cleanup()
        
        # Release GPU worker
        await gpu_pool.release_worker(call_session_id)
        
        logger.info(f"Session cleaned up: {call_session_id}")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    queue_status = gpu_pool.get_queue_status()
    return {
        "status": "healthy",
        "service": "voice-agent-ai",
        "active_sessions": session_manager.get_active_session_count(),
        "gpu_pool": queue_status,
    }


@app.get("/sessions/{call_session_id}/status")
async def get_session_status(call_session_id: str):
    """Get status of a call session"""
    session = session_manager.get_session(call_session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "call_session_id": call_session_id,
        "status": "active",
        "metrics": session.get("processor", {}).get_metrics() if "processor" in session else {},
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        log_level="info",
        reload=settings.DEBUG,
    )
