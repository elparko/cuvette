import qupath.lib.io.GsonTools
import java.awt.image.BufferedImage
import qupath.lib.images.ImageData
import qupath.lib.images.servers.ImageServerProvider
import qupath.lib.io.PathIO
import qupath.lib.objects.PathObjects
import qupath.lib.regions.ImagePlane
import qupath.lib.roi.ROIs

def gaFail(String msg) {
  throw new RuntimeException(msg)
}

def gaStr(v) {
  def s = v == null ? "" : v.toString().trim()
  return s == "" ? null : s
}

def gaNum(v) {
  def s = gaStr(v)
  return s == null ? null : Double.valueOf(s)
}

def gaBool(v) {
  def s = gaStr(v)
  return s == null ? null : s.toLowerCase() == "true"
}

def gaRun(Closure body) {
  try {
    body()
  } catch (Throwable t) {
    def msg = (t.getMessage() ?: t.toString()).toString().replaceAll("\\s+", " ")
    println "error=" + msg
  }
}

def gaLoad(String path) {
  def f = new File(path)
  if (!f.exists()) gaFail("File not found: " + path)
  if (f.isDirectory()) gaFail("This path is a folder, not an image: " + path)
  def imageData
  if (path.toLowerCase().endsWith(".qpdata")) {
    imageData = PathIO.readImageData(f, null, null, BufferedImage)
  } else {
    def server = ImageServerProvider.buildServer(path, BufferedImage)
    if (server == null) gaFail("QuPath cannot open this file: " + path)
    imageData = new ImageData<BufferedImage>(server)
  }
  setBatchProjectAndImage(null, imageData)
  return imageData
}

def gaSave(ImageData imageData, String path) {
  PathIO.writeImageData(new File(path), imageData)
  println "state=" + path
}

def gaCalibrated(ImageData imageData) {
  return imageData.getServer().getPixelCalibration().hasPixelSizeMicrons()
}

def gaTypeName(ImageData imageData) {
  def t = imageData.getImageType()
  return t == null ? "Not set" : t.toString()
}

def gaNeedCalibration(ImageData imageData) {
  if (!gaCalibrated(imageData)) gaFail("The image has no pixel size. Run set_pixel_size first.")
}

def gaNeedType(ImageData imageData) {
  if (imageData.getImageType() == null || imageData.getImageType() == ImageData.ImageType.UNSET) {
    gaFail("The image type is not set. Run set_image_type first.")
  }
}

def gaImageLines(ImageData imageData) {
  def s = imageData.getServer()
  def cal = s.getPixelCalibration()
  println "image_name=" + s.getMetadata().getName()
  println "width=" + s.getWidth()
  println "height=" + s.getHeight()
  println "n_channels=" + s.nChannels()
  println "n_resolutions=" + s.nResolutions()
  println "pixel_type=" + s.getPixelType()
  println "is_rgb=" + (s.isRGB() ? 1 : 0)
  println "calibrated=" + (cal.hasPixelSizeMicrons() ? 1 : 0)
  if (cal.hasPixelSizeMicrons()) {
    println "pixel_width_um=" + cal.getPixelWidthMicrons()
    println "pixel_height_um=" + cal.getPixelHeightMicrons()
  }
  def mag = s.getMetadata().getMagnification()
  if (!Double.isNaN(mag)) println "magnification=" + mag
  println "image_type=" + gaTypeName(imageData)
  println "n_annotations=" + getAnnotationObjects().size()
  println "n_cells=" + getCellObjects().size()
}

def gaAreaScale(ImageData imageData) {
  def cal = imageData.getServer().getPixelCalibration()
  return cal.hasPixelSizeMicrons() ? cal.getPixelWidthMicrons() * cal.getPixelHeightMicrons() : 1.0d
}

def gaAnnotationArea(ImageData imageData) {
  double px = 0
  for (a in getAnnotationObjects()) {
    if (a.getROI() != null) px += a.getROI().getArea()
  }
  return px * gaAreaScale(imageData)
}

