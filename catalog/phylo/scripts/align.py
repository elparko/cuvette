import subprocess
import sys

from fasta_stats import read_fasta, stats

mafft, algorithm, threads, src, out = sys.argv[1:6]
flags = {
    "auto": ["--auto"],
    "linsi": ["--localpair", "--maxiterate", "1000"],
    "ginsi": ["--globalpair", "--maxiterate", "1000"],
    "einsi": ["--genafpair", "--maxiterate", "1000"],
    "fftns2": ["--retree", "2", "--maxiterate", "0"],
}[algorithm]
proc = subprocess.run([mafft, "--quiet", "--thread", threads, *flags, src], capture_output=True, text=True)
if proc.returncode != 0 or not proc.stdout.strip():
    sys.exit("error: mafft failed: " + proc.stderr.strip()[-400:])
open(out, "w").write(proc.stdout)
in_names, in_seqs = read_fasta(src)
names, seqs = read_fasta(out)
intact = [s.replace("-", "").upper() for s in seqs] == [s.replace("-", "").upper() for s in in_seqs]
print(f"alignment={out}")
print(f"algorithm={algorithm}")
for k, v in stats(seqs).items():
    print(f"{k}={v}")
print(f"longest_input={max(len(s) for s in in_seqs)}")
print(f"sequences_intact={1 if intact else 0}")
