"$1" idxstats "$2" | awk -F'\t' '
{
  name = $1
  if (name == "*") name = "unplaced"
  key = name
  gsub(/[^A-Za-z0-9]+/, "_", key)
  print "mapped_" key "=" $3
  print "unmapped_" key "=" $4
  print "length_" key "=" $2
  if (name != "unplaced") { n++; mapped += $3; unmapped += $4 }
  else { unplaced += $4 }
}
END { print "n_references=" n; print "mapped_total=" mapped; print "unmapped_placed=" unmapped; print "unmapped_unplaced=" unplaced }'
