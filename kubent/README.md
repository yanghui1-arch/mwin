# Kubent
Kubent is the brain of AITrace which can keep improving your agent system. It consolidate agent workflow and concrete task type to give user a correct and effiency answer whatever in time or money.

# Quickstart
```bash
PS D:\workspace\codes\python\AT\kubent> .venv/Scripts/activate
# Current workers should be 2. But will fix it later cause it doesn't satisfy production enviroment.
(kubent) PS D:\workspace\codes\python\AT\kubent> uvicorn src.api.main:app --workers 2
```