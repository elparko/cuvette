open("/Users/lab/data/blobs.gif");
run("Subtract Background...", "rolling=50 light");
run("Gaussian Blur...", "sigma=2");
setAutoThreshold("Otsu dark");
run("Convert to Mask");
run("Watershed");
run("Set Scale...", "distance=100 known=50 pixel=1 unit=um");
run("Analyze Particles...", "size=50-Infinity circularity=0.00-1.00 show=Outlines exclude");
run("Median...", "radius=2");
