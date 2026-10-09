# Prompts

## Plain
1. I have a 16S table of 168 newborn meconium samples and a table with the clinical data. Which bacteria are linked to the gestational age of the baby?
2. Does it matter how the baby was born? Use only the vaginal births.
3. How many bacteria did you test, and how sure are you of the top result?

## Guided
I have a 16S OTU table of 168 newborn meconium samples and a sample table. Use only the babies born by vaginal delivery. Fit MaAsLin 2 with gestational age, gestational weight gain (reference adequate), maternal age and pre-pregnancy BMI as fixed effects. Use total sum scaling, remove OTUs that occur in fewer than 5 percent of the samples, and use the log transform. Report the number of samples, the number of OTUs tested, and the OTUs with q at or below 0.05.
