import asyncio
import hashlib
import json
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
A_DIR = tempfile.mkdtemp(prefix="parity-stage1-")
B_DIR = tempfile.mkdtemp(prefix="parity-wrapper-")
os.environ["SMILE_MSI_MCP_OUT"] = A_DIR

from smile_msi import mcpserver
from smile_msi.agent import setup as stage1_setup

REGIONS = """rows, cols = ds._pixel_rows_cols()
h, w = ds.height, ds.width
e = ((cols - w / 2) / (w * 0.45)) ** 2 + ((rows - h / 2) / (h * 0.45)) ** 2
add_region("core", e <= 0.405)
add_region("rim", (e <= 1.0) & (e > 0.495))
"""

SETUP = stage1_setup.resolve({})
PLAN = [
    ("open_slide", {"ref": "demo"}),
    ("apply_settings", {k: SETUP["params"][k] for k in ("ppm", "norm", "reduce", "tic_max_amp")}),
    ("run_script", {"code": REGIONS}),
    ("find_peaks", {"snr": 3.0}),
    ("find_peaks", {"snr": 3.0, "max_peaks": 40}),
    ("run_analysis", {"step_id": "discriminating_features", "groups": ["rim", "core"]}),
    ("run_analysis", {"step_id": "roi_comparison", "a": "rim", "b": "core"}),
    ("annotate", {"mz": [766.5388, 904.6187, 744.5577, 885.5488, 834.5287, 890.6388, 281.2486, 824.6593, 327.2322]}),
]


def stage1_args(tool, args):
    if tool == "apply_settings":
        return args
    eff, _ = stage1_setup.fill_defaults(SETUP, tool, args)
    return eff


def stage1_call(tool, args):
    slide = mcpserver._open["slide"]
    if tool == "apply_settings":
        return {"changes": {k: list(v) for k, v in stage1_setup.apply_to_slide(SETUP, slide).items()}}
    return getattr(mcpserver, tool)(**args)


def digest(tool, args, out):
    d = {}
    t = out.get("table")
    if tool == "open_slide":
        d = {"n_pixels": out.get("n_pixels"), "groups": out.get("groups") or out.get("resolved_groups")}
    elif tool == "apply_settings":
        d = {"changed": sorted(out.get("changed") or out.get("changes", {}))}
    elif tool == "run_script":
        d = {"logs": out["logs"][:2]}
    elif tool == "find_peaks":
        d = {k: out[k] for k in ("n_features", "n_detected")}
        d["first_mz"] = out["mz"][:5]
    elif tool in ("run_analysis", "annotate"):
        d = {"n_rows": t["n_rows"], "first_mz": [r["mz"] for r in t["preview"][:3]]}
        if tool == "run_analysis":
            d["engine_summary"] = out["summary"]
            d["top_auc"] = [r.get("AUC") for r in t["preview"][:3]]
        else:
            d["lipids"] = [r["lipid"] for r in t["preview"]]
        d["csv_sha256"] = hashlib.sha256(open(t["path"] if "path" in t else t["csv"], "rb").read()).hexdigest()[:12]
    return d


def run_stage1():
    rows = []
    for tool, args in PLAN:
        eff = stage1_args(tool, args)
        out = stage1_call(tool, eff)
        rows.append({"tool": tool, "args": eff, "digest": digest(tool, eff, out)})
    return rows


async def run_wrapper():
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client

    env = {**os.environ, "GA_WORK_DIR": B_DIR}
    env.pop("SMILE_MSI_MCP_OUT", None)
    params = StdioServerParameters(command=sys.executable, args=[os.path.join(HERE, "wrapper.py")], env=env)
    rows = []
    async with stdio_client(params) as (r, w):
        async with ClientSession(r, w) as session:
            await session.initialize()
            for tool, args in PLAN:
                eff = stage1_args(tool, args)
                res = await session.call_tool(tool, eff)
                out = json.loads(res.content[0].text)
                rows.append({"tool": tool, "args": eff, "digest": digest(tool, eff, out),
                             "summary": out.get("summary"), "manual_route": out.get("manual_route")})
    return rows


def main():
    a = run_stage1()
    b = asyncio.run(run_wrapper())
    result = []
    for x, y in zip(a, b):
        keys = sorted(set(x["digest"]) | set(y["digest"]))
        for k in keys:
            same = x["digest"].get(k) == y["digest"].get(k)
            result.append({"tool": x["tool"], "field": k, "stage1": x["digest"].get(k),
                           "wrapper": y["digest"].get(k), "match": same})
    print(json.dumps({"args": [x["args"] for x in a], "rows": result,
                      "wrapper_summaries": [y["summary"] for y in b],
                      "all_match": all(r["match"] for r in result)}, indent=1, default=str))


if __name__ == "__main__":
    main()
