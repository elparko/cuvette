echo "module,status"
awk -F'\t' '/^>>END_MODULE/ { next } /^>>/ { print substr($1, 3) "," toupper($2) }' "$1"
