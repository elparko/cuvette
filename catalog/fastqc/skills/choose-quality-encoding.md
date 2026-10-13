---
name: choose-quality-encoding
description: Steps to check the quality score encoding of a read file before you trust the quality modules.
---

# Check the quality encoding

1. Run run_fastqc with encoding auto. Read the encoding value of the result.
2. Look at the FastQC log text in the result. A line such as "could this file be Phred64 encoded?" means the guess can be wrong.
3. The characters in the quality line of the file show the encoding. Lower case letters and the characters from 64 to 104 mean Illumina 1.3 to 1.7 (Phred+64).
4. Ask the scientist which encoding the sequencing run used. Do not choose it.
5. If the scientist says phred64, call propose_change with the key encoding and the value phred64. Then run run_fastqc again.
6. Report both results if they differ. Say which modules changed.
