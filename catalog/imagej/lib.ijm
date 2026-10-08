var cCount = 0;
var cMean = 0;
var cMedian = 0;
var cTotal = 0;
var cFraction = 0;
var cCirc = 0;
var cUnit = "pixels";

function fail(msg) {
  print("error=" + msg);
  exit();
}

function openImage(path) {
  if (!File.exists(path)) fail("File not found: " + path);
  if (File.isDirectory(path)) fail("This path is a folder, not an image: " + path);
  open(path);
  if (nImages == 0) fail("ImageJ cannot open this file: " + path);
}

function needMask() {
  if (!is("binary")) fail("The image is not a binary mask. Run threshold first.");
}

function asciiUnit(u) {
  if (u == fromCharCode(181) + "m") return "um";
  if (u == fromCharCode(197)) return "angstrom";
  return u;
}

function savePreview(png) {
  run("Duplicate...", "title=preview");
  if (bitDepth() == 16 || bitDepth() == 32) run("8-bit");
  saveAs("PNG", png);
}

function savePair(tif, png) {
  saveAs("Tiff", tif);
  savePreview(png);
}

function saturatedFraction() {
  bd = bitDepth();
  n = getWidth() * getHeight();
  if (bd == 8) {
    getHistogram(v, c, 256);
    return c[255] / n;
  }
  if (bd == 16) {
    getStatistics(a, m, mn, mx);
    if (mx == 4095 || mx == 16383 || mx == 65535) {
      getHistogram(v, c, 65536);
      return c[mx] / n;
    }
  }
  return 0;
}

function blockMedian(x, y, bw, bh) {
  makeRectangle(x, y, bw, bh);
  List.setMeasurements;
  m = List.getValue("Median");
  run("Select None");
  return m;
}

function backgroundSpread() {
  w = getWidth();
  h = getHeight();
  bw = round(w * 0.2);
  bh = round(h * 0.2);
  a = blockMedian(0, 0, bw, bh);
  b = blockMedian(w - bw, 0, bw, bh);
  c = blockMedian(0, h - bh, bw, bh);
  d = blockMedian(w - bw, h - bh, bw, bh);
  e = blockMedian(round((w - bw) / 2), round((h - bh) / 2), bw, bh);
  lo = minOf(minOf(minOf(a, b), minOf(c, d)), e);
  hi = maxOf(maxOf(maxOf(a, b), maxOf(c, d)), e);
  return hi - lo;
}

function printInfo(path) {
  getDimensions(w, h, ch, sl, fr);
  getPixelSize(unit, pw, ph);
  getStatistics(area, mean, mn, mx, sd);
  print("width=" + w);
  print("height=" + h);
  print("channels=" + ch);
  print("slices=" + sl);
  print("frames=" + fr);
  print("bit_depth=" + bitDepth());
  print("inverting_lut=" + is("Inverting LUT"));
  u = asciiUnit(unit);
  calibrated = (u != "pixels" && u != "pixel" && u != "" && pw != 1);
  print("calibrated=" + calibrated);
  print("pixel_width=" + d2s(pw, 6));
  print("pixel_height=" + d2s(ph, 6));
  print("pixel_unit=" + u);
  print("min_value=" + mn);
  print("max_value=" + mx);
  print("mean_value=" + d2s(mean, 3));
  print("std_value=" + d2s(sd, 3));
  sat = saturatedFraction();
  print("saturated_fraction=" + d2s(sat, 5));
  spread = backgroundSpread();
  range = maxOf(1, mx - mn);
  print("background_spread=" + d2s(spread, 2));
  print("background_variation=" + d2s(spread / range, 4));
  name = toLowerCase(File.getName(path));
  ext = "";
  dot = lastIndexOf(name, ".");
  if (dot >= 0) ext = substring(name, dot + 1);
  if (ext == "jpg" || ext == "jpeg") ext = "jpeg";
  if (ext == "tif") ext = "tiff";
  print("file_type=" + ext);
  if (ext == "jpeg") print("warning=JPEG files lose detail when saved. Do not use JPEG for quantification.");
  if (sat > 0.01) print("warning=" + d2s(sat * 100, 1) + " percent of the pixels are at the maximum value. The image is saturated.");
  if (spread / range > 0.1) print("warning=The background differs across the image. Consider background subtraction.");
  if (sl * fr > 1) print("warning=This file has more than one plane. The tools work on the first plane.");
  if (bitDepth() == 24) print("warning=This is a color image. Threshold converts it to 8-bit gray.");
  if (!calibrated) print("warning=The image has no scale. Sizes are in pixels.");
}

