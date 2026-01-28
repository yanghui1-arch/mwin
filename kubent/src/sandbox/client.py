import time
import docker
from docker import DockerClient
from docker.errors import DockerException

_docker_client: DockerClient | None = None


def get_docker_client(
    retries: int = 5,
    base_delay: float = 0.5,
) -> DockerClient:
    """
    Get a singleton DockerClient with retry.

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
