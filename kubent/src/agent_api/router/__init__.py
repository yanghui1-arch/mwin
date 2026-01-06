from fastapi import APIRouter
from .robin import robin_server_router

root_router = APIRouter(prefix="/kubent/extentions")
root_router.include_router(router=robin_server_router)

__all__ = [
    "root_router",
]