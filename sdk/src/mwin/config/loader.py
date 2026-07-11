# loader.py
import json
from pathlib import Path
from .types import MwinConfig

CONFIG_PATH = Path.home() / ".mwin" / "config.json"


def load_config() -> MwinConfig:
    """Load config from ~/.mwin/config.json"""
    if CONFIG_PATH.exists():
        with CONFIG_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return MwinConfig(**data)
    
    return MwinConfig()  # default config

def save_config(config: MwinConfig):
    """Save config to ~/.mwin/config.json"""
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with CONFIG_PATH.open("w", encoding="utf-8") as f:
        json.dump(config.model_dump(), f, indent=4)
