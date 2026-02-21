<!-- <p align="center"><img src='./images/logo.webp'/></p> -->

# mwin
mwin: Track OpenAI, Claude, Gemini and OpenAI-compatible models then give solutions to improve your agent system.<br/>
Our goal is to make llm application more valuable and effortlessly improve llm capabilities.

# Quickstart
Mwin is very easy to start. You need to install docker before deployment. After installing it you build docker images and then run containers, you can see track contents on web `http://localhost:5173/`.
## Deployment
First build docker image.
```docker
docker build -t aitrace-backend .
docker build --target web-runtime -t aitrace-web .
docker build --target postgres -t aitrace-postgres .
```
Then run docker container
```docker
docker run -d --name aitrace-postgres -p 16432:5432 -v aitrace_pgdata:/var/lib/postgresql/data aitrace-postgres
docker run -d --name aitrace-web -p 5173:80 -e BACKEND_HOST=host.docker.internal aitrace-web
docker run -d --name aitrace-backend -e SPRING_DATASOURCE_URL=jdbc:postgresql://host.docker.internal:16432/aitrace -p 8080:8080 aitrace-backend
```
## Python-sdk
Mwin python sdk need an api key. So you have to be sure that you deploys successfully. Then enter `http://localhost:5173/` to get your api key. <br/>
[Click here to know how to use mwin python-sdk.](src/README.md)

# Development
Mwin project package manager is uv. If you are a beginner uver, please click uv link: [uv official link](https://docs.astral.sh/uv/guides/projects/#creating-a-new-project)
```bash
cd src
uv sync
uv .venv/Script/activate
```
You can watch more detailed debug information by using `--log-level=DEBUG` or `set AT_LOG_LEVEL=DEBUG` for Windows or `export AT_LOG_LEVEL=DEBUG` for Linux and Mac.