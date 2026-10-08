import os
import warnings

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from astropy.convolution import convolve
from astropy.io import fits
from astropy.stats import SigmaClip, sigma_clipped_stats
from astropy.visualization import simple_norm
from astropy.wcs import WCS
from photutils.aperture import ApertureStats, CircularAnnulus, CircularAperture, aperture_photometry
from photutils.background import (
    Background2D,
    MeanBackground,
    MedianBackground,
    MMMBackground,
    SExtractorBackground,
)
from photutils.segmentation import SourceCatalog, SourceFinder, make_2dgaussian_kernel
from scipy import ndimage

warnings.filterwarnings("ignore")

ESTIMATORS = {
    "sextractor": SExtractorBackground,
    "median": MedianBackground,
    "mean": MeanBackground,
    "mmm": MMMBackground,
}
MASK_NSIGMA = 3.0
MASK_NPIXELS = 5
MASK_DILATION = 11


def _fail(message):
    return {"ok": False, "error": message}


def _clean(value):
    if isinstance(value, (np.floating, float)):
        return None if not np.isfinite(value) else float(value)
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, np.bool_):
        return bool(value)
    return value


def _table(frame, name, limit=15):
    path = os.path.join(os.getcwd(), name + ".csv")
    frame.to_csv(path, index=False)
    rows = [[_clean(v) for v in r] for r in frame.head(limit).itertuples(index=False, name=None)]
    return {"columns": [str(c) for c in frame.columns], "rows": rows, "n_rows": int(len(frame)), "path": path}


def _files(*paths):
    out = []
    for p in paths:
        ext = os.path.splitext(p)[1]
        kind = "image" if ext == ".png" else "table" if ext == ".csv" else "file"
        out.append({"path": p, "kind": kind, "name": os.path.basename(p)})
    return out


def _metrics(values):
    return {k: float(v) if isinstance(v, (float, np.floating)) else int(v) for k, v in values.items() if v is not None}


def _load(path, hdu):
    with fits.open(os.path.expanduser(path)) as hdul:
        data = np.array(hdul[hdu].data, dtype=float)
        header = hdul[hdu].header.copy()
        names = [h.name for h in hdul]
        rms = np.array(hdul["RMS"].data, dtype=float) if "RMS" in names else None
    if data.ndim != 2:
        raise ValueError("HDU %s is not a 2D image. It has %d dimensions." % (hdu, data.ndim))
    return data, header, rms


def _wcs(header):
    w = WCS(header)
    return w if w.has_celestial else None


def _source_mask(data, clip_sigma, clip_maxiters):
    _, med, std = sigma_clipped_stats(data, sigma=clip_sigma, maxiters=clip_maxiters)
    smooth = convolve(data - med, make_2dgaussian_kernel(3.0, size=5))
    seg = SourceFinder(n_pixels=MASK_NPIXELS, deblend=False, progress_bar=False)(smooth, MASK_NSIGMA * std)
    if seg is None:
        return np.zeros(data.shape, dtype=bool)
    mask = seg.data > 0
    return ndimage.binary_dilation(mask, structure=np.ones((MASK_DILATION, MASK_DILATION), dtype=bool))


def _save_fits(path, primary, header, **extensions):
    hdus = [fits.PrimaryHDU(primary.astype(np.float32), header=header)]
    for name, arr in extensions.items():
        hdus.append(fits.ImageHDU(arr.astype(np.float32), name=name.upper()))
    fits.HDUList(hdus).writeto(path, overwrite=True)


