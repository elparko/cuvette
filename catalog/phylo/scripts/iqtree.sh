prog=$1
mode=$2
shift 2
dir=${CUVETTE_CALL_DIR:-.}
pre="$dir/run"
set -- "$@"
aln= model= btype=none nrep=1000 outgroup= seed=1
while [ $# -gt 0 ]; do
  case $1 in
    --alignment) aln=$2 ;;
    --model) model=$2 ;;
    --bootstrap-type) btype=$2 ;;
    --replicates) nrep=$2 ;;
    --outgroup) outgroup=$2 ;;
    --seed) seed=$2 ;;
  esac
  shift 2
done
[ -s "$aln" ] || { echo "error: alignment file not found: $aln" >&2; exit 1; }
args="-s $aln -pre $pre -seed $seed -T 1 -redo -quiet"
if [ "$mode" = select ]; then
  args="$args -m MF"
else
  args="$args -m ${model:-MFP}"
  case $btype in
    ufboot) args="$args -B $nrep" ;;
    standard) args="$args -b $nrep" ;;
  esac
  [ -n "$outgroup" ] && args="$args -o $outgroup"
fi
"$prog" $args > "$dir/stdout.txt" 2> "$dir/stderr.txt" || { tail -5 "$dir/stdout.txt" "$dir/stderr.txt" >&2; exit 1; }
rep=$pre.iqtree
echo "report=$rep"
echo "seed=$seed"
echo "bootstrap_type=${btype}"
[ "$mode" = select ] || { echo "bootstrap_replicates=$([ "$btype" = none ] && echo 0 || echo $nrep)"; echo "treefile=$pre.treefile"; }
[ -f "$pre.contree" ] && echo "consensus_tree=$pre.contree"
awk -v mode="$mode" '
/^Input data:/ { split($0, a, " "); n = a[3]; s = a[6] }
/^Best-fit model according to BIC:/ { sub(/^[^:]*: /, ""); bic = $0 }
/^Best-fit model according to AIC:/ { sub(/^[^:]*: /, ""); aic = $0 }
/^Best-fit model:/ { sub(/^Best-fit model: /, ""); sub(/ chosen according.*/, ""); fit = $0 }
/^Model of substitution:/ { sub(/^[^:]*: /, ""); used = $0 }
/^Log-likelihood of the tree:/ { ll = $5 }
/^Total tree length/ { tl = $NF }
/^Number of constant sites:/ { cs = $5 }
/^Number of distinct site patterns:/ { pat = $6 }
END {
  print "n_sequences=" n
  print "n_sites=" s
  if (used != "") print "model=" used
  else if (bic != "") print "model=" bic
  if (bic != "") print "best_model_bic=" bic
  if (aic != "") print "best_model_aic=" aic
  if (mode != "select" && ll != "") print "log_likelihood=" ll
  if (mode != "select" && tl != "") print "tree_length=" tl
  print "constant_sites=" cs
  print "site_patterns=" pat
}' "$rep"
