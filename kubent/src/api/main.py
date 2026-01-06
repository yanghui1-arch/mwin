from fastapi import FastAPI
from .router import api_router

app = FastAPI()
app.include_router(router=api_router)