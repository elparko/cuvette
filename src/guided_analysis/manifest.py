from __future__ import annotations

import importlib.metadata
import os
import tomllib
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

SPEC_VERSION = "1"

ConnectionKind = Literal["mcp", "python", "cli", "script", "http", "macro", "screen", "files"]
Owner = Literal["human", "agent", "fixed"]
Fidelity = Literal["exact", "close", "code_only"]
EvidenceSource = Literal["program_definitions", "macro_recorder", "demonstration", "docs",
                         "code", "unverified"]


class _Model(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Program(_Model):
    name: str
    version: str = ""
    tested_versions: list[str] = Field(default_factory=list)
    homepage: str = ""
    docs: list[str] = Field(default_factory=list)


class Locate(_Model):
    env: str = ""
    paths: list[str] = Field(default_factory=list)
    which: list[str] = Field(default_factory=list)
    version_command: list[str] = Field(default_factory=list)
    version_pattern: str = ""


class Connection(_Model):
    kind: ConnectionKind
    transport: Literal["stdio", "http"] = "stdio"
    command: list[str] = Field(default_factory=list)
    env: dict[str, str] = Field(default_factory=dict)
    cwd: str = ""
    url: str = ""
    state_tool: str = ""
    history_tool: str = ""
    startup_timeout_s: float = 60.0
    call_timeout_s: float = 600.0
    network: bool = False
    interpreter: list[str] = Field(default_factory=list)
    base_url: str = ""
    headers: dict[str, str] = Field(default_factory=dict)
    watch: list[str] = Field(default_factory=list)


class DecisionLink(_Model):
    tool: str
    arg: str


class Sensitivity(_Model):
    options: list[Any] = Field(default_factory=list)
    tool: str = ""
    args: dict[str, Any] = Field(default_factory=dict)
    compare: list[str] = Field(default_factory=list)
    max_runs: int = 3


class Decision(_Model):
    key: str
    label: str
    kind: Literal["text", "choice", "float", "int", "bool"] = "text"
    default: Any = None
    choices: list[Any] = Field(default_factory=list)
    lo: float | None = None
    hi: float | None = None
    owner: Owner = "human"
    group: str = "Method"
    help: str = ""
    essential: bool = False
    stage: Literal["setup", "when_needed"] = "setup"
    links: list[DecisionLink] = Field(default_factory=list)
    sensitivity: Sensitivity | None = None
    changes_conclusion: bool = True


class ParamMapEntry(_Model):
    arg: str
    label: str
    ui_default: Any = None
    note: str = ""


class Evidence(_Model):
    source: EvidenceSource = "unverified"
    test: str = ""
    note: str = ""


class MapEntry(_Model):
    tool: str
    match: dict[str, Any] = Field(default_factory=dict)
    route: str
    steps: list[str] = Field(default_factory=list)
    params: list[ParamMapEntry] = Field(default_factory=list)
    fidelity: Fidelity = "close"
    difference: str = ""
    evidence: Evidence = Field(default_factory=Evidence)
    summary: str = ""

    @model_validator(mode="after")
    def _close_needs_difference(self):
        if self.fidelity == "close" and not self.difference:
            self.difference = "not yet described"
        return self


class Check(_Model):
    id: str
    entry: str
    description: str = ""
    severity: Literal["info", "warning", "error"] = "warning"


class ExpectItem(_Model):
    path: str
    equals: Any = None
    approx: float | None = None
    rel: float = 1e-6
    abs: float = 0.0
    min: float | None = None
    max: float | None = None
    contains: str | None = None


class TestCall(_Model):
    tool: str
    args: dict[str, Any] = Field(default_factory=dict)
    save_as: str = ""


class KnownAnswerTest(_Model):
    id: str
    description: str = ""
    calls: list[TestCall]
    expect: list[ExpectItem] = Field(default_factory=list)
    data: list[str] = Field(default_factory=list)
    manual_route_checked: bool = False


class OutputSpec(_Model):
    kind: Literal["image", "table", "file", "text", "json"] = "file"
    ext: str = ""
    description: str = ""


class ToolDef(_Model):
    name: str
    description: str
    title: str = ""
    params: dict[str, dict[str, Any]] = Field(default_factory=dict)
    required: list[str] = Field(default_factory=list)
    read_only: bool = False
    outputs: dict[str, OutputSpec] = Field(default_factory=dict)
    command: list[str] = Field(default_factory=list)
    function: str = ""
    script: str = ""
    macro: str = ""
    request: dict[str, Any] = Field(default_factory=dict)
    parse: Literal["text", "json", "csv", "keyvalue"] = "text"

    def input_schema(self) -> dict:
        props = {k: dict(v) for k, v in self.params.items()}
        schema: dict[str, Any] = {"type": "object", "properties": props}
        if self.required:
            schema["required"] = list(self.required)
        return schema


class DataRules(_Model):
    cloud_visibility: Literal["all", "summaries", "none"] = "all"
    note: str = ""


class AdapterInfo(_Model):
    name: str
    title: str = ""
    version: str = "0.1.0"
    spec: str = SPEC_VERSION
    description: str = ""
    authors: list[str] = Field(default_factory=list)
    status: Literal["draft", "approved", "locked"] = "draft"
    approved_by: str = ""
    approved_on: str = ""


class Manifest(_Model):
    adapter: AdapterInfo
    program: Program
    connection: Connection
    locate: Locate = Field(default_factory=Locate)
    standards: str = ""
    standards_file: str = ""
    decisions: list[Decision] = Field(default_factory=list)
    map: list[MapEntry] = Field(default_factory=list)
    checks: list[Check] = Field(default_factory=list)
    tests: list[KnownAnswerTest] = Field(default_factory=list)
    tools: list[ToolDef] = Field(default_factory=list)
    data_rules: DataRules = Field(default_factory=DataRules)

    @model_validator(mode="after")
    def _unique_keys(self):
        for label, items, attr in (("decision", self.decisions, "key"),
                                   ("check", self.checks, "id"),
                                   ("test", self.tests, "id"),
                                   ("tool", self.tools, "name")):
            seen = set()
            for it in items:
                v = getattr(it, attr)
                if v in seen:
                    raise ValueError(f"duplicate {label} {v!r}")
                seen.add(v)
        keys = [(m.tool, tuple(sorted((k, str(v)) for k, v in m.match.items()))) for m in self.map]
        if len(keys) != len(set(keys)):
            raise ValueError("duplicate map entry (same tool and match)")
        return self

    def decision(self, key: str) -> Decision | None:
        return next((d for d in self.decisions if d.key == key), None)

    def map_entry(self, tool: str, args: dict | None = None) -> MapEntry | None:
        args = args or {}
        fits = [m for m in self.map if m.tool == tool
                and all(str(args.get(k)) == str(v) for k, v in m.match.items())]
        fits.sort(key=lambda m: -len(m.match))
        return fits[0] if fits else None

    def links_for(self, tool: str) -> dict[str, str]:
        return {ln.arg: d.key for d in self.decisions for ln in d.links if ln.tool == tool}


class LoadedAdapter(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    manifest: Manifest
    root: Path
    overlay_root: Path | None = None

    @property
    def name(self) -> str:
        return self.manifest.adapter.name

    def standards_text(self) -> str:
        parts = [self.manifest.standards.strip()]
        if self.manifest.standards_file:
            parts.append((self.root / self.manifest.standards_file).read_text().strip())
        return "\n\n".join(p for p in parts if p)

    def resolve(self, rel: str) -> Path:
        return (self.root / rel).resolve()


def load_manifest(path: str | os.PathLike) -> LoadedAdapter:
    p = Path(path)
    file = p / "adapter.toml" if p.is_dir() else p
    with open(file, "rb") as fh:
        data = tomllib.load(fh)
    return LoadedAdapter(manifest=Manifest.model_validate(data), root=file.parent.resolve())


def user_adapter_dirs() -> list[Path]:
    root = Path(os.environ.get("GA_HOME", Path.home() / ".guided-analysis")) / "adapters"
    return sorted(d for d in root.glob("*") if (d / "adapter.toml").is_file()) if root.is_dir() \
        else []


def catalog() -> dict[str, Path]:
    found: dict[str, Path] = {}
    for ep in importlib.metadata.entry_points(group="guided_analysis.adapters"):
        try:
            found[ep.name] = Path(ep.load())
        except Exception:  # noqa: BLE001 — a broken third-party adapter must not stop discovery
            continue
    for d in user_adapter_dirs():
        found.setdefault(d.name, d)
    return found


def find_adapter(name_or_path: str) -> LoadedAdapter:
    p = Path(name_or_path).expanduser()
    if p.exists():
        return load_manifest(p)
    cat = catalog()
    if name_or_path not in cat:
        raise KeyError(f"no adapter named {name_or_path!r}; known: {sorted(cat)}")
    return load_manifest(cat[name_or_path])
