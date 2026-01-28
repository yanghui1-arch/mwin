import docker
from docker.errors import NotFound
from docker.models.containers import Container

docker_client = docker.from_env()

def get_container(container_name: str) -> Container | None:
    try:
        return docker_client.containers.get(container_name)
    except NotFound:
        return None
    
