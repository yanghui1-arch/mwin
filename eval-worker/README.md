# Eval-worker
It's a back process in the AT for evaluating the performance of every step and trace. AT hope that using llm-as-judge can evaluate one step's performance and also evaluate a complete chain of trace performance. Eval-worker is created by the principle of design.

# Quick Start
```bash
uv init
uv sync

# activate your uv env
# windows
.venv/Scripts/activate

# linux
source ....

# start process.
uv run main.py
```