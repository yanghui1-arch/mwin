from typing import TypedDict, Required, List, Dict, Any
from uuid import UUID
from celery import Task
from openai.types.chat import ChatCompletionMessageParam
from .celery_app import celery_app
from ..agent.kubent import Kubent, Result
from ..agent.runtime import execution_scope
from ..env import Env, EnvStepInfo
from ..repository.db.conn import SessionLocal
from ..repository import kubent_chat

class KubentRequestArgs(TypedDict):
    question: Required[str]
    chat_hist:List[ChatCompletionMessageParam] | None
    agent_workflows: Required[List[str]]
    session_id: str
    user_id: str
    project_name: str

class KubentResponse(TypedDict):
    message: Required[str]

class TaskProgress(TypedDict):
    tool_names: List[str] | None
    """Tool name which is called by Kubent"""

    content: str | None
    """Kubent content that is final response or reason during calling tool"""


@celery_app.task(
    bind=True,
    autoretry_for=(Exception, ),
    retry_kwargs={"max_retries": 3, "countdown": 10},
    retry_backoff=True,
)
def kubent_run(self: Task, args: KubentRequestArgs):
    try:
        user_id = UUID(args["user_id"])
        session_id = UUID(args["session_id"])
    except ValueError as ve:
        print(f"Invalid user_id and session_id: {user_id} | {session_id}")
    
    # Ready environment and kubent instance.
    with execution_scope(session_id=session_id, user_id=user_id, project_name=args["project_name"], agent_name="Kubent"):
        env = Env(env_name=f"optimize_{args["user_id"]}")
        kubent = Kubent()
        for tool in kubent.tools:
            env.update_space_action(tool=tool)
        
        kubent_result:Result = run(
            task=self,
            env=env,
            kubent=kubent,
            question=args["question"],
            chat_hist=args["chat_hist"],
            agent_workflows=args["agent_workflows"],
        )

        optimize_solution:str = kubent_result.answer
        add_chat(session_id=session_id, user_id=user_id, messages=kubent_result.chats, agent_name="Kubent")
    
    return KubentResponse(message=optimize_solution)


def run(
    task: Task,
    env: Env,
    kubent: Kubent,
    question: str,
    chat_hist: List[ChatCompletionMessageParam] | None = None,
    agent_workflows: List[str] | None = None,
):
    """Kubent start to solve a question
    
    Args:
        question(str): question
        chat_hist(List[ChatCompletionMessageParam]|None): chat history with Kubent. Default to `None`.
    
    Returns:
        Result that Kubent gives
    """

    cnt = 0
    terminate = False
    obs = env.reset()
    act_info:EnvStepInfo = {
        "step_finish_reason": "",
        "steps": 0,
        "num_tool_callings": 0, 
        "answer": "",
        "tool_use": None,
    }
    while terminate is False and cnt < kubent.attempt:
        # obs, reward, terminate, act_info
        completion = kubent.step(
            question=question, 
            obs=obs,
            chat_hist=chat_hist, 
            agent_workflows=agent_workflows,
        )
        obs, reward, terminate, act_info = env.step(llm_action=completion.choices[0].message)
        cnt += 1

        # task progress update
        llm_response: str | None = completion.choices[0].message.content
        task_metadata: TaskProgress = {
            "content": llm_response,
            "tool_names": [tool_usage["name"] for tool_usage in act_info["tool_use"]] if act_info["tool_use"] is not None else None
        }
        task.update_state(
            state="PROGRESS",
            meta=task_metadata
        )

    if act_info.get("step_finish_reason") == "solved":
        chats:List[ChatCompletionMessageParam] = [{"role": "user", "content": question}] + obs + [{"role": "assistant", "content": act_info.get("answer")}]
        return Result(
            answer=act_info.get("answer"),
            chats=chats
        )
        
    else:
        chats:List[ChatCompletionMessageParam] = [{"role": "user", "content": question}] + obs + [{"role": "assistant", "content": f"Exceed max attempts: {kubent.attempt}"}]
        # TODO: Fix it in the later. Makes it pass the final answer not an exceed information.
        return Result(answer=f"Exceed max attempts: {kubent.attempt}", chats=chats)


def add_chat(
    session_id:UUID,
    user_id:UUID,
    messages:List[Dict[str, Any]],
    agent_name: str,
):
    with SessionLocal() as db:
        with db.begin():
            for message in messages:
                role = message.get("role", None)
                if role is None:
                    raise ValueError("[DB] Failed to store chats because no role.")

                kubent_chat.create_new_chat_sync(
                    db=db,
                    session_id=session_id,
                    user_id=user_id,
                    role=message.get("role"),
                    payload=message,
                    agent_name=agent_name,
                )