def inspect_fits(path, hdu=0):
    p = os.path.expanduser(path)
    with fits.open(p) as hdul:
        rows = []
        for i, h in enumerate(hdul):
            shape = "x".join(map(str, h.data.shape)) if h.data is not None else ""
            rows.append([i, h.name, type(h).__name__, shape, str(h.data.dtype) if h.data is not None else ""])
        if hdu >= len(hdul) or hdul[hdu].data is None:
            return _fail("HDU %s has no data. The file has %d HDUs." % (hdu, len(hdul)))
        header = hdul[hdu].header.copy()
        data = np.array(hdul[hdu].data, dtype=float)
    w = _wcs(header)
    finite = np.isfinite(data)
    scale = None
    if w is not None:
        scale = float(np.mean([abs(q.to_value("arcsec")) for q in w.proj_plane_pixel_scales()]))
    bunit = str(header.get("BUNIT", "")) or "none"
    flat = data[finite]
    table = pd.DataFrame(rows, columns=["hdu", "name", "type", "shape", "dtype"])
    return {
        "ok": True,
        "summary": "%d HDUs. HDU %d is %s. Unit: %s. WCS: %s." % (
            len(rows), hdu, "x".join(map(str, data.shape)), bunit,
            ("pixel scale %.3f arcsec" % scale) if scale else "none"),
        "metrics": _metrics({
            "n_hdus": len(rows), "n_rows": data.shape[0] if data.ndim == 2 else None,
            "n_columns": data.shape[1] if data.ndim == 2 else None,
            "n_nonfinite": int((~finite).sum()), "min": flat.min() if flat.size else None,
            "max": flat.max() if flat.size else None, "has_wcs": int(w is not None),
            "pixel_scale_arcsec": scale,
        }),
        "data": {"bunit": bunit, "object": str(header.get("OBJECT", "")), "has_rms_extension": any(r[1] == "RMS" for r in rows)},
        "table": _table(table, "hdus"),
    }


def clip_statistics(path, hdu=0, clip_sigma=3.0, clip_maxiters=10, mask_sources=False):
    data, header, _ = _load(path, hdu)
    mask = _source_mask(data, clip_sigma, clip_maxiters) if mask_sources else None
    mean, median, std = sigma_clipped_stats(data, mask=mask, sigma=clip_sigma, maxiters=clip_maxiters)
    clipped = SigmaClip(sigma=clip_sigma, maxiters=clip_maxiters)(np.ma.masked_array(data, mask=mask if mask is not None else False))
    n_used = int(clipped.count())
    n_total = int(np.isfinite(data).sum() - (mask.sum() if mask is not None else 0))
    return {
        "ok": True,
        "summary": "After clipping at %g sigma: median %.4g, standard deviation %.4g, mean %.4g. %d of %d pixels kept%s." % (
            clip_sigma, median, std, mean, n_used, n_total, ", sources masked" if mask_sources else ""),
        "metrics": _metrics({"mean": mean, "median": median, "std": std, "n_kept": n_used,
                             "n_clipped": n_total - n_used, "n_masked": int(mask.sum()) if mask is not None else 0}),
    }


def estimate_background(path, hdu=0, method="background2d", clip_sigma=3.0, clip_maxiters=10,
                        box_size=50, filter_size=3, estimator="sextractor", mask_sources=False):
    data, header, _ = _load(path, hdu)
    mask = _source_mask(data, clip_sigma, clip_maxiters) if mask_sources else None
    if method == "global":
        _, med, std = sigma_clipped_stats(data, mask=mask, sigma=clip_sigma, maxiters=clip_maxiters)
        bkg = np.full(data.shape, med)
        rms = np.full(data.shape, std)
        label = "global sigma-clipped median"
    else:
        if min(data.shape) < box_size:
            return _fail("The box size %d is larger than the image %s." % (box_size, data.shape))
        b = Background2D(
            data, (box_size, box_size), filter_size=(filter_size, filter_size), mask=mask,
            sigma_clip=SigmaClip(sigma=clip_sigma, maxiters=clip_maxiters),
            bkg_estimator=ESTIMATORS[estimator]())
        bkg, rms = b.background, b.background_rms
        label = "Background2D, %d px boxes, %s" % (box_size, estimator)
    subtracted = data - bkg
    out = os.path.join(os.getcwd(), "background_subtracted.fits")
    _save_fits(out, subtracted, header, bkg=bkg, rms=rms)
    plot = os.path.join(os.getcwd(), "background.png")
    fig, axes = plt.subplots(1, 3, figsize=(13, 3.6))
    for ax, arr, title in zip(axes, [data, bkg, rms], ["Image", "Background", "Background RMS"]):
        if title == "Image":
            im = ax.imshow(arr, origin="lower", cmap="gray_r", norm=simple_norm(arr, "sqrt", percent=99.5))
        else:
            im = ax.imshow(arr, origin="lower", cmap="viridis")
        ax.set_title(title)
        fig.colorbar(im, ax=ax, fraction=0.046)
    fig.tight_layout()
    fig.savefig(plot, dpi=100)
    plt.close(fig)
    return {
        "ok": True,
        "summary": "Background (%s): median %.4g, RMS median %.4g. Subtracted image with BKG and RMS extensions: %s" % (
            label, float(np.median(bkg)), float(np.median(rms)), out),
        "metrics": _metrics({"background_median": np.median(bkg), "background_min": bkg.min(), "background_max": bkg.max(),
                             "rms_median": np.median(rms), "n_masked": int(mask.sum()) if mask is not None else 0}),
        "outputs": _files(out, plot),
    }


