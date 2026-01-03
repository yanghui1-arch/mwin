from fastapi import APIRouter
from .chat import chat_router
from .query import query_router
from .robin import robin_server_router

api_router = APIRouter(prefix="/kubent/api")
api_router.include_router(router=chat_router)
api_router.include_router(router=query_router)

server_router = APIRouter(prefix="/kubent/extentions")
server_router.include_router(router=robin_server_router)

__all__ = [
    "api_router",
    "server_router",
]