"""
GPU Pool Management
Manages shared GPU inference pools with queue-based routing
"""

import asyncio
from typing import Optional, Dict, List
from dataclasses import dataclass
from enum import Enum
from loguru import logger
import time


class CallPriority(Enum):
    ENTERPRISE = 1
    PRO = 2
    FREE = 3


@dataclass
class QueuedCall:
    call_session_id: str
    priority: CallPriority
    queued_at: float
    organization_id: str
    agent_id: str


class GPUPool:
    """
    Manages GPU inference pool with priority-based queuing
    Routes calls to available GPU workers
    """

    def __init__(self, max_workers: int = 5, queue_timeout: int = 300):
        self.max_workers = max_workers
        self.queue_timeout = queue_timeout
        self.active_workers = 0
        self.call_queue: List[QueuedCall] = []
        self.active_calls: Dict[str, str] = {}  # call_session_id -> worker_id
        self.worker_status: Dict[str, bool] = {}  # worker_id -> available

    async def enqueue_call(
        self,
        call_session_id: str,
        organization_id: str,
        agent_id: str,
        priority: CallPriority = CallPriority.FREE,
    ) -> bool:
        """Add call to queue"""
        queued_call = QueuedCall(
            call_session_id=call_session_id,
            priority=priority,
            queued_at=time.time(),
            organization_id=organization_id,
            agent_id=agent_id,
        )

        # Insert based on priority
        inserted = False
        for i, existing_call in enumerate(self.call_queue):
            if priority.value < existing_call.priority.value:
                self.call_queue.insert(i, queued_call)
                inserted = True
                break

        if not inserted:
            self.call_queue.append(queued_call)

        logger.info(
            f"Call {call_session_id} queued (priority: {priority.name}, position: {len(self.call_queue)})"
        )

        # Try to process immediately
        await self._process_queue()

        return True

    async def _process_queue(self):
        """Process queued calls when workers available"""
        while self.call_queue and self.active_workers < self.max_workers:
            # Get highest priority call
            call = self.call_queue.pop(0)

            # Check timeout
            if time.time() - call.queued_at > self.queue_timeout:
                logger.warning(f"Call {call.call_session_id} timed out in queue")
                continue

            # Assign to worker
            worker_id = await self._assign_worker(call.call_session_id)
            if worker_id:
                self.active_calls[call.call_session_id] = worker_id
                self.active_workers += 1
                logger.info(
                    f"Call {call.call_session_id} assigned to worker {worker_id}"
                )
            else:
                # No worker available, re-queue
                self.call_queue.insert(0, call)
                break

    async def _assign_worker(self, call_session_id: str) -> Optional[str]:
        """Assign call to available worker"""
        # Find available worker
        for worker_id, available in self.worker_status.items():
            if available:
                self.worker_status[worker_id] = False
                return worker_id

        # No worker available
        return None

    async def release_worker(self, call_session_id: str):
        """Release worker when call completes"""
        if call_session_id in self.active_calls:
            worker_id = self.active_calls.pop(call_session_id)
            self.worker_status[worker_id] = True
            self.active_workers -= 1
            logger.info(f"Worker {worker_id} released from call {call_session_id}")

            # Process next queued call
            await self._process_queue()

    def register_worker(self, worker_id: str):
        """Register a GPU worker"""
        self.worker_status[worker_id] = True
        logger.info(f"GPU worker {worker_id} registered")

    def get_queue_status(self) -> Dict:
        """Get queue status"""
        return {
            "queue_length": len(self.call_queue),
            "active_workers": self.active_workers,
            "max_workers": self.max_workers,
            "available_workers": sum(1 for v in self.worker_status.values() if v),
            "queued_calls": [
                {
                    "call_session_id": call.call_session_id,
                    "priority": call.priority.name,
                    "wait_time": time.time() - call.queued_at,
                }
                for call in self.call_queue[:10]  # Top 10
            ],
        }

    def get_priority_for_organization(self, organization_id: str) -> CallPriority:
        """Determine priority based on organization plan"""
        # This would query database in production
        # For now, return based on organization ID pattern
        if organization_id.startswith("ent_"):
            return CallPriority.ENTERPRISE
        elif organization_id.startswith("pro_"):
            return CallPriority.PRO
        else:
            return CallPriority.FREE


# Global GPU pool instance
gpu_pool = GPUPool(max_workers=5)
