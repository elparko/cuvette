import sys

d = sys.argv[1] if len(sys.argv) > 1 else "/Volumes/T7/guided-analysis/data/andrews-fastqc"

for name in ("good_sequence_short.txt", "bad_sequence.txt"):
    n = gc = acgt = 0
    lengths = set()
    with open(f"{d}/{name}") as f:
        for i, line in enumerate(f):
            if i % 4 == 1:
                s = line.strip().upper()
                n += 1
                lengths.add(len(s))
                gc += s.count("G") + s.count("C")
                acgt += sum(s.count(c) for c in "ACGT")
    print(f"{name} total_sequences {n} sequence_length {sorted(lengths)} gc_percent {100 * gc / acgt:.2f}")
