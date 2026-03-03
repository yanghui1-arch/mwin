"""Unit tests for src.config.Config

Covers:
  - get(): successful key lookup with string value.
  - get(): missing key with / without a default.
  - get(): non-string value (int, bool, dict) returns default.
  - get(): intermediate key is not a dict (short-circuit returns default).
  - get(): nested dotted key navigation.
  - get(): single-component key (no dots).
  - _load_data(): FileNotFoundError → returns empty dict (prints warning, no raise).
  - _load_data(): malformed TOML → returns empty dict (prints warning, no raise).
  - _data(): result is cached after first call.
  - reload(): invalidates the cache so the file is re-read.
"""
from __future__ import annotations

import tempfile
import textwrap
from pathlib import Path

import pytest

from src.config import Config


# ── helpers ───────────────────────────────────────────────────────────────────

def _config_from_toml(content: str) -> Config:
    """Write *content* to a temp TOML file and return a Config pointing at it."""
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".toml", delete=False, encoding="utf-8"
    ) as f:
        f.write(textwrap.dedent(content))
        path = Path(f.name)
    return Config(path=path)


# ── tests: successful key lookups ─────────────────────────────────────────────

class TestConfigGet:
    def test_existing_top_level_key_returns_value(self):
        cfg = _config_from_toml("""
            greeting = "hello"
        """)
        assert cfg.get("greeting") == "hello"

    def test_nested_dotted_key_returns_value(self):
        cfg = _config_from_toml("""
            [database]
            host = "localhost"
        """)
        assert cfg.get("database.host") == "localhost"

    def test_deeply_nested_key(self):
        cfg = _config_from_toml("""
            [a.b]
            c = "deep_value"
        """)
        assert cfg.get("a.b.c") == "deep_value"

    def test_single_component_key(self):
        cfg = _config_from_toml('model = "gpt-4"')
        assert cfg.get("model") == "gpt-4"

    def test_default_is_ignored_when_key_exists(self):
        cfg = _config_from_toml('x = "real"')
        assert cfg.get("x", "fallback") == "real"


# ── tests: missing key / wrong type ───────────────────────────────────────────

class TestConfigGetMissing:
    def test_missing_key_with_default_returns_default(self):
        cfg = _config_from_toml("")
        assert cfg.get("nonexistent", "fallback") == "fallback"

    def test_missing_key_without_default_returns_none(self):
        # NOTE: The docstring says ValueError is raised when key is absent and no
        # default is given, but the actual traversal logic only raises when an
        # *intermediate* key is a non-dict.  A fully absent key at the leaf
        # simply returns None.  This test documents current behaviour.
        cfg = _config_from_toml("")
        result = cfg.get("nonexistent")
        assert result is None

    def test_missing_nested_key_with_default_returns_default(self):
        cfg = _config_from_toml("""
            [section]
            present = "yes"
        """)
        assert cfg.get("section.missing", "default_val") == "default_val"

    def test_missing_nested_leaf_key_without_default_returns_none(self):
        # Same as above: a missing *leaf* key returns None, not ValueError.
        cfg = _config_from_toml("""
            [section]
            present = "yes"
        """)
        result = cfg.get("section.absent")
        assert result is None

    def test_non_string_int_value_returns_default(self):
        """Config.get() only returns strings; integer values fall back to default."""
        cfg = _config_from_toml("port = 5432")
        result = cfg.get("port", "5432")
        assert result == "5432"

    def test_non_string_bool_value_returns_default(self):
        cfg = _config_from_toml("debug = true")
        result = cfg.get("debug", "false")
        assert result == "false"

    def test_non_string_dict_value_returns_default(self):
        """If a section is a dict (not a leaf string), it returns the default."""
        cfg = _config_from_toml("""
            [section]
            key = "val"
        """)
        # Asking for "section" returns the dict, not a string — falls back to default
        result = cfg.get("section", "fallback")
        assert result == "fallback"

    def test_intermediate_non_dict_key_returns_default(self):
        """If an intermediate key resolves to a string, traversal stops gracefully."""
        cfg = _config_from_toml('leaf = "string_value"')
        # "leaf.deeper" tries to call "string_value".get("deeper") — impossible
        result = cfg.get("leaf.deeper", "safe")
        assert result == "safe"

    def test_intermediate_non_dict_key_raises_without_default(self):
        cfg = _config_from_toml('leaf = "string_value"')
        with pytest.raises(ValueError):
            cfg.get("leaf.deeper")


# ── tests: missing / malformed file ───────────────────────────────────────────

class TestConfigFileErrors:
    def test_missing_file_returns_default_without_raising(self):
        cfg = Config(path=Path("/nonexistent/path/that/does/not/exist.toml"))
        result = cfg.get("any_key", "safe_default")
        assert result == "safe_default"

    def test_missing_file_no_default_returns_none(self):
        # _load_data() returns {} on FileNotFoundError; then get() returns None
        # for a missing key (not ValueError — see test_missing_key_without_default).
        cfg = Config(path=Path("/nonexistent/path.toml"))
        assert cfg.get("any_key") is None

    def test_malformed_toml_returns_default_without_raising(self):
        cfg = _config_from_toml("this is NOT valid toml = [[[[")
        result = cfg.get("any_key", "safe_default")
        assert result == "safe_default"

    def test_malformed_toml_no_default_returns_none(self):
        # _load_data() returns {} on TOMLDecodeError; missing key → None.
        cfg = _config_from_toml("not valid toml {{{")
        assert cfg.get("any_key") is None


# ── tests: caching and reload() ───────────────────────────────────────────────

class TestConfigCaching:
    def test_data_cached_after_first_load(self):
        cfg = _config_from_toml('x = "initial"')
        _ = cfg.get("x")  # triggers first load
        # Write new content directly to the file – should NOT be picked up
        cfg.path.write_text('x = "updated"', encoding="utf-8")
        assert cfg.get("x") == "initial"  # still cached

    def test_reload_invalidates_cache(self):
        cfg = _config_from_toml('x = "initial"')
        _ = cfg.get("x")  # prime cache
        cfg.path.write_text('x = "updated"', encoding="utf-8")
        cfg.reload()
        assert cfg.get("x") == "updated"

    def test_reload_re_reads_new_keys(self):
        cfg = _config_from_toml('a = "first"')
        _ = cfg.get("a")  # prime cache
        cfg.path.write_text('a = "first"\nb = "second"', encoding="utf-8")
        cfg.reload()
        assert cfg.get("b") == "second"

    def test_double_get_returns_same_value(self):
        cfg = _config_from_toml('model = "gpt-4"')
        assert cfg.get("model") == cfg.get("model")


# ── tests: production config.toml is readable ─────────────────────────────────

class TestDefaultConfig:
    def test_default_config_file_is_loadable(self):
        """The real config.toml bundled with the project must parse without errors."""
        from src.config import config
        # At minimum, any key lookup with a default must not raise
        result = config.get("kubent.model", "fallback")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_known_kubent_model_key_present(self):
        from src.config import config
        model = config.get("kubent.model", "")
        assert model != ""  # the real config.toml has this key set
