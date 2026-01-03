"""Robin's server is offered by a http server"""
from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from openai.types.chat import ChatCompletionMessageParam
from ..schemas import ResponseModel
from ..schemas.robin import ConsultRequest, ConsultResponse
from ...env import Env
from ...agent.robin import Robin, Result as RobinResult
from ...repository.kubent_chat import query_chat
from ...repository.project import query_project
from ...repository.models import Project, KubentChat, KubentChatSession
from ...repository.db.conn import get_db

robin_server_router = APIRouter(prefix="/robin_server")

@robin_server_router.post("/consult")
async def consult(
    req: ConsultRequest,
    db: AsyncSession = Depends(get_db)
):
    user_uuid = req.user_uuid
    session_uuid = req.session_id
    project_name = req.project_name
    agent_name = req.agent_name
    question = req.question
    try:
        user_uuid = UUID(user_uuid)
        session_uuid = UUID(session_uuid)
    except ValueError as value_error:
        return ResponseModel.error(message="Failed to parse UUID. Ensure user_uuid and session_uuid are valid UUID.")
    
    # TODO: limit should be the attempt of agent_name. Add a agent attemps dict to register all agents max attempts.
    agent_chats:List[KubentChat] = await query_chat(
        db=db, session_id=session_uuid, user_id=user_uuid, agent_name=agent_name, limit=25, start_time_desc=True
    )
    agent_chats = agent_chats.sort(key=lambda chat: chat.start_timestamp)

    project: Project | None = await query_project(db=db, user_id=user_uuid, name=project_name)
    if project is None:
        return ResponseModel.error(message=f"Fail to get project because you pass an invalid project name {project_name} which is not owned by {user_uuid}.")

    chat_hist:List[ChatCompletionMessageParam] | None = None
    
    env = Env(env_name="Robin consult.")
    robin = Robin(current_env=env)
    robin_result:RobinResult = robin.run(
        question=question,
        project_name=project_name,
        project_description=project.description,
        project_strategy=project.strategy,
        agent_name=agent_name,
        agent_chats=agent_chats,
        chat_hist=chat_hist,
    )
    consultant: str = robin_result.answer
    # TODO: to implement a work context using file system.
    return ResponseModel.success(data=ConsultResponse(message=consultant))
    
