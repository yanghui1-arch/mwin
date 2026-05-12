import os
from typing import Callable


from dotenv import load_dotenv
from pydantic import BaseModel, Field
from openai import pydantic_function_tool
from openai import OpenAI
from openai.types.chat import ChatCompletionFunctionToolParam
from mwin import track, StepType


from .toolkits import Tool
from ...config import config


load_dotenv()
_BASE_URL = os.getenv("OPENAI_BASE_URL")
_API_KEY = os.getenv("OPENAI_API_KEY")
_OPENAI_CLIENT_KWARGS: dict[str, str] = {}
if _BASE_URL:
    _OPENAI_CLIENT_KWARGS["base_url"] = _BASE_URL
if _API_KEY:
    _OPENAI_CLIENT_KWARGS["api_key"] = _API_KEY

model = config.get("tool.websearch", "gpt-5.4")
web_engine = OpenAI(**_OPENAI_CLIENT_KWARGS)


def web_search(keyword: str):
    try:
        stream = web_engine.responses.create(
            model=model,
            tools=[{"type": "web_search"}],
            reasoning={"effort": "high"},
            instructions=(
                "You are good at web search. Return the relevant facts you found online, "
                "include concise source references, and summarize the result."
            ),
            input=f"Search for {keyword} and summarize the latest useful findings.",
            # openai web search consumes lots of time using stream decreases the error rate of connection
            stream=True
        )
        content = ""
        for event in stream:
            event_type = event.type
            if event_type == "response.output_text.delta":
                content += event.delta if event.delta is not None else ""
            elif event_type == "response.failed":
                raise RuntimeError("Connection Error")
            elif event_type == "error":
                raise RuntimeError("Stream error: ", event)
        return content
    
    except Exception as exc:
        return f"Web search failed: {exc}"


class WebSearchParams(BaseModel):
    keyword: str = Field(..., description="Search keyword.")

class WebSearch(Tool):
    func:Callable = web_search
    type:str = "search"
    json_schema:ChatCompletionFunctionToolParam = pydantic_function_tool(
        WebSearchParams, 
        name="web_search", 
        description="Search related content given a keyword." \
        "If you need to search online to get the latest information, you should call this function" \
        "WebSearch adapts agentic-websearch solution. You will get the markdown of searching content and a summary from an agent."
    )

if __name__ == "__main__":
    print(WebSearch())
    print(web_search("最新的RAG Agent 电话客服 主流性能指标"))
