# Cuvette for Mac

The Mac app is a small window around the browser app (`ga app`). The window is a Tauri 2 shell
in Rust. The core is the same Node code as the terminal tool. It runs in the app as a sidecar.

## Install: terminal or desktop

There are two installs. Both use the same core.

- Terminal: install the npm package. You get `cuvette` (and the old name `ga`). `cuvette app`
  opens the browser app. Until the package is on npm, run `npm install`, then `npm link`, in this
  repository. The npm package does not contain `desktop/` or the build output.
- Desktop: open `Cuvette-<version>-arm64.dmg` and drag Cuvette to Applications.

The desktop app can also give you the `cuvette` command in Terminal. Choose
Cuvette > Install Command Line Tool. Cuvette asks where to put it:

- `/usr/local/bin`: for all users. macOS asks for an administrator password.
- `~/.local/bin`: for you only. No password.

The command runs the core inside Cuvette.app. Thus Terminal and the app use one core and one
version. If an npm install of `cuvette` is also on the Mac, Cuvette shows which one Terminal runs
now, and asks which one it must run. If the folder of the npm install comes first in PATH,
Cuvette shows the line to add to `~/.zprofile`. Cuvette never changes a `cuvette` file that it did
not write. Cuvette > Uninstall Command Line Tool removes only its own file.

If you moved Cuvette.app after the install, the command tells you to install it again.

## How it works

1. The shell starts `Contents/MacOS/node Contents/Resources/core/dist/sidecar.mjs [folder]`.
2. The sidecar gets the PATH of your login shell, so that the check finds uv, R, Java and the
   programs. It keeps the PATH in `~/.guided-analysis/desktop-path.txt` and makes it new at each
   start.
3. The sidecar starts the app server on 127.0.0.1 with a random port and a random token. It
   writes one line to stdout: `{"port":…, "token":…, "url":…}`. Only the shell reads this pipe.
4. The window opens the URL with the token. The page can use the Mac functions only from this
   port (a Tauri capability for this one origin).
5. When you quit, the shell closes the stdin of the sidecar. The sidecar closes the session and
   stops. If the shell stops in an unusual way, the closed pipe also stops the sidecar.

The log of the last start is `~/.guided-analysis/logs/desktop.log`.

The page keeps its browser fallbacks. In the window, it uses these Mac functions:

| Page action | Mac function |
| --- | --- |
| Choose a folder | The macOS folder dialog |
| Show in Finder | Finder with the file selected |
| Notification | macOS notification |
| Save a file (links with `download`) | The macOS save dialog |

Links to other sites, and links that open a new tab, open in your default browser.

### Open a folder

- File > Open Folder (Command-O).
- Drag a folder onto the Cuvette icon in the Dock.
- In Terminal: `open -a Cuvette /path/to/folder`. The form `open -a Cuvette --args <folder>` works
  only when Cuvette is not open.
- In Finder: the Quick Action "Analyze with Cuvette" (`ga install-finder-action`). It opens
  Cuvette.app with the folder.

If the first start is not complete, Cuvette shows the first start first. Then open the folder
again.

### The sidecar bundle

`desktop/scripts/build.mjs` bundles `desktop/sidecar/main.ts` and `src/cli.ts` with esbuild into
ES modules in `core/dist/`. An esbuild plugin changes each `import.meta.url` in `src/` to the
place of the source file in `core/`. Thus the code finds `catalog/`, `samples/` and the Python
helper files as it does in the repository.

Node's single executable application (SEA) is not a good fit for this code. The core starts
child processes with `process.execPath`, and the sidecar must also run the full CLI for the
`cuvette` command. A SEA binary runs only its own script. Thus the app has a plain Node binary
and the bundle.

The Node binary is Node 24.21.0 (LTS), built from source one time with these options:
`--with-intl=small-icu --without-inspector --without-amaro --without-npm --without-corepack
--without-sqlite`. The official binary is 122 MB (98 MB after `strip`). Most of the difference is
the full ICU data. Effects of the options: `Intl` has English data only; `node --inspect` and the
built-in TypeScript type stripping are not available; `node:sqlite` is not available. The core
does not use these.

## Build

You need:

- Xcode Command Line Tools.
- Rust through rustup. `desktop/src-tauri/rust-toolchain.toml` selects Rust 1.90.0; rustup
  installs it on the first build.
- uv (the DMG step runs `uvx dmgbuild`).
- About 4 GB of free disk for the first build. Build the Node binary and the Rust output on
  another disk with `CUVETTE_CACHE` and `CARGO_TARGET_DIR`.

```bash
npm install
npm run desktop:build
```

The first build compiles Node from source (20 to 40 minutes). The script keeps the result in
`$CUVETTE_CACHE` (default `~/.cache/cuvette`) and deletes the source tree. Later builds skip this
step. `CUVETTE_NODE=/path/to/node` uses a Node binary that you give. `CUVETTE_JOBS` sets the
number of parallel compile jobs for Node and Rust (default 4).

