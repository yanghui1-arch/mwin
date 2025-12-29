# mwin
mwin: Track OpenAI, Claude, Gemini and OpenAI-compatible models then give solutions to improve your agent system.<br/>
Our goal is to make llm application more valuable and effortlessly improve llm capabilities.

# Quickstart
You can use pip install mwin
```bash
pip install mwin
```
OR pip install from source.
```bash
git clone https://github.com/yanghui1-arch/mwin.git
cd src
pip install -e .
```
Then you need to configure mwin through CLI.
```bash
mwin configure
```
Then you just follow the instructions to configure mwin.
```
> Which deployment type do you choose?
> 1 - mwin Cloud Platform (default)
> 2 - mwin Local Platform
> Please input the choice number.>2
> Please enter your API key:
> What's your project name? mwin-demo
> Congrats to configure mwin.
```
It needs an Mwin API key. You can get the apikey after logging `http://localhost:5173`.
Finally use `@track` to track your llm input and output
```python
from mwin import track, LLMProvider
from openai import OpenAI

openai_apikey = 'YOUR API KEY'

@track(
    tags=['test', 'demo'],
    track_llm=LLMProvider.OPENAI,    
)
def llm_classification(film_comment: str):
    prompt = "Please classify the film comment into happy, sad or others. Just tell me result. Don't output anything."
    cli = OpenAI(base_url='https://api.deepseek.com', api_key=openai_apikey)
    cli.chat.completions.create(
        messages=[{"role": "user", "content": f"{prompt}\nfilm_comment: {film_comment}"}],
        model="deepseek-chat"
    ).choices[0].message.content
    llm_counts(film_comment=film_comment)
    return "return value"

@track(
    tags=['test', 'demo', 'second_demo'],
    track_llm=LLMProvider.OPENAI,
)
def llm_counts(film_comment: str):
    prompt = "Count the film comment words. just output word number. Don't output anything others."
    cli = OpenAI(base_url='https://api.deepseek.com', api_key=openai_apikey)
    return cli.chat.completions.create(
        messages=[{"role": "user", "content": f"{prompt}\nfilm_comment: {film_comment}"}],
        model="deepseek-chat"
    ).choices[0].message.content

llm_classification("Wow! It sucks.")
```

# Development
Mwin project package manager is uv. If you are a beginner uver, please click uv link: [uv official link](https://docs.astral.sh/uv/guides/projects/#creating-a-new-project)
```bash
uv sync
uv .venv/Script/activate
```
You can watch more detailed debug information by using `--log-level=DEBUG` or `set AT_LOG_LEVEL=DEBUG` for Windows or `export AT_LOG_LEVEL=DEBUG` for Linux and Mac.