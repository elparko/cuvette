import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { which } from "../adapters/locate.ts";

export const ACTION_NAME = "Analyze with Cuvette";
export const LAUNCHER_ID = "local.cuvette.launcher";

export interface GaPaths {
  node: string;
  ga: string;
  path: string;
}

export function gaPaths(env: Record<string, string | undefined> = process.env): GaPaths {
  const linked = which("ga", env.PATH ?? "");
  const own = resolve(dirname(fileURLToPath(import.meta.url)), "../../bin/ga.js");
  const ga = linked ? realpathSync(linked) : own;
  const path = [...new Set((env.PATH ?? "").split(":").filter((d) => d.startsWith("/") && existsSync(d)))].join(":");
  return { node: which("node", env.PATH ?? "") ?? process.execPath, ga, path };
}

export function servicesDir(home = homedir()): string {
  return join(home, "Library", "Services");
}

export function actionPath(home = homedir()): string {
  return join(servicesDir(home), `${ACTION_NAME}.workflow`);
}

export function launcherPath(home = homedir()): string {
  return join(home, "Applications", "Cuvette.app");
}

const sq = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;
const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function openScript(p: GaPaths): string {
  return [
    `NODE=${sq(p.node)}`,
    `GA=${sq(p.ga)}`,
    `export PATH="$PATH:"${sq([p.path, "/opt/homebrew/bin", "/usr/local/bin"].filter(Boolean).join(":"))}`,
    `LOGDIR="$HOME/.guided-analysis/logs"`,
    `mkdir -p "$LOGDIR"`,
    `cuvette_folder() {`,
    `  if [ -d "$1" ]; then printf '%s\\n' "$1"; else dirname "$1"; fi`,
    `}`,
    `cuvette_run() {`,
    `  dir="$1"`,
    `  if [ ! -x "$NODE" ] || [ ! -f "$GA" ]; then`,
    `    osascript -e 'display alert "Cuvette cannot start" message "Node or ga moved since the install. Run ga install-finder-action and ga install-launcher again in Terminal."'`,
    `    return 1`,
    `  fi`,
    `  if "$NODE" "$GA" help 2>/dev/null | grep -q '^  ga app'; then`,
    `    echo "$(date '+%F %T') ga app $dir" >> "$LOGDIR/launcher.log"`,
    `    cd "$dir" && nohup "$NODE" "$GA" app "$dir" >> "$LOGDIR/app.log" 2>&1 < /dev/null &`,
    `    disown 2>/dev/null`,
    `  else`,
    `    echo "$(date '+%F %T') Terminal ga $dir" >> "$LOGDIR/launcher.log"`,
    `    cmd="\${TMPDIR:-/tmp}/cuvette-$$.command"`,
    `    printf '#!/bin/bash\\nrm -f "$0"\\ncd %q && exec %q %q\\n' "$dir" "$NODE" "$GA" > "$cmd"`,
    `    chmod +x "$cmd"`,
    `    open -a Terminal "$cmd"`,
    `  fi`,
    `}`,
  ].join("\n");
}

export function actionScript(p: GaPaths): string {
  return [
    openScript(p),
    `dir=$(cuvette_folder "$1")`,
    `for app in "/Applications/Cuvette.app" "$HOME/Applications/Cuvette.app"; do`,
    `  if [ -d "$app" ]; then`,
    `    echo "$(date '+%F %T') open -a $app $dir" >> "$LOGDIR/launcher.log"`,
    `    open -a "$app" --args "$dir"`,
    `    exit 0`,
    `  fi`,
    `done`,
    `cuvette_run "$dir"`,
  ].join("\n");
}

export function launcherScript(p: GaPaths): string {
  return [
    "#!/bin/bash",
    openScript(p),
    `dir="$1"`,
    `case "$dir" in -psn_*) dir="" ;; esac`,
    `if [ -z "$dir" ]; then`,
    `  dir=$(osascript -e 'activate' -e 'POSIX path of (choose folder with prompt "Choose the folder with your data. Cuvette saves the results in this folder.")' 2>/dev/null) || exit 0`,
    `fi`,
    `cuvette_run "$(cuvette_folder "$dir")"`,
    "",
  ].join("\n");
}