def detect_sources(path, hdu=0, nsigma=3.0, min_pixels=10, kernel_fwhm=3.0, deblend=False,
                   clip_sigma=3.0, clip_maxiters=10):
    data, header, rms = _load(path, hdu)
    if rms is not None:
        work, noise_label = data, "the RMS extension of the file"
    else:
        _, med, std = sigma_clipped_stats(data, sigma=clip_sigma, maxiters=clip_maxiters)
        work, rms, noise_label = data - med, np.full(data.shape, std), "a global sigma-clipped median and standard deviation"
    smooth = work
    if kernel_fwhm and kernel_fwhm > 0:
        size = int(2 * round(2 * kernel_fwhm) + 1)
        smooth = convolve(work, make_2dgaussian_kernel(kernel_fwhm, size=max(size, 3)))
    threshold = nsigma * rms
    seg = SourceFinder(n_pixels=min_pixels, deblend=deblend, progress_bar=False)(smooth, threshold)
    if seg is None or seg.n_labels == 0:
        return {"ok": True, "summary": "No sources above %g sigma with %d connected pixels." % (nsigma, min_pixels),
                "metrics": {"n_sources": 0, "threshold_median": float(np.median(threshold))}}
    cat = SourceCatalog(work, seg, convolved_data=smooth)
    frame = cat.to_table(["label", "x_centroid", "y_centroid", "area", "max_value", "segment_flux"]).to_pandas()
    w = _wcs(header)
    if w is not None:
        sky = w.pixel_to_world(frame["x_centroid"].values, frame["y_centroid"].values)
        frame["ra_deg"], frame["dec_deg"] = sky.ra.deg, sky.dec.deg
    plot = os.path.join(os.getcwd(), "detections.png")
    fig, ax = plt.subplots(figsize=(10, 6.4))
    ax.imshow(work, origin="lower", cmap="gray_r", norm=simple_norm(work, "sqrt", percent=99.5))
    ax.contour(seg.data > 0, levels=[0.5], colors="red", linewidths=0.7)
    ax.set_title("%d sources at %g sigma, %d pixels minimum" % (seg.n_labels, nsigma, min_pixels))
    fig.tight_layout()
    fig.savefig(plot, dpi=100)
    plt.close(fig)
    cat_path = os.path.join(os.getcwd(), "sources.csv")
    return {
        "ok": True,
        "summary": "%d sources above %g sigma (%d connected pixels minimum, smoothing FWHM %g px, deblending %s). Noise from %s. Source table: %s" % (
            seg.n_labels, nsigma, min_pixels, kernel_fwhm or 0, "on" if deblend else "off", noise_label, cat_path),
        "metrics": _metrics({"n_sources": seg.n_labels, "threshold_median": np.median(threshold),
                             "n_source_pixels": int((seg.data > 0).sum()), "median_area": frame["area"].median(),
                             "total_segment_flux": frame["segment_flux"].sum()}),
        "table": _table(frame, "sources"),
        "outputs": _files(cat_path, plot),
    }


