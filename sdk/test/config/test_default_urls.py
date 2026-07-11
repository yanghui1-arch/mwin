from mwin.client import config as client_config
from mwin.config.configurator import CLOUD_BASE_URL, LOCAL_BASE_URL, MwinConfigurator
from mwin.config.types import MwinConfig


def test_cloud_configurator_uses_deployed_worker():
    configurator = MwinConfigurator(api_key="key", project_name="project")

    assert configurator.url == CLOUD_BASE_URL


def test_local_configurator_keeps_local_backend():
    configurator = MwinConfigurator(
        api_key="key",
        project_name="project",
        use_local=True,
    )

    assert configurator.url == LOCAL_BASE_URL


def test_explicit_configurator_url_takes_precedence():
    custom_url = "https://mwin.example.com/api/v0"
    configurator = MwinConfigurator(
        api_key="key",
        project_name="project",
        url=custom_url,
    )

    assert configurator.url == custom_url


def test_first_run_config_has_no_url():
    assert MwinConfig().url is None


def test_runtime_client_default_uses_cloud_backend(monkeypatch):
    monkeypatch.delenv("MWIN_HOST_URL", raising=False)
    monkeypatch.setattr(client_config, "_get_persisted_config", lambda: None)

    config = client_config.build_client_config(
        project_name="project",
        host_url=None,
        apikey="key",
    )

    assert config.host_url == CLOUD_BASE_URL
