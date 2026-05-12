import shlex
from typing import Callable
from uuid import uuid4

from mwin import StepType, track
from openai import pydantic_function_tool
from openai.types.chat import ChatCompletionFunctionToolParam
from pydantic import BaseModel, Field

from .toolkits import Tool
from ...sandbox import DockerSandbox, DockerSandboxConfig, get_docker_client


@track(step_type=StepType.TOOL)
def load_repository_context(repo_url: str, repo_ref: str | None = None) -> str:
    sandbox = DockerSandbox(
        config=DockerSandboxConfig(
            agent_name="kubent-optimize",
            session_id=f"repo-{uuid4().hex}",
            docker_image="alpine/git",
            life_seconds=600,
        ),
        docker_client=get_docker_client(),
    )

    commands = [
        "set -e",
        "rm -rf /workspace/repo",
        f"git clone --depth 1 {shlex.quote(repo_url)} /workspace/repo",
    ]

    # repo_ref may be a branch name, tag, or commit SHA.
    if repo_ref:
        quoted_ref = shlex.quote(repo_ref)
        commands.append(
            f"(git -C /workspace/repo fetch --depth 1 origin {quoted_ref} && "
            f"git -C /workspace/repo checkout FETCH_HEAD) || "
            f"git -C /workspace/repo checkout {quoted_ref}"
        )

    commands.extend(
        [
            "echo '## Git HEAD'",
            "git -C /workspace/repo rev-parse HEAD",
            "echo '## Latest Commit'",
            "git -C /workspace/repo log -1 --pretty='%h %s'",
            "echo '## Directory Tree'",
            "find /workspace/repo | sed 's#^/workspace/repo#.#' | sort | head -n 300",
            "echo '## Key Files'",
            (
                "for file in README.md README package.json pyproject.toml requirements.txt "
                "Dockerfile docker-compose.yml docker-compose.yaml pnpm-workspace.yaml turbo.json; do "
                "if [ -f \"/workspace/repo/$file\" ]; then "
                "echo \">>> $file\"; sed -n '1,120p' \"/workspace/repo/$file\"; fi; "
                "done"
            ),
        ]
    )

    try:
        result = sandbox.bash("\n".join(commands))
        stdout, stderr = result.output
        if result.exit_code != 0:
            return f"Failed to load repository context: {(stderr or stdout or b'').decode('utf-8', errors='ignore')}"

        text = (stdout or b"").decode("utf-8", errors="ignore")
        return text if len(text) <= 12000 else f"{text[:12000]}...(truncated)"
    except Exception as exc:
        return f"Failed to load repository context: {exc}"
    finally:
        sandbox.close()


class RepositoryContextParams(BaseModel):
    repo_url: str = Field(..., description="Git repository url.")
    repo_ref: str | None = Field(default=None, description="Optional git ref, such as a branch name, tag, or commit SHA.")


class RepositoryContext(Tool):
    func: Callable = load_repository_context
    type: str = "query"
    json_schema: ChatCompletionFunctionToolParam = pydantic_function_tool(
        RepositoryContextParams,
        name="load_repository_context",
        description="Clone the target repository inside docker and return a repository summary with directory tree.",
    )
