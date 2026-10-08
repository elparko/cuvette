---
name: aperture-photometry
description: How to measure aperture fluxes with a sky ring and report them, with the photutils 100-source image as the example.
---

# Aperture photometry

1. Get positions. Use sources.csv from detect_sources, or pass x and y lists.
2. Run measure_apertures. The harness asks for the radius, the sky method and the ring radii.
3. Check the plot. The aperture must hold the source. The ring must hold only sky.
4. Report the radius, the sky method, the ring radii, the unit and the net flux of each source.
5. If the file has a WCS, the table has ra_deg and dec_deg.

Choose the radius from the source width. A radius of 4 sigma holds 99.97 percent of the flux of a Gaussian source. The ring must start outside the wings. A neighbor in the ring raises the sky level.

On the noise-free photutils image, a radius of 10 pixels and a ring of 15 to 20 pixels return the injected flux to 0.02 percent. On the noisy image the net flux has a noise of 2 x sqrt(area), 35 counts for a 10 pixel radius. Five isolated sources land within 1.4 times that noise of their injected flux.
