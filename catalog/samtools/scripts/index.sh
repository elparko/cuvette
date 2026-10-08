sam=$1
bam=$2
dir=${GA_CALL_DIR:-.}
link="$dir/$(basename "$bam")"
ln -sf "$bam" "$link" || exit 1
"$sam" index "$link" || exit 1
echo "indexed_bam=$link"
echo "index=$link.bai"
