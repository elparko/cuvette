# bedtools reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- Use the named tools. Each tool runs one bedtools command.
- Answer each question in the request. If a question needs a tool call, make the call before you write the answer. Do not write "I will use" and stop.
- Ask the scientist for the genome build, the overlap fractions, the strand rule and the merge distance. Do not choose them.
- Give the absolute path of each file.

## Counts

- Say which tool made each number.
- State the overlap rule of each count: the fraction of A, the fraction of B, reciprocal or not, and the strand rule. Write "default" if you used the defaults (1 base).
- Say what a number counts: pairs of A and B, A intervals, or bases. One A interval can overlap many B intervals.
- To count the A intervals with an overlap, use report unique_a. To count pairs and bases, use report pairs. Call the tool again if the question needs both.
- Name the genome build of both files. Say that it is not known if the files do not say.
- Say which file is A and which is B. A fraction of A and a fraction of B are different rules.

## Coordinates

- BED start positions are zero-based. The end is not included. The BED interval chr1 100 200 is the region chr1:101-200.
- A strand rule needs a strand column (column 6) in both files.
- Merge needs a sorted file. The tool sorts the file first.

## Do not claim

- Do not say that an overlap shows a function or a cause. It shows only that two intervals share bases.
- Do not compare counts from two overlap rules as if they used the same pairs.
