d <- read.csv("/Volumes/T7/guided-analysis/data/student1908-sleep/sleep.csv")
d <- d[order(d$ID), ]
g1 <- d$extra[d$group == 1]
g2 <- d$extra[d$group == 2]
p <- t.test(g2, g1, paired = TRUE)
w <- t.test(g2, g1, paired = FALSE, var.equal = FALSE)
diffs <- g2 - g1
n <- length(diffs)
t_hand <- mean(diffs) / (sd(diffs) / sqrt(n))
cat(R.version.string, "\n")
cat(sprintf("mean_difference %.4f\n", mean(diffs)))
cat(sprintf("paired_t %.4f (by hand %.4f)\n", p$statistic, t_hand))
cat(sprintf("degrees_of_freedom %d\n", as.integer(p$parameter)))
cat(sprintf("paired_p %.6f (by hand %.6f)\n", p$p.value, 2 * pt(-abs(t_hand), n - 1)))
cat(sprintf("ci_lower %.4f ci_upper %.4f\n", p$conf.int[1], p$conf.int[2]))
cat(sprintf("welch_p_trap %.5f (t %.4f, df %.3f)\n", w$p.value, w$statistic, w$parameter))
