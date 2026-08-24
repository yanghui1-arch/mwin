import httpx
import functools
from datetime import datetime
from typing import Any, List, Dict
from typing import TYPE_CHECKING

from .config import build_client_config
from .schemas.request.log_request import (
    LogStepRequest,
    LogTraceTreeRequest,
    LogTraceRequest,
)
from .schemas.response.log_response import LogStepResponse, LogTraceResponse
if TYPE_CHECKING:
    from ..exporter import StepSnapshot, TraceTreeSnapshot


class SyncClient:
    """SyncClient is to communicate with server.
    It works sync now. TODO: Later add an async work function.
    Currently it supports track step, trace and conversation.
    """

    def __init__(
        self,
        project_name: str | None = None,
        host_url: str | None = None,
        apikey: str | None = None,
        timeout_ms: int = 3000,
    ):
        client_config = build_client_config(
            project_name=project_name,
            host_url=host_url,
            apikey=apikey
        )
        self._project_name = client_config.project_name
        self._host_url = client_config.host_url
        self._apikey = client_config.apikey

        self._client = httpx.Client(
            base_url=client_config.host_url,
            headers=client_config.headers,
            timeout=timeout_ms / 1000,
            trust_env=True,
        )

    def log_step(
        self,
        snapshot: "StepSnapshot",
    ) -> LogStepResponse:
        """Construct and send a request for one standalone Step.

        Args:
            snapshot: Completed standalone Step snapshot to send.

        Returns:
            The server response for the Step request.
        """

        step = snapshot.step
        project_name = snapshot.project_name or self._project_name
        log_step_req = LogStepRequest(
            project_name=project_name,
            step_name=step.name,
            step_id=str(step.id),
            trace_id=(
                str(step.trace_id)
                if step.trace_id is not None
                else None
            ),
            parent_step_id=(
                str(step.parent_step_id)
                if step.parent_step_id is not None
                else None
            ),
            step_type=step.type,
            tags=list(step.tags),
            input=step.input,
            output=step.output,
            error_info=step.error_info,
            model=step.model,
            usage=step.usage,
            start_time=step.start_time,
            end_time=step.end_time,
            description=step.description,
            llm_provider=step.llm_provider,
        )

        try:
            response = self._client.post(
                "/log/step",
                json=log_step_req.model_dump(mode='json')
            )
            response.raise_for_status()
            return LogStepResponse(
                status_code=response.status_code,
                status_desc=response.reason_phrase,
                json_content=response.json()
            )

        except httpx.HTTPStatusError as e:
            try:
                json_content = e.response.json()
            except:
                json_content = {"raw": e.response.text}

            return LogStepResponse(
                status_code=e.response.status_code,
                status_desc=e.response.reason_phrase,
                json_content=json_content,
                server_error_info=f"HTTP {e.response.status_code}"
            )

        except httpx.RequestError as e:
            return LogStepResponse(
                status_code=0,
                status_desc="Network Error",
                json_content={"error": str(e)},
                server_error_info="Network failure"
            )

    def upload_media(self, data: bytes, mime_type: str) -> str | None:
        """Upload tracked image bytes to the configured mwin project.

        Returns the authenticated media URL stored in the step input, or None
        when the upload request fails. Tracking callers decide how to represent
        that failure and must not restore the original Base64 payload.
        """
        extension = {
            "image/png": "png",
            "image/jpeg": "jpg",
            "image/gif": "gif",
            "image/webp": "webp",
        }.get(mime_type, "bin")

        try:
            response = self._client.post(
                "/media/upload",
                data={"project_name": self._project_name},
                files={"file": (f"image.{extension}", data, mime_type)},
                timeout=10.0,
            )
            response.raise_for_status()
            return response.json()["data"]["url"]
        except httpx.HTTPError:
            return None

    def log_trace(
        self,
        trace_name: str,
        trace_id: str,
        conversation_id: str,
        tags: List[str],
        input: Dict[str, Any] | None,
        output: Dict[str, Any] | None,
        error_info: str | None,
        start_time: datetime,
        last_update_timestamp: datetime,
        parent_trace_id: str | None = None,
    ):
        """Create a trace and log it in server."""

        log_trace_req = LogTraceRequest(
            project_name=self._project_name,
            trace_name=trace_name,
            trace_id=trace_id,
            parent_trace_id=parent_trace_id,
            conversation_id=conversation_id,
            tags=tags,
            input=input,
            output=output,
            error_info=error_info,
            start_time=start_time,
            last_update_timestamp=last_update_timestamp,
        )

        try:
            response = self._client.post(
                "/log/trace",
                json=log_trace_req.model_dump(mode='json')
            )
            response.raise_for_status()
            return LogStepResponse(
                status_code=response.status_code,
                status_desc=response.reason_phrase,
                json_content=response.json()
            )

        except httpx.HTTPStatusError as e:
            try:
                json_content = e.response.json()
            except:
                json_content = {"raw": e.response.text}

            return LogStepResponse(
                status_code=e.response.status_code,
                status_desc=e.response.reason_phrase,
                json_content=json_content,
                server_error_info=f"HTTP {e.response.status_code}"
            )

        except httpx.RequestError as e:
            return LogStepResponse(
                status_code=0,
                status_desc="Network Error",
                json_content={"error": str(e)},
                server_error_info="Network failure"
            )

    def log_trace_tree(
        self,
        snapshot: "TraceTreeSnapshot",
    ) -> LogStepResponse:
        """Construct and send a request for one completed trace tree.

        Args:
            snapshot: Completed trace-tree snapshot to send.

        Returns:
            The server response for the trace-tree request.
        """

        try:
            project_name = snapshot.project_name or self._project_name
            traces = tuple(
                LogTraceRequest(
                    project_name=project_name,
                    trace_name=trace.name,
                    trace_id=str(trace.id),
                    parent_trace_id=(
                        str(trace.parent_trace_id)
                        if trace.parent_trace_id is not None
                        else None
                    ),
                    conversation_id=str(trace.conversation_id),
                    tags=list(trace.tags),
                    input=trace.input,
                    output=trace.output,
                    error_info=trace.error_info,
                    start_time=trace.start_time,
                    last_update_timestamp=trace.last_update_timestamp,
                )
                for trace in snapshot.traces
            )
            steps = tuple(
                LogStepRequest(
                    project_name=project_name,
                    step_name=step.name,
                    step_id=str(step.id),
                    trace_id=(
                        str(step.trace_id)
                        if step.trace_id is not None
                        else None
                    ),
                    parent_step_id=(
                        str(step.parent_step_id)
                        if step.parent_step_id is not None
                        else None
                    ),
                    step_type=step.type,
                    tags=list(step.tags),
                    input=step.input,
                    output=step.output,
                    error_info=step.error_info,
                    model=step.model,
                    usage=step.usage,
                    start_time=step.start_time,
                    end_time=step.end_time,
                    description=step.description,
                    llm_provider=step.llm_provider,
                )
                for step in snapshot.steps
            )

            request = LogTraceTreeRequest(traces=traces, steps=steps)
            response = self._client.post(
                "/log/trace_tree",
                content=request.model_dump_json().encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()
            return LogStepResponse(
                status_code=response.status_code,
                status_desc=response.reason_phrase,
                json_content=response.json(),
            )
        except httpx.HTTPStatusError as error:
            try:
                json_content = error.response.json()
            except ValueError:
                json_content = {"raw": error.response.text}
            return LogStepResponse(
                status_code=error.response.status_code,
                status_desc=error.response.reason_phrase,
                json_content=json_content,
                server_error_info=f"HTTP {error.response.status_code}",
            )
        except httpx.RequestError as error:
            return LogStepResponse(
                status_code=0,
                status_desc="Network Error",
                json_content={"error": str(error)},
                server_error_info="Network failure",
            )


@functools.lru_cache()
def get_cached_sync_client(
    project_name: str | None = None,
) -> SyncClient:
    client = SyncClient(
        project_name=project_name
    )

    return client
