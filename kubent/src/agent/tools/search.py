from typing import Callable
from pydantic import BaseModel, Field
from openai import pydantic_function_tool
from openai.types.chat import ChatCompletionFunctionToolParam
from mwin import track, StepType
from .toolkits import Tool

@track(StepType.TOOL)
def search_google(keyword, limit=2):
    ...

class SearchGoogleParams(BaseModel):
    keyword: str = Field(..., description="Search keyword.")

class SearchGoogle(Tool):
    func:Callable = search_google
    type:str = "search"
    json_schema:ChatCompletionFunctionToolParam = pydantic_function_tool(SearchGoogleParams, name="search_google", description="Search something with keyword on google.")

if __name__ == "__main__":
    print(SearchGoogle())