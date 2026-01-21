# Kubent
Kubent is the brain of AITrace which can keep improving your agent system. It consolidate agent workflow and concrete task type to give user a correct and effiency answer whatever in time or money.

# Quickstart
1. Copy .envcopy to a new file named .env in current directory. Then write your base_url and api_key. 

1. Start three server as follows.
## Kubent server
```bash
PS D:\workspace\codes\python\AT\kubent> .venv/Scripts/activate
(kubent) PS D:\workspace\codes\python\AT\kubent> uvicorn src.api.main:app --reload
```
## Agentic tool server
```bash
PS D:\workspace\codes\python\AT\kubent> .venv/Scripts/activate
(kubent) PS D:\workspace\codes\python\AT\kubent> uvicorn src.agent_api.main:app --port 20261 --reload
```
## Celery server
```bash
PS D:\workspace\codes\python\AT\kubent> .venv/Scripts/activate
(kubent) PS D:\workspace\codes\python\AT\kubent> celery -A src.kubent_celery.celery_app worker --pool=solo --loglevel=info
```