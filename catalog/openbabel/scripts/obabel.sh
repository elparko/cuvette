log=$(mktemp)
"$@" 2>"$log"
status=$?
cat "$log" >&2
grep -q -e "Cannot open" -e "^0 molecules converted" "$log" && status=1
rm -f "$log"
exit $status
