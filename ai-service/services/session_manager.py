"""
Session Manager
Manages active call sessions
"""

import logging
from typing import Dict, Optional
from loguru import logger


class SessionManager:
    """
    Manages active WebSocket sessions and their associated resources
    """

    def __init__(self):
        self.sessions: Dict[str, Dict] = {}

    def register_session(self, call_session_id: str, session_data: Dict):
        """Register a new session"""
        self.sessions[call_session_id] = session_data
        logger.info(f"Session registered: {call_session_id} (Total: {len(self.sessions)})")

    def unregister_session(self, call_session_id: str):
        """Unregister a session"""
        if call_session_id in self.sessions:
            del self.sessions[call_session_id]
            logger.info(f"Session unregistered: {call_session_id} (Total: {len(self.sessions)})")

    def get_session(self, call_session_id: str) -> Optional[Dict]:
        """Get session data"""
        return self.sessions.get(call_session_id)

    def get_active_session_count(self) -> int:
        """Get number of active sessions"""
        return len(self.sessions)