function runThreshold(method, dark) {
  setOption("BlackBackground", false);
  if (bitDepth() == 24) {
    run("8-bit");
    print("note=The color image was converted to 8-bit gray.");
  }
  if (dark) setAutoThreshold(method + " dark");
  else setAutoThreshold(method);
  getThreshold(lo, hi);
  print("threshold_low=" + d2s(lo, 3));
  print("threshold_high=" + d2s(hi, 3));
  run("Convert to Mask");
  getHistogram(v, c, 256);
  print("foreground_fraction=" + d2s(c[255] / (getWidth() * getHeight()), 5));
}

function analyze(minSize, maxSize, minCirc, excl, redirect, outlinePng, csv) {
  setOption("BlackBackground", false);
  w = getWidth();
  h = getHeight();
  getPixelSize(unit, pw, ph);
  cUnit = asciiUnit(unit);
  imageArea = w * h * pw * ph;
  maskTitle = getTitle();
  maxs = "Infinity";
  if (maxSize > 0) maxs = "" + maxSize;
  opt = "size=" + minSize + "-" + maxs + " circularity=" + d2s(minCirc, 2) + "-1.00 show=Outlines display clear";
  if (excl) opt = opt + " exclude";
  run("Set Measurements...", "area mean standard min centroid perimeter shape integrated median redirect=" + redirect + " decimal=3");
  run("Analyze Particles...", opt);
  if (getTitle() == maskTitle) newImage("Drawing", "8-bit white", w, h, 1);
  n = nResults;
  cCount = n;
  cMean = 0;
  cMedian = 0;
  cTotal = 0;
  cFraction = 0;
  cCirc = 0;
  if (n > 0) {
    areas = newArray(n);
    circ = 0;
    for (i = 0; i < n; i++) {
      areas[i] = getResult("Area", i);
      circ = circ + getResult("Circ.", i);
    }
    Array.getStatistics(areas, amin, amax, amean, asd);
    sorted = Array.copy(areas);
    Array.sort(sorted);
    mid = floor(n / 2);
    if (n % 2 == 1) cMedian = sorted[mid];
    else cMedian = (sorted[mid - 1] + sorted[mid]) / 2;
    cMean = amean;
    cTotal = amean * n;
    cFraction = cTotal / imageArea;
    cCirc = circ / n;
    saveAs("Results", csv);
  } else {
    File.saveString("Area,Mean,StdDev,Min,Max,X,Y,Perim.,Circ.,AR,Round,Solidity,IntDen,RawIntDen,Median\n", csv);
  }
  if (outlinePng != "") saveAs("PNG", outlinePng);
}

function printCounts() {
  print("count=" + cCount);
  print("mean_area=" + d2s(cMean, 4));
  print("median_area=" + d2s(cMedian, 4));
  print("total_area=" + d2s(cTotal, 4));
  print("area_fraction=" + d2s(cFraction, 5));
  print("mean_circularity=" + d2s(cCirc, 4));
  print("area_unit=" + cUnit);
}

function pipeline(rolling, light, sigma, method, dark, ws) {
  if (bitDepth() == 24) run("8-bit");
  if (rolling > 0) {
    opt = "rolling=" + rolling;
    if (light) opt = opt + " light";
    run("Subtract Background...", opt);
  }
  if (sigma > 0) run("Gaussian Blur...", "sigma=" + sigma);
  runThreshold(method, dark);
  if (ws) run("Watershed");
}

function globToRegex(g) {
  r = "^";
  for (i = 0; i < lengthOf(g); i++) {
    c = substring(g, i, i + 1);
    if (c == "*") r = r + ".*";
    else if (c == "?") r = r + ".";
    else if (matches(c, "[A-Za-z0-9_ -]")) r = r + c;
    else r = r + "\\" + c;
  }
  return r + "$";
}
