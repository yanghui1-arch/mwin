from fastapi import APIRouter
from .chat import chat_router
from .query import query_router

api_router = APIRouter(prefix="/kubent/api")
api_router.include_router(router=chat_router)
api_router.include_router(router=query_router)

__all__ = [
    "api_router",
    "server_router",
]