const PLIST_HEAD = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n`;

export function actionInfoPlist(): string {
  return `${PLIST_HEAD}<dict>
	<key>NSServices</key>
	<array>
		<dict>
			<key>NSBackgroundColorName</key>
			<string>background</string>
			<key>NSIconName</key>
			<string>NSActionTemplate</string>
			<key>NSMenuItem</key>
			<dict>
				<key>default</key>
				<string>${ACTION_NAME}</string>
			</dict>
			<key>NSMessage</key>
			<string>runWorkflowAsService</string>
			<key>NSRequiredContext</key>
			<dict>
				<key>NSApplicationIdentifier</key>
				<string>com.apple.finder</string>
			</dict>
			<key>NSSendFileTypes</key>
			<array>
				<string>public.item</string>
			</array>
		</dict>
	</array>
</dict>
</plist>
`;
}

function arg(i: number, name: string, def: string): string {
  return `					<key>${i}</key>
					<dict>
						<key>default value</key>
						${def}
						<key>name</key>
						<string>${name}</string>
						<key>required</key>
						<string>0</string>
						<key>type</key>
						<string>0</string>
						<key>uuid</key>
						<string>${i}</string>
					</dict>`;
}

export function actionDocument(script: string, uuid: () => string = () => randomUUID().toUpperCase()): string {
  const finder = "/System/Library/CoreServices/Finder.app";
  return `${PLIST_HEAD}<dict>
	<key>AMApplicationBuild</key>
	<string>528</string>
	<key>AMApplicationVersion</key>
	<string>2.10</string>
	<key>AMDocumentVersion</key>
	<string>2</string>
	<key>actions</key>
	<array>
		<dict>
			<key>action</key>
			<dict>
				<key>AMAccepts</key>
				<dict>
					<key>Container</key>
					<string>List</string>
					<key>Optional</key>
					<true/>
					<key>Types</key>
					<array>
						<string>com.apple.cocoa.string</string>
					</array>
				</dict>
				<key>AMActionVersion</key>
				<string>2.0.3</string>
				<key>AMApplication</key>
				<array>
					<string>Automator</string>
				</array>
				<key>AMParameterProperties</key>
				<dict>
					<key>COMMAND_STRING</key>
					<dict/>
					<key>CheckedForUserDefaultShell</key>
					<dict/>
					<key>inputMethod</key>
					<dict/>
					<key>shell</key>
					<dict/>
					<key>source</key>
					<dict/>
				</dict>
				<key>AMProvides</key>
				<dict>
					<key>Container</key>
					<string>List</string>
					<key>Types</key>
					<array>
						<string>com.apple.cocoa.string</string>
					</array>
				</dict>
				<key>ActionBundlePath</key>
				<string>/System/Library/Automator/Run Shell Script.action</string>
				<key>ActionName</key>
				<string>Run Shell Script</string>
				<key>ActionParameters</key>
				<dict>
					<key>COMMAND_STRING</key>
					<string>${xml(script)}</string>
					<key>CheckedForUserDefaultShell</key>
					<true/>
					<key>inputMethod</key>
					<integer>1</integer>
					<key>shell</key>
					<string>/bin/bash</string>
					<key>source</key>
					<string></string>
				</dict>
				<key>BundleIdentifier</key>
				<string>com.apple.RunShellScript</string>
				<key>CFBundleVersion</key>
				<string>2.0.3</string>
				<key>CanShowSelectedItemsWhenRun</key>
				<false/>
				<key>CanShowWhenRun</key>
				<true/>
				<key>Category</key>
				<array>
					<string>AMCategoryUtilities</string>
				</array>
				<key>Class Name</key>
				<string>RunShellScriptAction</string>
				<key>InputUUID</key>
				<string>${uuid()}</string>
				<key>Keywords</key>
				<array>
					<string>Shell</string>
					<string>Script</string>
					<string>Command</string>
					<string>Run</string>
					<string>Unix</string>
				</array>
				<key>OutputUUID</key>
				<string>${uuid()}</string>
				<key>UUID</key>
				<string>${uuid()}</string>
				<key>UnlocalizedApplications</key>
				<array>
					<string>Automator</string>
				</array>
				<key>arguments</key>
				<dict>
