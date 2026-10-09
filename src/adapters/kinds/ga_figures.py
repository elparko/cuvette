import os
import sys

RASTER = (".png", ".jpg", ".jpeg", ".tif", ".tiff")
VECTOR = ("svg", "pdf", "eps")
DPI = 300


STYLE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cuvette.mplstyle")


def style_path():
    raw = os.environ.get("CUVETTE_FIGURE_STYLE", "").strip()
    if raw.lower() in ("none", "off", "0"):
        return None
    return raw or STYLE_FILE


def apply_style():
    path = style_path()
    if not path or not os.path.isfile(path):
        return
    try:
        import matplotlib.style

        matplotlib.style.use(path)
    except Exception as e:
        print("cuvette: figure style not applied: %s" % e, file=sys.stderr)


def formats():
    raw = os.environ.get("CUVETTE_FIGURE_FORMATS", "png,svg")
    return [f for f in (x.strip().lower().lstrip(".") for x in raw.split(",")) if f in VECTOR]


def _patch(figure_module):
    Figure = figure_module.Figure
    if getattr(Figure.savefig, "_cuvette", False):
        return
    apply_style()
    original = Figure.savefig

    def savefig(self, fname, *args, **kwargs):
        target = os.fsdecode(fname) if isinstance(fname, (str, bytes, os.PathLike)) else None
        ext = os.path.splitext(target)[1].lower() if target else ""
        raster = ext in RASTER and not kwargs.get("format")
        if raster:
            dpi = kwargs.get("dpi")
            if not isinstance(dpi, (int, float)) or dpi < DPI:
                kwargs["dpi"] = DPI
        out = original(self, fname, *args, **kwargs)
        if raster:
            import matplotlib

            keep = {k: v for k, v in kwargs.items() if k in ("bbox_inches", "pad_inches", "facecolor", "edgecolor", "transparent")}
            stem = os.path.splitext(target)[0]
            for fmt in formats():
                try:
                    with matplotlib.rc_context({"svg.fonttype": "none", "pdf.fonttype": 42}):
                        original(self, stem + "." + fmt, format=fmt, **keep)
                except Exception as e:
                    print("cuvette: no %s copy of %s: %s" % (fmt, target, e), file=sys.stderr)
        return out

    savefig._cuvette = True
    Figure.savefig = savefig


class _Finder:
    def find_spec(self, name, path=None, target=None):
        if name != "matplotlib.figure":
            return None
        sys.meta_path.remove(self)
        import importlib.util

        spec = importlib.util.find_spec(name)
        if spec is not None and spec.loader is not None:
            run = spec.loader.exec_module

            def exec_module(module):
                run(module)
                _patch(module)

            spec.loader.exec_module = exec_module
        return spec


def install():
    if "matplotlib.figure" in sys.modules:
        _patch(sys.modules["matplotlib.figure"])
    elif not any(isinstance(f, _Finder) for f in sys.meta_path):
        sys.meta_path.insert(0, _Finder())


if __name__ == "__main__":
    import runpy

    apply_style()
    script = sys.argv[1]
    sys.argv = sys.argv[1:]
    sys.path.insert(0, os.path.dirname(os.path.abspath(script)))
    runpy.run_path(script, run_name="__main__")
