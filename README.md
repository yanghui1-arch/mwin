<!-- <p align="center"><img src='./images/logo.webp'/></p> -->

# mwin
mwin: Track OpenAI, Claude, Gemini and OpenAI-compatible models then give solutions to improve your agent system.<br/>
Our goal is to make llm application more valuable and effortlessly improve llm capabilities.

# Quickstart
Mwin is very easy to start. You need Docker and Docker Compose before deployment. After starting the containers, you can see track contents on web `http://localhost:5173/`.
## Deployment
Start all services with Docker Compose:
```bash
docker compose up --build -d
```

This starts:
- `aitrace-postgres` on `localhost:16432`
- `aitrace-backend` on `localhost:8080`
- `aitrace-web` on `http://localhost:5173/`

The backend stores tracked Base64 images in `/data/mwin/media`. Docker Compose keeps database data and media files in persistent volumes:
- `aitrace_pgdata`
- `aitrace_media`

Stop the deployment with:
```bash
docker compose down
```

If you need to build and run images manually, use these commands:
```bash
docker build -t aitrace-backend .
docker build --target web-runtime -t aitrace-web .
docker build --target postgres -t aitrace-postgres .

docker network create aitrace || true
docker run -d --name aitrace-postgres --network aitrace -p 16432:5432 -v aitrace_pgdata:/var/lib/postgresql/data aitrace-postgres
docker run -d --name aitrace-backend --network aitrace -e SPRING_DATASOURCE_URL=jdbc:postgresql://aitrace-postgres:5432/aitrace -v aitrace_media:/data/mwin/media -p 8080:8080 aitrace-backend
docker run -d --name aitrace-web --network aitrace -p 5173:80 -e BACKEND_HOST=aitrace-backend aitrace-web
```
## Python-sdk
Mwin python sdk need an api key. So you have to be sure that you deploys successfully. Then enter `http://localhost:5173/` to get your api key. <br/>
[Click here to know how to use mwin python-sdk.](sdk/README.md)

# Development
Mwin project package manager is uv. If you are a beginner uver, please click uv link: [uv official link](https://docs.astral.sh/uv/guides/projects/#creating-a-new-project)
```bash
cd sdk
uv sync
uv .venv/Script/activate
```
You can watch more detailed debug information by using `--log-level=DEBUG` or `set AT_LOG_LEVEL=DEBUG` for Windows or `export AT_LOG_LEVEL=DEBUG` for Linux and Mac.
