# Prompts

## Plain
1. I have mass cytometry files of blood cells from 8 donors, each with and without B cell stimulation. Which cell types change in frequency?
2. How many cells does each file hold, and what percent of the cells are NK cells in each file?
3. Does it matter that each donor gave two samples?

## Guided
I have mass cytometry data of peripheral blood cells from 8 healthy donors. Each donor has an unstimulated (Reference) file and a file stimulated through the B cell receptor (BCR-XL). Cluster the cells with the 10 lineage markers and an arcsinh cofactor of 5. Count the cells of each cell type in each sample. Test each cell type for a difference in frequency between BCR-XL and Reference with a binomial mixed model that compares each donor with itself. Then repeat the test without the pairing. The samples are the units of replication.
