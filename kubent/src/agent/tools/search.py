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
QWEN_BASE_URL = os.environ.get("qwen_base_url", None)
QWEN_API_KEY = os.environ.get("qwen_api_key", None)

assert QWEN_BASE_URL is not None, "qwen_base_url is not set in .env"
assert QWEN_API_KEY  is not None, "qwen_api_key is not set in .env"

model = config.get("tool.websearch", "qwen3-max")
web_engine = OpenAI(**{
    "base_url": QWEN_BASE_URL,
    "api_key": QWEN_API_KEY
})


@track(StepType.TOOL)
def web_search(keyword):
    search_strategy = "agent_max"
    forced_search = True

    stream = web_engine.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "You are good at web search. You have to return the original content from searched websites and finally give user a summary based on the content."},
            {"role": "user", "content": f"I want to search {keyword}. Please fetch online and tell me the result."},
        ],
        extra_body={
            "enable_thinking": True,
            "enable_search": True,
            "search_options": {
                "search_strategy": search_strategy,
                "forced_search": forced_search,
            }
        },
        # not support non-stream.
        stream=True,
        stream_options={"include_usage": True}
    )

    final_res = ""
    for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            final_res += chunk.choices[0].delta.content

    return final_res


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
    web_search("RAG Agent 电话客服 主流性能指标")