The output is in `desktop/build/`:

- `Cuvette.app`
- `Cuvette-<version>-arm64.dmg`: Cuvette.app and a link to Applications, for drag and drop.

The script prints the size of each part.

The build is for Apple silicon (arm64) only. macOS 13.5 or later.

Sizes of build 0.1.0 (MiB):

| Part | Size |
| --- | --- |
| Cuvette.app | 68.4 |
| Node binary (`Contents/MacOS/node`) | 58.7 |
| Shell (`Contents/MacOS/cuvette`) | 4.4 |
| Core (`Contents/Resources/core`: bundle 2.8, catalog, sample) | 5.1 |
| Disk image (.dmg, LZMA) | 17.2 |

With the official Node binary, Cuvette.app is 102.7 MiB and the disk image is 26.7 MiB.

Memory after the start, idle on the start page (RSS, measured with `ps`):

| Process | RSS (MB) |
| --- | --- |
| Shell (`cuvette`) | 72 to 78 |
| Sidecar (`node`) | 170 to 186 (footprint 120 to 138) |
| WebKit helpers (GPU, Networking, 2 or 3 WebContent) | 16 to 37 each, about 150 in total |

The sidecar alone, before the page loads, uses 77 MB RSS (44 MB footprint).

`npm run desktop:dev` starts the shell in debug mode. The debug shell runs the sidecar from the
source with `node --import tsx desktop/sidecar/main.ts`, so a change in `src/` shows after a
reload (Command-R) or a restart.

The app icon comes from `desktop/icon/make.py` (`python3 desktop/icon/make.py`, needs
`rsvg-convert`). It draws a bolder cuvette than the mark in cuvette-art, and a simpler version
for 16 and 32 pixels.

### Check without a window

`CUVETTE_HIDDEN=1 desktop/build/Cuvette.app/Contents/MacOS/cuvette` starts the app with a hidden
window and no Dock icon. The sidecar and the page load as usual.

## First open of an app without a signature

The app has no signature. An app that you build on your Mac opens with a double-click. A copy that
came from the internet, a chat or AirDrop has a quarantine flag, and macOS blocks it the first
time:

1. Drag Cuvette to Applications.
2. Control-click (or right-click) Cuvette, then choose Open. Choose Open again.
3. On macOS 15 and later, step 2 can show only "Move to Trash" and "Done". Choose Done. Open
   System Settings > Privacy & Security, find the message about Cuvette, and choose Open Anyway.

After the first open, Cuvette opens with a double-click.

## Sign and notarize later

You need an Apple Developer ID (Apple Developer Program, 99 USD per year). Do these steps when
you have it:

1. In Xcode > Settings > Accounts, add the Apple ID. Create a "Developer ID Application"
   certificate. Find its name: `security find-identity -v -p codesigning`.
2. Make an app-specific password at account.apple.com. Save it for notarytool:
   `xcrun notarytool store-credentials cuvette --apple-id <id> --team-id <team> --password <pw>`.
3. Sign the Node binary with the hardened runtime and the JIT entitlement (V8 needs it). Add
   `desktop/src-tauri/entitlements.plist` with `com.apple.security.cs.allow-jit` and
   `com.apple.security.cs.allow-unsigned-executable-memory`, and set
   `bundle.macOS.entitlements` to it in `tauri.conf.json`.
4. Set `bundle.macOS.signingIdentity` to the certificate name, or set
   `APPLE_SIGNING_IDENTITY`. Tauri signs the shell and the sidecar (`externalBin`).
5. Set `APPLE_ID`, `APPLE_PASSWORD` (the app-specific password) and `APPLE_TEAM_ID`. Then
   `tauri build` notarizes and staples the app.
6. Sign the DMG: `codesign --sign "<certificate name>" Cuvette-<version>-arm64.dmg`. Notarize it:
   `xcrun notarytool submit Cuvette-<version>-arm64.dmg --keychain-profile cuvette --wait`. Then
   `xcrun stapler staple Cuvette-<version>-arm64.dmg`.
7. Check: `spctl -a -vvv -t install Cuvette-<version>-arm64.dmg` and
   `spctl -a -vvv /Applications/Cuvette.app` must say "accepted, source=Notarized Developer ID".

## Limits

- The onboarding adapter (`ga onboard`) needs tsx. It does not run in the app. Use the terminal
  install for it.
- The app does not contain the known-answer test data of the adapters (`catalog/*/data`, 12 MB).
  `ga adapter check --run-tests` needs the repository.
- `ga install-launcher` makes a different `~/Applications/Cuvette.app` (a small script). If you
  use the desktop app, remove it with `ga uninstall-launcher`.
- File > Recent Sessions shows the Sessions page. It is not a list in the menu.