def gaCellLines(ImageData imageData) {
  def cells = getCellObjects()
  int n = cells.size()
  def scale = gaAreaScale(imageData)
  double cellArea = 0
  double nucArea = 0
  int nNuc = 0
  def byClass = [:]
  for (c in cells) {
    cellArea += c.getROI().getArea()
    def nuc = c.getNucleusROI()
    if (nuc != null) {
      nucArea += nuc.getArea()
      nNuc++
    }
    def k = c.getPathClass() == null ? "Unclassified" : c.getPathClass().toString()
    byClass[k] = (byClass[k] ?: 0) + 1
  }
  println "n_cells=" + n
  if (n > 0) println "mean_cell_area_um2=" + (cellArea / n * scale)
  if (nNuc > 0) println "mean_nucleus_area_um2=" + (nucArea / nNuc * scale)
  def area = gaAnnotationArea(imageData)
  if (area > 0) {
    println "region_area_mm2=" + (area / 1.0e6)
    println "cells_per_mm2=" + (n / (area / 1.0e6))
  }
  return byClass
}

def gaPositiveLines(Map byClass, int n) {
  int neg = byClass["Negative"] ?: 0
  int one = byClass["1+"] ?: 0
  int two = byClass["2+"] ?: 0
  int three = byClass["3+"] ?: 0
  int pos = byClass["Positive"] ?: 0
  println "n_negative=" + neg
  if (one + two + three > 0 && pos == 0) {
    println "n_1plus=" + one
    println "n_2plus=" + two
    println "n_3plus=" + three
    if (n > 0) println "h_score=" + ((one + 2 * two + 3 * three) * 100.0d / n)
    pos = one + two + three
  } else {
    println "n_positive_cells_class=" + pos
  }
  println "n_positive=" + pos
  if (n > 0) println "positive_percent=" + (pos * 100.0d / n)
  def other = byClass.findAll { k, v -> !(k in ["Negative", "Positive", "1+", "2+", "3+"]) }
  other.each { k, v -> println "warning=" + v + " cells have the class " + k }
}

def gaSelectScope(ImageData imageData, String region) {
  def r = gaStr(region)
  if (r != null && r.toLowerCase() != "whole image") {
    def p = r.split(",").collect { it.trim() }
    if (p.size() != 4) gaFail("region must be x,y,width,height in pixels, or whole image")
    def v = p.collect { Math.round(Double.valueOf(it)).toInteger() }
    def s = imageData.getServer()
    int x = Math.max(0, v[0])
    int y = Math.max(0, v[1])
    int w = Math.min(v[2], s.getWidth() - x)
    int h = Math.min(v[3], s.getHeight() - y)
    if (w <= 0 || h <= 0) gaFail("region is outside the image")
    def ann = PathObjects.createAnnotationObject(ROIs.createRectangleROI(x, y, w, h, ImagePlane.getDefaultPlane()))
    addObject(ann)
    selectObjects(ann)
  } else {
    if (getAnnotationObjects().isEmpty()) {
      def srv = imageData.getServer()
      double mpx = srv.getWidth() * (double) srv.getHeight() / 1.0e6
      if (r == null && mpx > 40) {
        gaFail("The image has " + Math.round(mpx) + " million pixels and no annotation. Give a region as x,y,width,height in pixels, run detect_tissue first, or write region as: whole image")
      }
      createFullImageAnnotation(true)
    }
    selectAnnotations()
  }
}

