from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import tomllib

DEFAULT_CONFIG_PATH = Path(__file__).resolve().parents[1] / "config.toml"


@dataclass
class Config:
    path: Path = DEFAULT_CONFIG_PATH
    _cached_data: dict[str, Any] | None = field(default=None, init=False, repr=False)

    def _load_data(self) -> dict[str, Any]:
        try:
            with self.path.open("rb") as file_handle:
                return tomllib.load(file_handle)
        except FileNotFoundError:
            return {}
        except tomllib.TOMLDecodeError:
            return {}

    def _data(self) -> dict[str, Any]:
        if self._cached_data is None:
            self._cached_data = self._load_data()
        return self._cached_data

    def get(self, dotted_key: str, default: str) -> str:
        data = self._data()
        cursor: Any = data
        for part in dotted_key.split("."):
            if not isinstance(cursor, dict):
                return default
            cursor = cursor.get(part)
        if isinstance(cursor, str):
            return cursor
        return default

    def reload(self) -> None:
        self._cached_data = self._load_data()


config = Config()
