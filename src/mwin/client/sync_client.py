import httpx
import functools
from datetime import datetime
from typing import Any, List, Dict

from openai.types.completion_usage import CompletionUsage

from .config import ClientConfig, build_client_config
from .schemas.request.log_request import LogStepRequest, LogTraceRequest
from .schemas.response.log_response import LogStepResponse, LogTraceResponse

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
        timeout_ms: int = 1000,
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
            timeout=timeout_ms / 1000
        )

    def log_step(
        self,
        step_name: str,
        step_id: str,
        trace_id: str,
        parent_step_id: str | None,
        step_type: str,
        tags: List[str],
        input: Dict[str, Any] | None,
        output: Any | None,
        error_info: str | None,
        model: str | None,
        usage: CompletionUsage | None,
        start_time: datetime,
        end_time: datetime | None,
    ) -> LogStepResponse:
        """Create a step and log it in server."""
        
        # Convert string "None" to actual None for parent_step_id
        if parent_step_id == "None":
            parent_step_id = None
            
        log_step_req = LogStepRequest(
            project_name=self._project_name,
            step_name=step_name,
            step_id=step_id,
            trace_id=trace_id,
            parent_step_id=parent_step_id,
            step_type=step_type,
            tags=tags,
            input=input,
            output=output,
            error_info=error_info,
            model=model,
            usage=usage,
            start_time=start_time,
            end_time=end_time,
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
        last_update_timestamp: datetime
    ):
        """Create a trace and log it in server."""

        log_trace_req = LogTraceRequest(
            project_name=self._project_name,
            trace_name=trace_name,
            trace_id=trace_id,
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

    @property
    def project_name(self):
        return self._project_name
    
    @property
    def host_url(self):
        return self._host_url


@functools.lru_cache()
def get_cached_sync_client() -> SyncClient:
    client = SyncClient()

    return client
