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
Finally use `@track` to track your llm input and output.

## The simplest Demo
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

# Using mwin with Thread Pools
**If you are using `with start_trace()` or `async with start_trace_async()` Skip this part.**


When your program uses `ThreadPoolExecutor`, `multiprocessing.pool.ThreadPool`, or similar thread pools, and you wouldn't like to use `start_trace()` and `start_trace_async()` you have to be aware of how mwin traces work with thread reuse.

The correct solution is to use `contextvars.copy_context()`. Wrap your submitted task with `copy_context().run()` to give each task an isolated context. The trace is probably record unexpectedly without `contextvars.copy_context()`.
```python
import contextvars
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=10)

# Without fix — trace leaks between tasks on the same thread
executor.submit(run_agent)

# With fix — each task gets a clean, isolated context
ctx = contextvars.copy_context()
executor.submit(ctx.run, run_agent)
```

`ctx.run(run_agent)` creates a context sandbox: all `ContextVar` operations inside it go to `ctx`, not to the thread's persistent context. When `ctx.run()` returns, `ctx` is garbage collected along with its trace.

### Example: FastAPI with ThreadPoolExecutor

```python
import asyncio
import contextvars
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=10)

@app.post("/chat")
async def chat_handler(request: Request):
    loop = asyncio.get_running_loop()

    def run_agent():
        agent_step_1()   # @track — creates trace, shares it
        agent_step_2()   # @track — reuses same trace
        agent_step_3()   # @track — reuses same trace

    ctx = contextvars.copy_context()
    loop.run_in_executor(executor, ctx.run, run_agent)
```

### Conditions you have to notice

| Scenario | Action needed |
|---|---|
| scripts | None |
| Celery tasks | None (auto-handled) |
| fastapi using async not sync| None |
| `threading.Thread` | None |
| `ThreadPoolExecutor` | Use `copy_context().run()` |
| `asyncio.loop.run_in_executor` | Use `copy_context().run()` |
| `multiprocessing.pool.ThreadPool` | Use `copy_context().run()` |
| `ProcessPoolExecutor` | None (separate processes) |

# Development
Mwin project package manager is uv. If you are a beginner uver, please click uv link: [uv official link](https://docs.astral.sh/uv/guides/projects/#creating-a-new-project)
```bash
uv sync
uv .venv/Script/activate
```
You can watch more detailed debug information by using `--log-level=DEBUG` or `set AT_LOG_LEVEL=DEBUG` for Windows or `export AT_LOG_LEVEL=DEBUG` for Linux and Mac.