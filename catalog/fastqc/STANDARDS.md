# FastQC reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- Use run_fastqc once for each read file. Use read_modules to list the statuses of one report.
- Give each file its own run. Do not merge the results of two files.

## What to report for each file

- Report the file name, the total number of reads, the read length and the percent GC.
- Report the encoding line and say if FastQC guessed it.
- List each module that is WARN or FAIL, by name. Say that all other modules are PASS.
- Say if the file is a subsample of the run.

## How to read the statuses

- A status is a rule of thumb. It is not a verdict on the data.
- A WARN or FAIL can be normal for some library types. Examples are amplicons and RNA-seq (base content, duplication levels).
- A PASS does not prove that the reads are good.
- A wrong quality encoding can change the quality modules. Check the encoding if the quality characters look unusual.

## Do not claim

- Do not say that a file is good enough to align, or that it needs trimming. The scientist decides on trimming and exclusion.
- Do not say what caused a FAIL without evidence from the report.
