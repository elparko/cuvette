here=$(cd "$(dirname "$0")" && pwd)
script=$1
shift
exec python3 "$here/$script" "$@"
