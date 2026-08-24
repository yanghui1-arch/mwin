<!-- <p align="center"><img src='./images/logo.webp'/></p> -->

# mwin
mwin: Track OpenAI, Claude, Gemini and OpenAI-compatible models then give solutions to improve your agent system.<br/>
Our goal is to make llm application more valuable and effortlessly improve llm capabilities.

# Quickstart
It's very easy to use. mwin offers cloud server and support local deployment. Strongly recommend to use cloud server first.

## Cloud Server
First install mwin sdk.
```bash
pip install mwin

# If use uv
uv add mwin
```

Then configure mwin.
```bash
mwin configure
```
Terminal shows
```bash
1 - mwin Cloud Platform (default)
2 - mwin Local Platform
Please input the choice number.>
```
select mwin Cloud Platform
Then you need to login our web to get api key. [Click this](https://aitrace-cloudflare-backend.mwin-172f8144.workers.dev)
After getting api-key then the last step is to configure it.

Calls mwin sdk in your project like this:
```python
from openai import OpenAI
from mwin import track

api_key = "<your-model-api-key>"
base_url = "<model-base-url>"
client = OpenAI(api_key=api_key, base_url=base_url)

@track(project_name="mwin-test", step_type="llm")
def step(messages):
    completion = client.chat.completions.create(
        messages=messages,
        model="deepseek-v4-flash"
    )
    return completion

messages = [{"role": "user", "content": "Which model are you?"}]
completion = step(messages)
message = completion.choices[0].message
print(message)
```
Execute the python script then you can inspect them in our web.

More sdk usage and best practice please click [Best Practice of mwin](./sdk/README.md)