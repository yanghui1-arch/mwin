from fastapi import FastAPI
from .router import api_router
from .router import server_router

app = FastAPI()
app.include_router(router=api_router)
app.include_router(router=server_router)