${[arg(0, "inputMethod", "<integer>0</integer>"), arg(1, "CheckedForUserDefaultShell", "<false/>"), arg(2, "source", "<string></string>"), arg(3, "COMMAND_STRING", "<string></string>"), arg(4, "shell", "<string>/bin/sh</string>")].join("\n")}
				</dict>
				<key>conversionLabel</key>
				<integer>0</integer>
				<key>isViewVisible</key>
				<integer>1</integer>
				<key>location</key>
				<string>309.000000:305.000000</string>
				<key>nibPath</key>
				<string>/System/Library/Automator/Run Shell Script.action/Contents/Resources/Base.lproj/main.nib</string>
			</dict>
			<key>isViewVisible</key>
			<integer>1</integer>
		</dict>
	</array>
	<key>connectors</key>
	<dict/>
	<key>workflowMetaData</key>
	<dict>
		<key>applicationBundleID</key>
		<string>com.apple.finder</string>
		<key>applicationBundleIDsByPath</key>
		<dict>
			<key>${finder}</key>
			<string>com.apple.finder</string>
		</dict>
		<key>applicationPath</key>
		<string>${finder}</string>
		<key>applicationPaths</key>
		<array>
			<string>${finder}</string>
		</array>
		<key>inputTypeIdentifier</key>
		<string>com.apple.Automator.fileSystemObject</string>
		<key>outputTypeIdentifier</key>
		<string>com.apple.Automator.nothing</string>
		<key>presentationMode</key>
		<integer>15</integer>
		<key>processesInput</key>
		<false/>
		<key>serviceApplicationBundleID</key>
		<string>com.apple.finder</string>
		<key>serviceApplicationPath</key>
		<string>${finder}</string>
		<key>serviceInputTypeIdentifier</key>
		<string>com.apple.Automator.fileSystemObject</string>
		<key>serviceOutputTypeIdentifier</key>
		<string>com.apple.Automator.nothing</string>
		<key>serviceProcessesInput</key>
		<false/>
		<key>systemImageName</key>
		<string>NSActionTemplate</string>
		<key>useAutomaticInputType</key>
		<false/>
		<key>workflowTypeIdentifier</key>
		<string>com.apple.Automator.servicesMenu</string>
	</dict>
</dict>
</plist>
`;
}

export function launcherInfoPlist(): string {
  return `${PLIST_HEAD}<dict>
	<key>CFBundleExecutable</key>
	<string>Cuvette</string>
	<key>CFBundleIdentifier</key>
	<string>${LAUNCHER_ID}</string>
	<key>CFBundleName</key>
	<string>Cuvette</string>
	<key>CFBundleDisplayName</key>
	<string>Cuvette</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleShortVersionString</key>
	<string>1.0</string>
	<key>CFBundleVersion</key>
	<string>1</string>
	<key>LSMinimumSystemVersion</key>
	<string>11.0</string>
	<key>LSUIElement</key>
	<true/>
</dict>
</plist>
`;
}

export function actionFiles(p: GaPaths): Record<string, string> {
  return { "Contents/Info.plist": actionInfoPlist(), "Contents/document.wflow": actionDocument(actionScript(p)) };
}

export function launcherFiles(p: GaPaths): Record<string, string> {
  return { "Contents/Info.plist": launcherInfoPlist(), "Contents/MacOS/Cuvette": launcherScript(p) };
}

function writeBundle(dir: string, files: Record<string, string>): void {
  rmSync(dir, { recursive: true, force: true });
  for (const [rel, text] of Object.entries(files)) {
    const f = join(dir, rel);
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, text);
    if (rel.startsWith("Contents/MacOS/")) chmodSync(f, 0o755);
  }
}

const PBS = "/System/Library/CoreServices/pbs";
const LSREGISTER = "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister";

function quiet(cmd: string, args: string[]): void {
  if (existsSync(cmd)) spawnSync(cmd, args, { stdio: "ignore", timeout: 30_000 });
}

export function installFinderAction(opts: { home?: string; paths?: GaPaths } = {}): string {
  const dir = actionPath(opts.home);
  writeBundle(dir, actionFiles(opts.paths ?? gaPaths()));
  if (!opts.home) quiet(PBS, ["-update"]);
  return dir;
}

export function uninstallFinderAction(opts: { home?: string } = {}): boolean {
  const dir = actionPath(opts.home);
  if (!existsSync(dir)) return false;
  rmSync(dir, { recursive: true, force: true });
  if (!opts.home) quiet(PBS, ["-update"]);
  return true;
}

export function installLauncher(opts: { home?: string; paths?: GaPaths } = {}): string {
  const dir = launcherPath(opts.home);
  writeBundle(dir, launcherFiles(opts.paths ?? gaPaths()));
  if (!opts.home) quiet(LSREGISTER, ["-f", dir]);
  return dir;
}

export function uninstallLauncher(opts: { home?: string } = {}): boolean {
  const dir = launcherPath(opts.home);
  if (!existsSync(dir)) return false;
  if (!opts.home) quiet(LSREGISTER, ["-u", dir]);
  rmSync(dir, { recursive: true, force: true });
  return true;
}
