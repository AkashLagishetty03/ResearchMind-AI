import asyncio
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class StreamManager:
    """Manages real-time message broadcasting for agents, tools, and node state updates."""
    _queues: Dict[int, asyncio.Queue] = {}

    @classmethod
    def get_queue(cls, session_id: int) -> asyncio.Queue:
        """Retrieve or create the event queue for a specific research session."""
        if session_id not in cls._queues:
            cls._queues[session_id] = asyncio.Queue()
            logger.info(f"Created event queue for session {session_id}")
        return cls._queues[session_id]

    @classmethod
    def remove_queue(cls, session_id: int):
        """Clean up the queue after session completion or abort."""
        if session_id in cls._queues:
            del cls._queues[session_id]
            logger.info(f"Removed event queue for session {session_id}")

    @classmethod
    async def publish(cls, session_id: int, event_type: str, data: Any):
        """Publish a real-time event to the session queue."""
        if session_id in cls._queues:
            logger.debug(f"Publishing {event_type} to session {session_id}")
            await cls._queues[session_id].put({
                "event": event_type,
                "data": data
            })
