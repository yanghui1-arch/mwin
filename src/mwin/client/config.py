from dataclasses import dataclass
from typing import Any, Dict
from functools import lru_cache
import os
import warnings

# TODO: update it before deploy
# DEFAULT_HOST_URL = "http://localhost:8080/api/v0"
DEFAULT_HOST_URL = "http://petmate.fun/api/v0"
DEFAULT_PROJECT_NAME = "Default project"
DEFAULT_API_KEY = "<DEFAULT_LOCAL_API_KEY>"

try:
    from ..config.loader import load_config as _load_persisted_config
except Exception:
    _load_persisted_config = None  # type: ignore


@lru_cache(maxsize=1)
def _get_persisted_config():
    if _load_persisted_config is None:
        return None
    try:
        return _load_persisted_config()
    except Exception:
        return None

@dataclass
class ClientConfig:
    headers: Dict[str, Any]
    host_url: str = DEFAULT_HOST_URL
    project_name: str = DEFAULT_PROJECT_NAME
    apikey: str = DEFAULT_API_KEY

def build_client_config(
    project_name: str | None,
    host_url: str | None,
    apikey: str | None,
) -> ClientConfig:
    """Build client config with precedence:
    Explicit args > env vars > persisted file > defaults.
    """

    # project_name: args > env > default
    if project_name is None:
        env_project = os.environ.get("MWIN_PROJECT_NAME")
        if env_project:
            project_name = env_project
        else:
            cfg = _get_persisted_config()
            if cfg and getattr(cfg, "project_name", None):
                project_name = cfg.project_name
            else:
                warnings.warn(
                    f"[mwin] Project name is empty. Mwin will set it `{DEFAULT_PROJECT_NAME}`."
                )
                project_name = DEFAULT_PROJECT_NAME

    # host_url: args > env > file > default
    if host_url is None:
        env_host = os.environ.get("MWIN_HOST_URL")
        if env_host:
            host_url = env_host
        else:
            cfg = _get_persisted_config()
            if cfg and getattr(cfg, "url", None):
                host_url = cfg.url
            else:
                warnings.warn(
                    f"[mwin] host_url is empty. Mwin will set it `{DEFAULT_HOST_URL}`"
                )
                host_url = DEFAULT_HOST_URL

    # apikey: args > env > file > default
    if apikey is None:
        env_key = os.environ.get("MWIN_API_KEY")
        if env_key:
            apikey = env_key
        else:
            cfg = _get_persisted_config()
            if cfg and getattr(cfg, "apikey", None):
                apikey = cfg.apikey
            else:
                warnings.warn(
                    f"[mwin] Fail to load apikey. It will run wronly if you are not deploy it in local. Mwin will set apikey to `{DEFAULT_API_KEY}`"
                )
                apikey = DEFAULT_API_KEY

    headers = {
        "Authorization": f"Bearer {apikey}",
        "Content-Type": "application/json",
    }

    return ClientConfig(
        host_url=host_url,
        project_name=project_name,
        apikey=apikey,
        headers=headers,
    )
