import os
from pathlib import Path


def ga_home() -> Path:
    p = Path(os.environ.get("GA_HOME") or Path.home() / ".guided-analysis")
    p.mkdir(parents=True, exist_ok=True)
    return p


def _sub(name: str) -> Path:
    p = ga_home() / name
    p.mkdir(parents=True, exist_ok=True)
    return p


def sessions_dir() -> Path:
    return _sub("sessions")


def profiles_dir() -> Path:
    return _sub("profiles")


def labmemory_dir() -> Path:
    return _sub("labmemory")


def adapters_dir() -> Path:
    return _sub("adapters")


def questions_db() -> Path:
    return ga_home() / "questions.sqlite"


def session_dir(session_id: str) -> Path:
    d = sessions_dir() / session_id
    for sub in ("blobs", "work", "exports"):
        (d / sub).mkdir(parents=True, exist_ok=True)
    return d
