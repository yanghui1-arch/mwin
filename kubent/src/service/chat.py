import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
_BASE_URL = os.getenv("BASE_URL") or os.getenv("base_url")
_API_KEY = os.getenv("API_KEY") or os.getenv("api_key")
_OPENAI_CLIENT_KWARGS: dict[str, str] = {}
if _BASE_URL:
    _OPENAI_CLIENT_KWARGS["base_url"] = _BASE_URL
if _API_KEY:
    _OPENAI_CLIENT_KWARGS["api_key"] = _API_KEY

TITLE_PROMPT = (
    "You are good at summarizing user's question in a simple and clear way. "
    "Your response should be as possible as less but more clear"
)


def title(message: str):
    openai_client: OpenAI = OpenAI(**_OPENAI_CLIENT_KWARGS)
    model = "openai/gpt-oss-120b:free"
    completion = openai_client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": TITLE_PROMPT},
            {"role": "user", "content": message},
        ],
    )
    return completion.choices[0].message.content
