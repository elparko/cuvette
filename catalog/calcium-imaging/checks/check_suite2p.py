import sys
import tempfile
from pathlib import Path

import numpy as np
import suite2p

movie = Path(sys.argv[1]).resolve()
work = Path(tempfile.mkdtemp(prefix="check_suite2p_"))
(work / "data").mkdir()
(work / "data" / movie.name).symlink_to(movie)
s = suite2p.default_settings()
s["fs"], s["tau"], s["diameter"], s["torch_device"] = 10.0, 1.0, [8.0, 8.0], "cpu"
s["registration"]["nonrigid"] = False
s["io"]["delete_bin"] = True
suite2p.run_s2p(settings=s, db={"data_path": [str(work / "data")], "save_path0": str(work / "out"), "nplanes": 1, "nchannels": 1})
plane = work / "out" / "suite2p" / "plane0"
F, Fneu, iscell = np.load(plane / "F.npy"), np.load(plane / "Fneu.npy"), np.load(plane / "iscell.npy")
print("Suite2p", suite2p.version if hasattr(suite2p, "version") else "")
print("F shape", F.shape, "Fneu shape", Fneu.shape, "cells with probability >= 0.5:", int((iscell[:, 1] >= 0.5).sum()))
