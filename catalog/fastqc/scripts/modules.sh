[ -f "$1" ] || { echo "No file at $1. Use data_file from run_fastqc. The file is named fastqc_data.txt." >&2; exit 1; }
echo "module,status"
awk -F'\t' '/^>>END_MODULE/ { next } /^>>/ { print substr($1, 3) "," toupper($2) }' "$1"
