import re
from typing import Any

_TOKEN = re.compile(r"([^.\[\]]+)|\[(-?\d+)\]")


class Missing(KeyError):
    pass


def get(obj: Any, path: str) -> Any:
    cur = obj
    for name, idx in _TOKEN.findall(path):
        try:
            cur = cur[int(idx)] if idx else cur[name]
        except (KeyError, IndexError, TypeError):
            raise Missing(path) from None
    return cur


def get_or(obj: Any, path: str, default: Any = None) -> Any:
    try:
        return get(obj, path)
    except Missing:
        return default
