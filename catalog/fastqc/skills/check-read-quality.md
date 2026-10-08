---
name: check-read-quality
description: Steps to check the quality of one or more sequencing read files with FastQC and report the result.
---

# Check read quality

1. Make a list of the read files. FASTQ files can have any extension and can be gzip files.
2. Run run_fastqc for each file. Use the encoding that the scientist chose.
3. Read total_sequences, sequence_length, gc_percent and encoding from the result.
4. Read fail_modules and warn_modules. A file with no FAIL and no WARN has the value none.
5. Run read_modules with data_file if the scientist wants the full list.
6. Report each file by itself. Name each module that is WARN or FAIL.
7. Say which file has more problems. Do not say that a file must be trimmed or removed. Ask the scientist what to do.
