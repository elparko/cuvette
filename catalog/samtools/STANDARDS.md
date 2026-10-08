# samtools reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- Use the named tools. Each tool runs one samtools command.
- Pass the path that the last step gave. Use bam from sort_bam. Use indexed_bam from index_bam.
- A SAM file with no header needs the reference FASTA file at the conversion step.
- Answer each question in the request. If a question needs a tool call, make the call before you write the answer. Do not write "I will use" and stop.
- For a question about a region, call count_reads with the region.

## Counts

- Say which tool made each number: flagstat, idxstats or count_reads.
- flagstat counts all reads. count_reads counts only the reads that pass its filters.
- State the mapping quality cutoff and the flag filters of each count. Write "none" if there are none.
- A read is one line of the file. A proper pair has two reads. Do not call a read count a fragment count.
- Report mapped, properly paired and singleton reads as counts of reads. Give the total with them.

## Regions

- Write a region as sequence:start-end. The positions start at 1 and include both ends.
- A region count needs a sorted and indexed BAM file.
- A read that overlaps the region edge is in the count.

## Do not claim

- Do not say that a read mapped in the right place only because its flag says mapped.
- Do not say that low mapping quality reads are errors. Say that the aligner is not sure of their place.
