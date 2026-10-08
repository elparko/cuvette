. "$(dirname "$0")/lib.sh"
setup "$1"
[ -f "$2" ] || { echo "cannot read the input file" >&2; exit 1; }
file_kv "$2"
