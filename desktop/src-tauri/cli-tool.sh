#!/bin/sh
# Usage: [CUVETTE_PATH=<login PATH>] cli-tool.sh status | install <dir> <Cuvette.app> | uninstall <dir>
# Exit 3: <dir>/cuvette is another program. Exit 4: no write access to <dir>.
set -eu
MARK="# Cuvette.app command line tool"

ours() {
  grep -qF "$MARK" "$1" 2>/dev/null
}

writable() {
  if [ -e "$1" ]; then [ -w "$1" ]; else writable "$(dirname "$1")"; fi
}

case "${1:-}" in
  status)
    seen=":"
    old=$IFS
    IFS=:
    set -f
    for d in ${CUVETTE_PATH:-$PATH}; do
      [ -n "$d" ] || continue
      case "$seen" in *":$d:"*) continue ;; esac
      seen="$seen$d:"
      f="$d/cuvette"
      if [ -f "$f" ] && [ -x "$f" ]; then
        if ours "$f"; then echo "app $f"; else echo "other $f"; fi
      fi
    done
    IFS=$old
    ;;
  install)
    dir=$2
    app=$3
    target="$dir/cuvette"
    if [ -e "$target" ] && ! ours "$target"; then
      echo "$target is another program. Cuvette did not change it." >&2
      exit 3
    fi
    writable "$dir" || exit 4
    mkdir -p "$dir"
    q=$(printf '%s' "$app" | sed "s/'/'\\\\''/g")
    tmp="$target.tmp.$$"
    cat > "$tmp" <<EOF
#!/bin/sh
$MARK
APP='$q'
if [ ! -x "\$APP/Contents/MacOS/node" ]; then
  echo "cuvette: Cuvette.app is not at \$APP. Open Cuvette and choose Cuvette > Install Command Line Tool again." >&2
  exit 1
fi
exec "\$APP/Contents/MacOS/node" "\$APP/Contents/Resources/core/dist/cli.mjs" "\$@"
EOF
    chmod 755 "$tmp"
    mv -f "$tmp" "$target"
    echo "$target"
    ;;
  uninstall)
    target="$2/cuvette"
    [ -e "$target" ] || exit 0
    if ! ours "$target"; then
      echo "$target is another program. Cuvette did not remove it." >&2
      exit 3
    fi
    writable "$2" || exit 4
    rm -f "$target"
    echo "$target"
    ;;
  *)
    echo "usage: cli-tool.sh status | install <dir> <Cuvette.app> | uninstall <dir>" >&2
    exit 2
    ;;
esac
