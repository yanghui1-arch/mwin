from uuid import UUID
from typing import List, Dict, Any
from src.repository.db.conn import AsyncSessionLocal
from src.repository import kubent_chat


async def add_chat(
    session_id:UUID,
    user_id:UUID,
    messages:List[Dict[str, Any]],
    agent_name: str,
):
    async with AsyncSessionLocal() as db:
        for message in messages:
            role = message.get("role", None)
            if role is None:
                raise ValueError("[DB] Failed to store chats because no role.")

            await kubent_chat.create_new_chat(
                db=db,
                session_id=session_id,
                user_id=user_id,
                role=message.get("role"),
                payload=message,
                agent_name=agent_name,
            )
            await db.commit()