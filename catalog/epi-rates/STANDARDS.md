# Epidemiology rates reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- estimate_rate gives one rate or proportion for each group, with an exact interval.
- compare_rates compares group A with group B. Group A is the exposed or treated group. Group B is the reference.
- standardize_rates standardizes rates by age, directly or indirectly.
- The tools read counts, person-time and rates. They read no data of persons.

## What to report

- The numerator, the denominator and the unit of the denominator, for example person-years.
- The rate multiplier, for example per 100,000, and the confidence level.
- The interval method. Name exact, mid-p, Wald, Wilson or gamma.
- For a standardized rate: the method (direct or indirect), the standard population or the reference rates, and the age groups.
- For a ratio or difference: say which group is the numerator and which is the reference.
- For a number needed to treat: the follow-up time of the risks and the direction (benefit or harm).
- The version of the package.

## How to read the result

- A rate has person-time in the denominator. A proportion has the number at risk. Do not mix them.
- A crude rate depends on the age structure. Compare populations with standardized rates.
- A directly standardized rate depends on the standard population. Two standards can give different ratios.
- An indirect ratio compares one group with the reference. Two indirect ratios from different groups are not comparable with each other.
- The exact interval never falls below the stated level. The mid-p interval is shorter and can fall slightly below it.
- The interval of the number needed to treat has infinity inside if the interval of the risk difference includes 0. Report it as such.
- The population attributable fraction depends on the exposure prevalence of the population. The sample share is a valid value only if the sample represents the population.
- An odds ratio is not a risk ratio if the outcome is common.

## Do not claim

- Do not say that the exposure caused the attributable fraction of the cases. This needs a causal effect with no confounding.
- Do not compare crude rates of populations with different age structures.
- Do not give a number needed to treat with no follow-up time.
- Do not give a standardized rate with no standard population.
- Do not give an interval for a standardized rate that comes from a table with rates only. The tool gives none.
