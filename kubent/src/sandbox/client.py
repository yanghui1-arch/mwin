import time
import docker
from docker import DockerClient
from docker.errors import DockerException

_docker_client: DockerClient | None = None


def init_docker_client(
    retries: int = 5,
    base_delay: float = 0.5,
) -> DockerClient:
    """
    Init a singleton DockerClient with retry.
    It should be executed when fastapi startup. Otherwise there is a risk to block the whole process.

    Args:
        retries(int): max retry attempts
        base_delay(float): initial delay (seconds), exponential backoff
    """
    global _docker_client

    if _docker_client is not None:
        return _docker_client

    last_exc: Exception | None = None

    for attempt in range(1, retries + 1):
        try:
            client = docker.from_env()
            client.ping()

            _docker_client = client
            return client

        except DockerException as e:
            last_exc = e
            if attempt >= retries:
                break

            delay = base_delay * (2 ** (attempt - 1))
            time.sleep(delay)

    raise RuntimeError(
        f"Failed to initialize Docker client after {retries} retries"
    ) from last_exc


def get_docker_client():
    if _docker_client is None:
        raise RuntimeError(
            "Docker client not initialized. "
            "Did you forget to call init_docker_client() on startup?"
        )
    return _docker_client