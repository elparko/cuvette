# Astronomical image reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- Call inspect_fits first. Read the shape, the unit (BUNIT), and whether a WCS exists.
- The scientist owns the sigma-clip level, the background method and box size, the source mask, the detection threshold, the aperture radius and the sky ring. Do not choose them. The harness asks for each value.
- Pass the file that estimate_background writes to detect_sources. That file carries the noise map.
- If the scientist names pixel positions, pass them to measure_apertures as the x and y lists. Do not use the detection table for them. Report one flux for each named position, in the order given.
- Pixel positions are 0-based in every tool. The FITS header CRPIX is 1-based.

## Background and noise

- Report the method, the clip level, the box size and the estimator. Say if sources were masked.
- Sources raise the sigma-clipped median. Mask them, or say that the background is an upper limit.
- Clipping at 3 sigma makes the standard deviation of Gaussian noise read about 1.5 percent low.
- Report the background and the noise with the image unit.

## Detection

- Report the threshold in sigma, the minimum connected pixels, the smoothing width and whether touching sources were split. The source count changes with each of them.
- A threshold of 3 sigma gives noise detections in a large image. Say so. Do not call every detection a real source.
- Do not state a completeness. The count of faint sources depends on the threshold.

## Photometry

- Report the aperture radius, the sky method, the ring radii and the unit.
- An aperture loses the flux of the wings of a source. Say it is an aperture flux, not a total flux.
- The ring must start outside the aperture and outside the wings of the source. Neighbors in the ring bias the flux.
- The noise of a net flux grows with the square root of the aperture area. Report an uncertainty if the noise is known.
