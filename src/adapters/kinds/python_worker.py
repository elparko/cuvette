import importlib
import json
import math
import os
import sys
import traceback

proto = os.fdopen(os.dup(1), "w", buffering=1, encoding="utf-8")
os.dup2(2, 1)
sys.stdout = sys.stderr

adapter_dir = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
sys.path.insert(0, adapter_dir)

handles = {}
counter = [0]


def new_handle(obj):
    counter[0] += 1
    name = "h%d" % counter[0]
    handles[name] = obj
    return name


def resolve(value):
    if isinstance(value, dict):
        if isinstance(value.get("handle"), str) and set(value.keys()) <= {"handle", "type", "repr"}:
            if value["handle"] not in handles:
                raise KeyError("unknown handle %s (handles are lost when the worker restarts)" % value["handle"])
            return handles[value["handle"]]
        return {k: resolve(v) for k, v in value.items()}
    if isinstance(value, list):
        return [resolve(v) for v in value]
    return value


def short_repr(obj):
    text = repr(obj)
    return text if len(text) <= 300 else text[:300] + "..."


def convert(value, out_dir, files, metrics, path):
    if value is None or isinstance(value, (bool, str, int)):
        return value
    if isinstance(value, float):
        return value if math.isfinite(value) else str(value)
    if isinstance(value, (list, tuple)):
        return [convert(v, out_dir, files, metrics, "%s[%d]" % (path, i)) for i, v in enumerate(value)]
    if isinstance(value, dict):
        return {str(k): convert(v, out_dir, files, metrics, (path + "." if path else "") + str(k)) for k, v in value.items()}
    try:
        import numpy as np
    except ImportError:
        np = None
    if np is not None:
        if isinstance(value, np.generic):
            return convert(value.item(), out_dir, files, metrics, path)
        if isinstance(value, np.ndarray):
            name = (path or "array").replace("[", "_").replace("]", "").replace(".", "_")
            target = os.path.join(out_dir, name + ".npy")
            n = 1
            while os.path.exists(target):
                n += 1
                target = os.path.join(out_dir, "%s-%d.npy" % (name, n))
            np.save(target, value)
            files.append(target)
            prefix = (path + ".") if path else ""
            metrics[prefix + "size"] = int(value.size)
            metrics[prefix + "ndim"] = int(value.ndim)
            if value.size and value.dtype.kind in "biuf":
                metrics[prefix + "min"] = float(value.min())
                metrics[prefix + "max"] = float(value.max())
                metrics[prefix + "mean"] = float(value.mean())
            return {"handle": new_handle(value), "type": "ndarray", "shape": list(value.shape), "dtype": str(value.dtype), "path": target}
    return {"handle": new_handle(value), "type": type(value).__name__, "repr": short_repr(value)}


def find(spec):
    module_name, _, attr = spec.partition(":")
    if module_name.endswith(".py"):
        module_name = module_name[:-3]
    obj = importlib.import_module(module_name)
    for part in attr.split("."):
        obj = getattr(obj, part)
    return obj


def handle_request(req):
    out_dir = req.get("out_dir") or os.getcwd()
    os.makedirs(out_dir, exist_ok=True)
    os.chdir(out_dir)
    fn = find(req["function"])
    args = resolve(req.get("args") or {})
    result = fn(**args)
    files, metrics = [], {}
    data = convert(result, out_dir, files, metrics, "")
    return {"result": data, "files": files, "metrics": metrics}


def send(msg):
    proto.write(json.dumps(msg) + "\n")
    proto.flush()


send({"ready": True, "python": sys.version.split()[0]})
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    req = json.loads(line)
    try:
        reply = handle_request(req)
        send({"id": req["id"], "ok": True, **reply})
    except KeyboardInterrupt:
        send({"id": req["id"], "ok": False, "error": "the call was interrupted"})
    except BaseException as e:
        send({"id": req["id"], "ok": False, "error": "%s: %s" % (type(e).__name__, e), "traceback": traceback.format_exc()[-2000:]})
