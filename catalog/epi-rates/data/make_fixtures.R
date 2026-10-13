out <- file.path(dirname(sub("^--file=", "", grep("^--file=", commandArgs(FALSE), value = TRUE))), "")
age11 <- c("under 1", "1-4", "5-14", "15-24", "25-34", "35-44", "45-54", "55-64", "65-74", "75-84", "85 and over")
std2000 <- c(13818, 55317, 145565, 138646, 135573, 162613, 134834, 87247, 66037, 44842, 15508)
rates <- list(
  all_2020 = c(524.3, 22.7, 13.7, 84.2, 159.5, 248.0, 473.5, 1038.9, 2072.3, 4997.0, 15210.9),
  all_2019 = c(553.0, 23.3, 13.4, 69.7, 128.8, 199.2, 392.4, 883.3, 1764.6, 4308.3, 13228.6),
  heart_2020 = c(6.5, 0.7, 0.4, 2.0, 8.6, 28.9, 84.6, 208.8, 414.2, 1017.2, 3822.1),
  male_2020 = c(569.1, 25.5, 16.1, 121.9, 221.1, 325.5, 601.5, 1323.3, 2581.7, 5937.2, 16354.9),
  female_2020 = c(477.5, 19.7, 11.3, 44.8, 95.7, 170.7, 348.8, 773.1, 1626.8, 4261.1, 14560.0))
nchs <- do.call(rbind, lapply(names(rates), function(g) data.frame(group = g, age_group = age11, rate_per_100000 = rates[[g]], std_pop_2000 = std2000)))
write.csv(nchs, paste0(out, "nchs_2020_age_rates.csv"), row.names = FALSE)

.libPaths(c(Sys.getenv("CUVETTE_R_LIBS", file.path(Sys.getenv("HOME"), ".cuvette", "R-library")), .libPaths()))
population <- matrix(c(230061, 329449, 114920, 39487, 14208, 3052, 72202, 326701, 208667, 83228, 28466, 5375, 15050, 175702,
  207081, 117300, 45026, 8660, 2293, 68800, 132424, 98301, 46075, 9834, 327, 30666, 123419, 149919, 104088, 34392), 6, 5)
count <- matrix(c(107, 141, 60, 40, 39, 25, 25, 150, 110, 84, 82, 39, 3, 71, 114, 103, 108, 75, 1, 26, 64, 89, 137, 96, 0, 8, 63, 112, 262, 295), 6, 5)
ages <- c("under 20", "20-24", "25-29", "30-34", "35-39", "40 and over")
orders <- c("1", "2", "3", "4", "5 or more")
standard <- rowMeans(population)
ff <- do.call(rbind, lapply(1:5, function(j) data.frame(birth_order = orders[j], age_group = ages, count = count[, j], population = population[, j], standard = standard)))
write.csv(ff, paste0(out, "fay_feuer_births.csv"), row.names = FALSE)

sel <- data.frame(
  age_group = c("<1", "1-4", "5-14", "15-24", "25-34", "35-44", "45-54", "55-64", "65-74", "75-84", "85+"),
  deaths_1960 = c(141, 926, 1253, 1080, 1869, 4891, 14956, 30888, 41725, 26501, 5928),
  population_1960 = c(1784033, 7065148, 15658730, 10482916, 9939972, 10563872, 9114202, 6850263, 4702482, 1874619, 330915),
  deaths_1940 = c(45, 201, 320, 670, 1126, 3160, 9723, 17935, 22179, 13461, 2238),
  population_1940 = c(906897, 3794573, 10003544, 10629526, 9465330, 8249558, 7294330, 5022499, 2920220, 1019504, 142532))
write.csv(sel, paste0(out, "selvin_us_deaths.csv"), row.names = FALSE)

write.csv(data.frame(group = c("unexposed", "exposed"), events = c(15, 41), person_years = c(19017, 28010)), paste0(out, "rothman_breast_cancer.csv"), row.names = FALSE)
write.csv(data.frame(group = c("lowest", "intermediate", "highest"), cases = c(2, 35, 12), total = c(31, 99, 18)), paste0(out, "tap_water.csv"), row.names = FALSE)