def gaDetect(Map A, String plugin, boolean positive, String stateOut) {
  def t0 = System.currentTimeMillis()
  def imageData = gaLoad(A.input)
  gaPrepare(A, imageData)
  gaNeedCalibration(imageData)
  gaNeedType(imageData)
  def p = Class.forName(plugin).getDeclaredConstructor().newInstance()
  def list = p.getParameterList(imageData)
  def params = [:]
  for (e in list.getParameters().entrySet()) {
    def v = e.getValue()
    if (v.isHidden() || v.getClass().getSimpleName() == "EmptyParameter") continue
    params[e.getKey()] = v.getValueOrDefault()
  }
  def detectKey = imageData.isFluorescence() ? "detectionImage" : "detectionImageBrightfield"
  def names = [
    detection_image: detectKey,
    requested_pixel_size: "requestedPixelSizeMicrons",
    background_radius: "backgroundRadiusMicrons",
    median_filter_radius: "medianRadiusMicrons",
    sigma: "sigmaMicrons",
    minimum_area: "minAreaMicrons",
    maximum_area: "maxAreaMicrons",
    threshold: "threshold",
    max_background_intensity: "maxBackground",
    split_by_shape: "watershedPostProcess",
    cell_expansion: "cellExpansionMicrons",
    include_cell_nucleus: "includeNuclei",
    smooth_boundaries: "smoothBoundaries",
    score_compartment: "thresholdCompartment",
    threshold_1: "thresholdPositive1",
    threshold_2: "thresholdPositive2",
    threshold_3: "thresholdPositive3",
    single_threshold: "singleThreshold",
  ]
  def kinds = [
    detection_image: "s", score_compartment: "s", split_by_shape: "b", include_cell_nucleus: "b",
    smooth_boundaries: "b", single_threshold: "b",
  ]
  for (e in names.entrySet()) {
    def raw = A[e.getKey()]
    if (raw == null || gaStr(raw) == null) continue
    if (!params.containsKey(e.getValue())) gaFail("This image type has no setting " + e.getKey())
    def kind = kinds[e.getKey()] ?: "n"
    def value = kind == "s" ? gaStr(raw) : kind == "b" ? gaBool(raw) : gaNum(raw)
    if (kind == "s") {
      def ch = list.getParameters().get(e.getValue()).getChoices()
      if (!(value in ch)) gaFail(e.getKey() + " must be one of: " + ch.join("; "))
    }
    params[e.getValue()] = value
  }
  gaSelectScope(imageData, A.region)
  def ok = runPlugin(plugin, GsonTools.getInstance().toJson(params))
  println "detector=" + plugin.tokenize(".").last()
  println "threshold_used=" + params["threshold"]
  if (positive) {
    println "threshold_1_used=" + params["thresholdPositive1"]
    println "single_threshold_used=" + (params["singleThreshold"] ? 1 : 0)
    println "score_compartment_used=" + params["thresholdCompartment"]
  }
  def byClass = gaCellLines(imageData)
  if (positive) gaPositiveLines(byClass, getCellObjects().size())
  println "elapsed_s=" + ((System.currentTimeMillis() - t0) / 1000.0d)
  gaSave(imageData, stateOut)
}

def gaCsvCell(String s) {
  return (s.contains(",") || s.contains("\"") || s.contains("\n")) ? "\"" + s.replace("\"", "\"\"") + "\"" : s
}

def gaToCsv(String tsv, String csv) {
  def out = new File(csv)
  out.withWriter("UTF-8") { w ->
    new File(tsv).eachLine("UTF-8") { line ->
      w.write(line.split("\t", -1).collect { gaCsvCell(it) }.join(","))
      w.write("\n")
    }
  }
}

def gaExport(ImageData imageData, String kind, String csv) {
  def tsv = csv + ".tmp.tsv"
  if (kind == "Annotations") saveAnnotationMeasurements(tsv)
  else if (kind == "Detections" || kind == "Cells") saveDetectionMeasurements(tsv)
  else gaFail("object_type must be Annotations, Detections or Cells")
  gaToCsv(tsv, csv)
  new File(tsv).delete()
}

def gaWorkflowLines(ImageData imageData) {
  def seen = new LinkedHashSet<String>()
  for (s in imageData.getHistoryWorkflow().getSteps()) {
    def script = s.getScript()
    if (script != null && script.trim() != "") seen.add(script.trim())
  }
  return seen.toList()
}

def gaImageTypes() {
  return [
    "Brightfield (H&E)": ImageData.ImageType.BRIGHTFIELD_H_E,
    "Brightfield (H-DAB)": ImageData.ImageType.BRIGHTFIELD_H_DAB,
    "Brightfield (other)": ImageData.ImageType.BRIGHTFIELD_OTHER,
    "Fluorescence": ImageData.ImageType.FLUORESCENCE,
  ]
}

def gaSetType(ImageData imageData, String label, stains) {
  def t = gaImageTypes()[label]
  if (t == null) gaFail("image_type must be one of: " + gaImageTypes().keySet().join("; "))
  if (imageData.getImageType() != t) setImageType(t)
  def st = gaStr(stains)
  if (st != null && st != "default") {
    if (!setColorDeconvolutionStains(st)) gaFail("QuPath did not accept the stain vectors")
  }
}

def gaSetPixelSize(ImageData imageData, Double w, Double h) {
  def cal = imageData.getServer().getPixelCalibration()
  def same = cal.hasPixelSizeMicrons() && Math.abs(cal.getPixelWidthMicrons() - w) < 1e-9 && Math.abs(cal.getPixelHeightMicrons() - h) < 1e-9
  if (!same && !setPixelSizeMicrons(w, h)) gaFail("QuPath did not set the pixel size")
}

def gaPrepare(Map A, ImageData imageData) {
  def label = gaStr(A.image_type)
  if (label != null) gaSetType(imageData, label, A.stain_vectors)
  def w = gaNum(A.pixel_width_um)
  if (w != null) gaSetPixelSize(imageData, w, w)
}
