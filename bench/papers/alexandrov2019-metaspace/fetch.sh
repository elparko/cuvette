#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/alexandrov2019-metaspace"
mkdir -p "$D"
cd "$D"
cat > /tmp/ga_metaspace_fetch.py <<'P'
import json, sys
from metaspace import SMInstance
sm = SMInstance()
for dsid in ["2022-08-16_10h14m23s", "2022-08-16_12h31m33s"]:
    ds = sm.dataset(id=dsid)
    json.dump({"id": ds.id, "name": ds.name, "config": ds.config, "metadata": ds.metadata}, open(f"{dsid}_meta.json", "w"), indent=1, default=str)
    for db in [("HMDB", "v4"), ("LipidMaps", "2017-12-12")]:
        ds.results(database=db, fdr=0.1).to_csv(f"{dsid}_{db[0]}_fdr10.csv")
        print(dsid, db, len(ds.results(database=db, fdr=0.1)))
P
uv run --with metaspace2020 python /tmp/ga_metaspace_fetch.py
