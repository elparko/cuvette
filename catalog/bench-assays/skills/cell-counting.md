---
name: cell-counting
description: Steps to get cells per mL and viability from a hemocytometer or counter, and to plan a seeding volume.
---

# Cell counting

A hemocytometer count gives the number of cells in a known volume. One large square of a Neubauer chamber holds 0.1 microliter, so one cell in one large square is 10000 cells/mL.
Trypan blue stains dead cells. Live cells stay clear.

1. Read the file. Find the columns for the sample, the live count, the dead count and the number of large squares. For a counter export, find live/mL, total/mL and viability.
2. Ask the scientist for the dilution factor. Cells and trypan blue in equal parts give 2.
3. For a counter export, ask if the export already includes the dilution factor.
4. Ask for the target: a number of cells, or a density and a final volume.
5. Run cell_counts. Read cells/mL, the CV between counts, the viability and the flags.
6. Look at the plot. Check that the counts of one sample agree.
7. Report the dilution factor, the squares, the number of cells counted, cells/mL, viability and the volumes.

## Common mistakes

- Counting cells on the lines. Count the cells on the top and left lines. Skip the cells on the bottom and right lines. A cell that touches both counts twice.
- A forgotten dilution factor. The trypan blue mixture dilutes the cells. Multiply by the factor.
- Too few cells. A count of fewer than 100 cells has a large sampling error. Count more squares or a more concentrated sample.
- Too many cells. More than about 100 cells in a large square makes clumps and counting errors. Dilute the sample and count again.
- Clumps and debris. Mix the sample well before you load the chamber. Do not count debris as cells.
- Late counting. Trypan blue kills cells with time. Count within a few minutes.
- Seeding on total cells. Seed on live cells. The tool uses live cells.
- A counter export that already includes the dilution factor. Ask before you multiply.
- A different chamber. The factor 10000 is for a Neubauer large square. Use the factor of your chamber.

## Stop and ask

- Fewer than 100 cells counted for a sample.
- The CV between counts of one sample is above about 15 percent.
- Viability is below the limit of the lab for the experiment.
- The volume of cells is more than the final volume. The cells are too dilute for the target.