def measure_apertures(path, radius, hdu=0, positions_csv=None, x_column="x_centroid", y_column="y_centroid",
                      x=None, y=None, local_background="annulus", annulus_inner=None, annulus_outer=None,
                      clip_sigma=3.0, clip_maxiters=10):
    data, header, _ = _load(path, hdu)
    if positions_csv:
        pos = pd.read_csv(os.path.expanduser(positions_csv))
        missing = [c for c in (x_column, y_column) if c not in pos.columns]
        if missing:
            return _fail("Unknown column: %s. The columns are: %s." % (", ".join(missing), ", ".join(map(str, pos.columns))))
        xs, ys = pos[x_column].values.astype(float), pos[y_column].values.astype(float)
    elif x is not None and y is not None and len(x) == len(y) and len(x) > 0:
        xs, ys = np.array(x, dtype=float), np.array(y, dtype=float)
    else:
        return _fail("Give positions_csv, or x and y lists of the same length.")
    if local_background == "annulus" and (annulus_inner is None or annulus_outer is None):
        return _fail("Local background by annulus needs annulus_inner and annulus_outer.")
    if local_background == "annulus" and not annulus_outer > annulus_inner > radius:
        return _fail("The annulus must start outside the aperture: radius < annulus_inner < annulus_outer.")
    positions = np.column_stack([xs, ys])
    aper = CircularAperture(positions, r=radius)
    phot = aperture_photometry(data, aper)
    area = float(aper.area)
    raw = np.array(phot["aperture_sum"], dtype=float)
    if local_background == "annulus":
        ann = CircularAnnulus(positions, r_in=annulus_inner, r_out=annulus_outer)
        stats = ApertureStats(data, ann, sigma_clip=SigmaClip(sigma=clip_sigma, maxiters=clip_maxiters))
        bkg = np.array(stats.median, dtype=float)
    else:
        bkg = np.zeros(len(xs))
    net = raw - bkg * area
    frame = pd.DataFrame({"id": np.arange(1, len(xs) + 1), "x": xs, "y": ys, "aperture_sum": raw,
                          "background_per_pixel": bkg, "net_flux": net})
    w = _wcs(header)
    if w is not None:
        sky = w.pixel_to_world(xs, ys)
        frame["ra_deg"], frame["dec_deg"] = sky.ra.deg, sky.dec.deg
    plot = os.path.join(os.getcwd(), "apertures.png")
    fig, ax = plt.subplots(figsize=(10, 6.4))
    ax.imshow(data, origin="lower", cmap="gray_r", norm=simple_norm(data, "sqrt", percent=99.5))
    aper.plot(ax=ax, color="red", lw=0.8)
    if local_background == "annulus":
        CircularAnnulus(positions, r_in=annulus_inner, r_out=annulus_outer).plot(ax=ax, color="blue", lw=0.5)
    ax.set_title("%d apertures, radius %g px" % (len(xs), radius))
    fig.tight_layout()
    fig.savefig(plot, dpi=100)
    plt.close(fig)
    return {
        "ok": True,
        "summary": "%d apertures of radius %g px (area %.1f px). Median net flux %.4g. Local background: %s." % (
            len(xs), radius, area, float(np.median(net)),
            "annulus %g to %g px, clipped at %g sigma" % (annulus_inner, annulus_outer, clip_sigma) if local_background == "annulus" else "none"),
        "metrics": _metrics({"n_sources": len(xs), "aperture_area": area, "median_net_flux": np.median(net),
                             "total_net_flux": net.sum(), "median_background_per_pixel": np.median(bkg)}),
        "table": _table(frame, "photometry"),
        "outputs": _files(os.path.join(os.getcwd(), "photometry.csv"), plot),
    }


def pixel_to_sky(path, x, y, hdu=0):
    data, header, _ = _load(path, hdu)
    w = _wcs(header)
    if w is None:
        return _fail("The header of HDU %s has no celestial WCS." % hdu)
    sky = w.pixel_to_world(np.array(x, dtype=float), np.array(y, dtype=float))
    frame = pd.DataFrame({"x": x, "y": y, "ra_deg": sky.ra.deg, "dec_deg": sky.dec.deg})
    return {
        "ok": True,
        "summary": "%d positions. First: RA %.6f deg, Dec %.6f deg." % (len(x), frame.ra_deg[0], frame.dec_deg[0]),
        "metrics": _metrics({"ra_deg": frame.ra_deg[0], "dec_deg": frame.dec_deg[0]}),
        "table": _table(frame, "sky_positions"),
    }
