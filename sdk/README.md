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
cd sdk
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
Finally use `@track` to track your llm input and output.

## Quick Start
```python
from mwin import track
from openai import OpenAI

openai_apikey = "<llm_api_key>"
openai_base_url = "<llm_base_url>"
model = "<llm_model>"

@track()
def run_agent(prompt: str):
    cli = OpenAI(base_url=openai_base_url, api_key=openai_apikey)
    content = cli.chat.completions.create(
        messages=[{"role": "user", "content": f"{prompt}"}],
        model=model
    ).choices[0].message.content
    return content

run_agent("hello, mwin.")
```

## Using start_trace() to manually set the trace scope
It's the most recommended method to use mwin to track the trace in a project. mwin offers two context manager to make trace scope more clear. It's very easy to use and not breaking change your current project code. Using `start_trace_async()` for async context manager. The usage of them is both same.

### Demo
```python
from mwin import track, start_trace
from openai import OpenAI

openai_apikey = "<llm_api_key>"
openai_base_url = "<llm_base_url>"
model = "<llm_model>"

@track(step_type="tool")
def execute_bash(command: str):
    # assume execute bash and get a stdout
    return "<bash_stdout>"

@track()
def run_agent(prompt: str):
    cli = OpenAI(base_url=openai_base_url, api_key=openai_apikey)
    content = cli.chat.completions.create(
        messages=[{"role": "user", "content": f"{prompt}"}],
        model=model
    ).choices[0].message.content
    if "bash" in content:
        res = execute_bash(content)
        return res
    return content

@track()
def query_for_information(stmt: str) -> str:
    ...

with start_trace():
    info = query_for_information("mwin")
    run_agent()
```

# Using mwin in production

Wrap each submitted unit of work in an explicit root trace. Nested `@track`
calls then share that trace and the root scope freezes exactly one snapshot.


## Basic usage
Track the complete trace of agent or LLM explictly.
Assume you have a `question-answer agent` and it goes through three steps.
You want to track what it does in the whole trace and improve it in the later.
You can use mwin like this.

```python
from mwin import start_trace

@track()
def QA_agent_run(*args):
    agent_step_1()
    agent_step_2()
    agent_step_3()

def run(*args):
    with start_trace(name="QA-Agent-work-trace"):
        QA_agent_run(args)
```

## Adavanced usage

If you are developing application with `FastAPI` and it's hassle for every routes with `start_trace`.
You can use `MwinTraceMiddleware`. Then you don't need to write `start_trace` in every request.
```python
from fastapi import FastAPI
from mwin.integrations import MwinTraceMiddleware

app = FastAPI()
app.add_middleware(MwinTraceMiddleware)
```

Sometimes one trace is very long and developers want to split it into several sub-traces. It's also ok with mwin.
Here is a simple production line inspection workflow. mwin will create three traces. The root trace is `production-line-inspection` and two sub-traces are attatched to the root trace.
```python
from mwin import track

@track()
def incoming_quality_control(*args):
    pass

@track()
def first_article_inspection(*args):
    pass

@track()
def automated_optical_inspection(*args):
    pass

@track()
def production_line_inspection(*args, **kwargs):
    with start_trace(name="product-inspection"):
        incoming_quality_control(args)
        first_article_inspection(args)
    
    with start_trace(name="online-inspection"):
        automated_optical_inspection(args)

def run(*args, **kwargs):
    with start_trace(name="production-line-inspection"):
        production_line_inspection(args, kwargs)
```

# Development
Mwin project package manager is uv. If you are a beginner uver, please click uv link: [uv official link](https://docs.astral.sh/uv/guides/projects/#creating-a-new-project)
```bash
uv sync
uv .venv/Script/activate
```
You can watch more detailed debug information by using `--log-level=DEBUG` or `set AT_LOG_LEVEL=DEBUG` for Windows or `export AT_LOG_LEVEL=DEBUG` for Linux and Mac.
