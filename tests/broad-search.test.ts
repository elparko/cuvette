import { homedir } from "node:os";
import { expect, test } from "vitest";
import { broadSearch, broadSearchInArgv, broadSearchInPython } from "../src/tools/broad-search.ts";

const project = "/Volumes/easystore/Lab images _ Uptake Assay";
const home = homedir();

test.each([
  ["import os\nfor base in ['/Users/parker','/Volumes']:\n    for root, dirs, files in os.walk(base):\n        print(root)\n", "/Users/parker"],
  ["import os\nfor root, d, f in os.walk('/'):\n    pass", "/"],
  ["import os\nfor r, d, f in os.walk(os.path.expanduser('~')):\n    pass", home],
  ["from pathlib import Path\nhits = list(Path.home().rglob('*.tif'))", home],
  ["from pathlib import Path\nhits = list(Path('/Volumes').rglob('20X_CH3.tif'))", "/Volumes"],
  ["import glob\nprint(glob.glob('/Users/**/20X_CH3.tif', recursive=True))", "/Users"],
  ["import glob\nprint(glob.glob('/Volumes/**/*.tif'))", "/Volumes"],
  ["import os\nroot = '/Volumes/easystore'\nfor r, d, f in os.walk(root):\n    pass", "/Volumes/easystore"],
  ["import os\nfor r, d, f in os.walk('..'):\n    pass", "/Volumes/easystore"],
  ["import subprocess\nsubprocess.run(['find', '/', '-name', 'Fiji.app'])", "/"],
  ["import subprocess\nsubprocess.run('mdfind -name 20X_CH3.tif', shell=True)", "the whole disk"],
  ["import os\nfor r, d, f in os.walk(os.environ['HOME']):\n    pass", home],
])("flags a broad search in Python: %#", (code, root) => {
  expect(broadSearchInPython(code, project)).toBe(root);
});

test.each([
  "import os\nfor root, dirs, files in os.walk('.'):\n    print(root)",
  `import os\nbase='${project}'\nfor root, dirs, files in os.walk(base):\n    print(root)`,
  "import glob\nprint(glob.glob('/Applications/Fiji*'))",
  "import glob\nprint(glob.glob('LDL/**/*.tif', recursive=True))",
  "from pathlib import Path\nprint(sorted(Path('LDL').rglob('*.tif')))",
  "import os\nfor r, d, f in os.walk(os.path.join(os.path.expanduser('~'), 'Desktop', 'exp1')):\n    pass",
  "import os\nfor r, d, f in os.walk('LDL'):\n    print(r.split('/')[-1], '/'.join(f))",
  "import os\nname = 'a' + '/' + 'b'\nfor r, d, f in os.walk(name):\n    pass",
  "import pandas as pd\nprint(pd.read_csv('/Users/parker/data.csv').describe())",
  "import shutil\nprint(shutil.which('ImageJ'))",
])("does not flag a project search or a plain read: %#", (code) => {
  expect(broadSearchInPython(code, project)).toBeUndefined();
});

test("command lines", () => {
  expect(broadSearchInArgv(["find", "/", "-name", "Fiji.app"], project)).toBe("/");
  expect(broadSearchInArgv(["find", "~", "-name", "*.tif"], project)).toBe(home);
  expect(broadSearchInArgv(["/usr/bin/find", "/Users", "-type", "d"], project)).toBe("/Users");
  expect(broadSearchInArgv(["find", "/Volumes", "-name", "x"], project)).toBe("/Volumes");
  expect(broadSearchInArgv(["mdfind", "20X_CH3.tif"], project)).toBe("the whole disk");
  expect(broadSearchInArgv(["mdfind", "-onlyin", "/Users", "x"], project)).toBe("/Users");
  expect(broadSearchInArgv(["ls", "-R", "/Volumes"], project)).toBe("/Volumes");
  expect(broadSearchInArgv(["bash", "-c", "cd /tmp && find / -name x"], project)).toBe("/");
  expect(broadSearchInArgv(["python3", "-c", "import os\nfor a in os.walk('/'): pass"], project)).toBe("/");
  expect(broadSearchInArgv(["find", ".", "-name", "*.tif"], project)).toBeUndefined();
  expect(broadSearchInArgv(["find", "LDL", "-name", "/"], project)).toBeUndefined();
  expect(broadSearchInArgv(["mdfind", "-onlyin", project, "x"], project)).toBeUndefined();
  expect(broadSearchInArgv(["ls", "/Volumes"], project)).toBeUndefined();
  expect(broadSearchInArgv(["git", "status"], project)).toBeUndefined();
});

test("only run_script and run_command are checked", () => {
  expect(broadSearch("run_script", { code: "import os\nos.walk('/')" }, project)).toBe("/");
  expect(broadSearch("run_command", { argv: ["find", "/"] }, project)).toBe("/");
  expect(broadSearch("list_dir", { path: "/" }, project)).toBeUndefined();
});
