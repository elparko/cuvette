fastqc=$1
file=$2
encoding=$3
here=$(dirname "$0")
dir=${GA_CALL_DIR:-.}
mkdir -p "$dir/report"
flags="--extract --quiet"
[ "$encoding" = "phred64" ] && flags="$flags --phred64"
"$fastqc" $flags --outdir "$dir/report" "$file" >/dev/null 2>"$dir/fastqc.log" || { cat "$dir/fastqc.log" >&2; exit 1; }
data=$(ls "$dir"/report/*_fastqc/fastqc_data.txt 2>/dev/null | head -1)
[ -n "$data" ] || { echo "FastQC wrote no fastqc_data.txt" >&2; exit 1; }
echo "data_file=$data"
echo "html_report=$(ls "$dir"/report/*_fastqc.html | head -1)"
sh "$here/summary.sh" "$data"
