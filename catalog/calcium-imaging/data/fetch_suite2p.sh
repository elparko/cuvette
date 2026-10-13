#!/usr/bin/env bash
# Gets the CaImAn demo movie for the Suite2p test. fetch.sh checks its sha256sum. Exit code 7 (skip) if no Suite2p interpreter is installed.
set -euo pipefail
cd "$(dirname "$0")"
for p in "${CUVETTE_SUITE2P_PYTHON:-}" "$HOME/.cuvette/envs/suite2p/bin/python" "$HOME/.guided-analysis/envs/suite2p/bin/python"; do
  if [ -n "$p" ] && [ -x "$p" ]; then
    bash fetch.sh
    touch demo/suite2p_ok
    exit 0
  fi
done
echo "Suite2p is not installed. The test needs it." >&2
exit 7
