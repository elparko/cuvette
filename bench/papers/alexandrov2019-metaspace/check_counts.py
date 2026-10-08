# Run: python3 -I check_counts.py
# Queries the METASPACE GraphQL API with the standard library. No metaspace2020 client.
# It takes all annotations up to FDR 50% and counts them by FDR level in this script.
# The annotations and their FDR values still come from the METASPACE engine.
import datetime
import json
import urllib.request

URL = "https://metaspace2020.org/graphql"
DBS = {"HMDB v4": 22, "LipidMaps 2017-12-12": 24}
DATASETS = ["2022-08-16_10h14m23s", "2022-08-16_12h31m33s"]


def gql(query, variables):
    req = urllib.request.Request(URL, json.dumps({"query": query, "variables": variables}).encode(), {"Content-Type": "application/json"})
    out = json.load(urllib.request.urlopen(req, timeout=60))
    if "errors" in out:
        raise SystemExit(out["errors"])
    return out["data"]


ANN = """query($ds: String, $db: Int) {
  allAnnotations(datasetFilter: {ids: $ds}, filter: {databaseId: $db, fdrLevel: 0.5}, limit: 50000) { sumFormula adduct fdrLevel offSample }
}"""
COUNT = """query($ds: String, $db: Int, $fdr: Float) {
  countAnnotations(datasetFilter: {ids: $ds}, filter: {databaseId: $db, fdrLevel: $fdr})
}"""

print("queried", datetime.date.today().isoformat())
for ds in DATASETS:
    info = gql("query($id: String!) { dataset(id: $id) { id name status databases { id name version } } }", {"id": ds})["dataset"]
    print(ds, info["name"], info["status"], [(d["id"], d["name"], d["version"]) for d in info["databases"]])
    for name, db in DBS.items():
        anns = gql(ANN, {"ds": ds, "db": db})["allAnnotations"]
        by = {lvl: sum(1 for a in anns if a["fdrLevel"] <= lvl + 1e-9) for lvl in (0.05, 0.1, 0.2, 0.5)}
        server = {lvl: gql(COUNT, {"ds": ds, "db": db, "fdr": lvl})["countAnnotations"] for lvl in (0.05, 0.1)}
        print(f"  {name}: own count by FDR level {by}; server countAnnotations {server}")
