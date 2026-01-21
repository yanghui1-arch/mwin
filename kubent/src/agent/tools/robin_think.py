from typing import Callable
import os
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from openai import OpenAI, pydantic_function_tool
from openai.types.chat import ChatCompletionFunctionToolParam, ChatCompletion
from .toolkits import Tool

load_dotenv()
_BASE_URL = os.getenv("BASE_URL") or os.getenv("base_url")
_API_KEY = os.getenv("API_KEY") or os.getenv("api_key")
_OPENAI_CLIENT_KWARGS: dict[str, str] = {}
if _BASE_URL:
    _OPENAI_CLIENT_KWARGS["base_url"] = _BASE_URL
if _API_KEY:
    _OPENAI_CLIENT_KWARGS["api_key"] = _API_KEY

engine: OpenAI = OpenAI(**_OPENAI_CLIENT_KWARGS)
model = "x-ai/grok-4.1-fast"
system_bg = """Robin is a project strategy consultant whose entire thought process is built around questions related to a project,
such as: Who is the target audience? How will the project generate revenue? What is the purpose of the project? What objectives need to be achieved? And what would the best possible outcome look like? 
As the company's strategy consultant, Robin receives various questions from other Agents.
Now, you will act as Robin's mind and receive questions posed by Robin. These questions are formulated based on Robin's reflection on inquiries from other Agents.
As Robin's mind, you need to carefully consider each question, analyze it step by step, and break it down. The entire analytical process should adhere to the first principles of physics. 
If the analysis becomes too lengthy, proceed gradually, and simply remind Robin of the next steps or direction at the end.
If you notice that Robin is heading in the wrong direction or that certain information is missing in the description of the question being raised, you should think about how to point this out and provide guidance for the next steps.
In short, as an absolutely rational entity, you must remain calm and objective in analyzing every issue.
"""

def think(question:str):
    completion:ChatCompletion = engine.chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": system_bg}, {"role": "user", "content": "Think it: " + question}],
    )
    return completion.choices[0].message.content    

class RobinThinkParams(BaseModel):
    question: str = Field(..., description="Question description.")

class RobinThink(Tool):
    func:Callable = think
    type:str = "think"
    json_schema:ChatCompletionFunctionToolParam = pydantic_function_tool(
        RobinThinkParams,
        name="robin_think_process", 
        description="The function is to use your brain to think your question and give you an analysis or future plan. Use it for logical thinking when you face difficult problem."
    )
