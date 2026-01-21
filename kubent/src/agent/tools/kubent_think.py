from typing import Callable
import os
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from openai import OpenAI, pydantic_function_tool
from openai.types.chat import ChatCompletionFunctionToolParam, ChatCompletion
from .toolkits import Tool
from ...config import model_config

load_dotenv()
_BASE_URL = os.getenv("BASE_URL") or os.getenv("base_url")
_API_KEY = os.getenv("API_KEY") or os.getenv("api_key")
_OPENAI_CLIENT_KWARGS: dict[str, str] = {}
if _BASE_URL:
    _OPENAI_CLIENT_KWARGS["base_url"] = _BASE_URL
if _API_KEY:
    _OPENAI_CLIENT_KWARGS["api_key"] = _API_KEY

engine: OpenAI = OpenAI(**_OPENAI_CLIENT_KWARGS)
model = model_config.get("kubent.think.model", "x-ai/grok-4.1-fast")

system_bg = """You are the brain of Kubent. Kubent is a useful assistant to keep improve agent performance better.
You are the best thinker. 
User will ask you a question. Think carefully about this question and tell him/her the thinking process and the results.
"""

def think(question:str):
    completion:ChatCompletion = engine.chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": system_bg}, {"role": "user", "content": "Think it: " + question}],
    )
    return completion.choices[0].message.content    

class KubentThinkParams(BaseModel):
    question: str = Field(..., description="Question description.")

class KubentThink(Tool):
    func:Callable = think
    type:str = "think"
    json_schema:ChatCompletionFunctionToolParam = pydantic_function_tool(
        KubentThinkParams, 
        name="think_process", 
        description="Use your brain to think question and give response."
    )
