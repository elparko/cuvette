import pytest


def pytest_addoption(parser):
    parser.addoption("--live", action="store_true", help="run tests that need Java, Ollama, the network or an API key")


def pytest_configure(config):
    config.addinivalue_line("markers", "live: needs Java, Ollama, the network or an API key")


def pytest_collection_modifyitems(config, items):
    if config.getoption("--live") or "live" in (config.getoption("-m") or ""):
        return
    skip = pytest.mark.skip(reason="live test: run with --live")
    for item in items:
        if "live" in item.keywords:
            item.add_marker(skip)


@pytest.fixture(autouse=True)
def ga_home(tmp_path, monkeypatch):
    home = tmp_path / "ga_home"
    monkeypatch.setenv("GA_HOME", str(home))
    return home
