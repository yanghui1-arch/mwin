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
    llm_provider=LLMProvider.OPENAI,    
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
    llm_provider=LLMProvider.OPENAI,
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

# Using mwin with Thread Pools

When your program uses `ThreadPoolExecutor`, `multiprocessing.pool.ThreadPool`, or similar thread pools, you need to be aware of how mwin traces work with thread reuse.

The correct solution is to use `contextvars.copy_context()`. Wrap your submitted task with `copy_context().run()` to give each task an isolated context:

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

## Example: FastAPI with ThreadPoolExecutor

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

## When you don't need this

- **Simple scripts**: one execution = one trace, no thread reuse.
- **Celery**: mwin auto-clears the trace via `task_prerun` signal. No action needed.
- **New `threading.Thread`**: each new thread gets a context copy on creation. No issue.

## Summary

| Scenario | Action needed |
|---|---|
| Simple script | None |
| Celery tasks | None (auto-handled) |
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