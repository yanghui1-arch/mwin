import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from .router import api_router
from ..sandbox import init_docker_client, init_sandbox_manager, get_sandbox_manager


async def clean_up_sandboxes():
    """Background task to cleanup idle sandboxes periodically."""
    while True:
        try:
            await asyncio.sleep(60)  # Run every minute

            manager = get_sandbox_manager()
            cleaned = manager.cleanup_idle_sandboxes(idle_timeout=600)  # 10 minutes

            if cleaned > 0:
                print(f"[Cleanup] Cleaned up {cleaned} idle sandboxes")
        except Exception as e:
            print(f"[Cleanup] Error during cleanup: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize docker client and sandbox manager
    docker_client = init_docker_client()
    app.state.docker_client = docker_client

    # Initialize sandbox manager with capacity
    sandbox_manager = init_sandbox_manager(capacity=10, docker_client=docker_client)
    app.state.sandbox_manager = sandbox_manager

    # Start background cleanup task
    clean_up_sandboxes_task = asyncio.create_task(clean_up_sandboxes())
    app.state.cleanup_task = clean_up_sandboxes_task

    print("[Startup] Sandbox manager initialized with automatic cleanup")
    print("[Startup] Cleanup runs every 60 seconds (idle timeout: 600 seconds)")

    yield

    # Shutdown: Cancel cleanup task and close resources
    print("[Shutdown] Stopping cleanup task...")
    clean_up_sandboxes_task.cancel()
    try:
        await clean_up_sandboxes_task
    except asyncio.CancelledError:
        pass

    print("[Shutdown] Cleaning up all sandboxes...")
    sandbox_manager.cleanup_all_evicted()
    sandbox_manager.clear_pool(close_containers=True)

    docker_client.close()
    print("[Shutdown] Cleanup complete")


app = FastAPI(lifespan=lifespan)
app.include_router(router=api_router)