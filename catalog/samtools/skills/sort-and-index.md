---
name: sort-and-index
description: Steps to sort and index alignments so a viewer can open them.
---

# Sort and index

1. If the input is a SAM file, run convert_to_bam first. A SAM file with no header needs the reference FASTA file.
2. Run sort_bam. The result has the path of the sorted BAM file.
3. Run index_bam with that path. The result has indexed_bam and index.
4. Tell the scientist both paths. A viewer needs the BAM file and its index in the same folder.
5. Say that the files are in the session work folder. Ask the scientist before you copy them elsewhere.
