---
name: rates-and-standardization
description: Steps to compare rates of populations with different age structures by direct or indirect standardization.
---

# Age standardization of rates

1. Read the file. Find the columns for the age group, the events, the population or person-years, and the group.
2. Ask the scientist for the rate multiplier and the confidence level.
3. Ask if the table holds counts or only rates. With rates only, the tool gives no interval.
4. Ask which method to use. Direct standardization needs age-specific rates in each group. Indirect standardization needs reference rates and the age structure of the group.
5. For the direct method, ask which standard population to use. The age groups of the table must match the standard. If the standard is not in the tool, give the weights in a column.
6. For the indirect method, ask for the source, the place and the year of the reference rates.
7. Run standardize_rates. Give the group names for the ratio of two standardized rates.
8. Report the crude rate and the standardized rate of each group. Name the method and the standard.
9. If the groups have few events, say that the age-specific rates are unstable. Offer the indirect method.
10. Do not call a difference real from crude rates alone.
