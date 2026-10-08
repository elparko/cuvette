# Cardinal reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- Run the tools in this order: load_image, process_peaks, segment_image, top_features.
- Use plot_segments to show a segment map to the scientist.
- Pass the file that one tool returns to the next tool. Do not invent file paths.
- Fit several values of s in one segment_image call. Compare the models before you report one.

## What to report

- Report the number of spectra and m/z values, the normalization, the signal-to-noise ratio, the
  alignment tolerance, the random seed, r, k and the weights.
- Report the number of peaks after peak picking.
- Report the number of segments for each s that you fitted. Say which s you report and why.
- Name the Cardinal version.

## How to read the result

- A segment is a group of pixels with similar spectra. It is not a tissue type.
- A segment number has no meaning. The numbers change with the random seed.
- A higher s gives fewer segments. A real small region can disappear at a high s.
- The ions that top_features lists mark a segment. They are not proof of a cause.
- Pixels in one section are not independent samples. Do not give a p value from pixels.

## Do not claim

- Do not name an organ for a segment without an optical image, histology or a known marker ion.
- Do not say that the number of segments is the true number of regions.
- Do not use numbers from the Cardinal paper (11 segments, 298 peaks) for a single section. The
  paper used five sections.
