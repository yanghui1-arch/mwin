"""Dependency-free ASGI middleware used by FastAPI and Starlette."""

from collections.abc import Awaitable, Callable

from ..context import start_trace_async
from ..exporter import shutdown_exporter


type ASGIScope = dict[str, object]
type ASGIMessage = dict[str, object]
type ASGIReceive = Callable[[], Awaitable[ASGIMessage]]
type ASGISend = Callable[[ASGIMessage], Awaitable[None]]
type ASGIApp = Callable[
    [ASGIScope, ASGIReceive, ASGISend],
    Awaitable[None],
]


class MwinTraceMiddleware:
    """Create one root trace around every ASGI HTTP request.

    The trace scope surrounds the complete ASGI application call, so streaming
    responses are not finalized until the application has sent its final body
    chunk and returned.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(
        self,
        scope: ASGIScope,
        receive: ASGIReceive,
        send: ASGISend,
    ) -> None:
        if scope.get("type") == "lifespan":
            try:
                await self.app(scope, receive, send)
            finally:
                shutdown_exporter(timeout=10.0)
            return
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        method = str(scope.get("method", "HTTP"))
        path = str(scope.get("path", "/"))
        query_string = scope.get("query_string", b"")
        if isinstance(query_string, bytes):
            query_string = query_string.decode("utf-8", errors="replace")
        elif not isinstance(query_string, str):
            query_string = str(query_string)

        async with start_trace_async(
            name=f"{method} {path}",
            input={
                "method": method,
                "path": path,
                "query_string": query_string,
            },
        ):
            await self.app(scope, receive, send)
