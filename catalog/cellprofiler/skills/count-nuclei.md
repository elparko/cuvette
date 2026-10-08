---
name: count-nuclei
description: Steps to count nuclei in a folder of images with CellProfiler and to choose the diameter range, the threshold and the declumping.
---

# Count nuclei in a folder

Use these steps. Ask the scientist for each decision that the setup lists.

1. Ask for the image folder, the file name pattern and the stain that shows the nuclei. A pattern such as *_w2.TIF picks one stain.
2. Start with a small sample. Use every_nth or max_images so that the run has 3 to 10 images. CellProfiler needs about one minute to start. Each image then needs a few seconds.
3. Run count_nuclei with the default settings on the sample. Read metrics.mean_diameter and metrics.mean_area.
4. Tell the scientist the mean diameter. The default range is 10 to 40 pixels. If the mean diameter is outside that range, ask for a new range. A range of 0.5 to 2 times the mean diameter is a start.
5. Ask for the threshold method and the declumping method. Show the sensitivity table. Touching nuclei need declumping by Shape or by Intensity. None keeps a clump as one object.
6. Ask if objects at the border and objects outside the range leave the count.
7. Run count_nuclei again on the sample with the chosen settings. Then run it on all images.
8. Read the table. Look for images with a count far from the others.
9. Report n_images, n_objects_total, mean_objects_per_image and mean_area. Say the settings.
10. The scientist can repeat the run: open the .cppipe file with File > Import > Pipeline from File, drag the folder into the Images module and click Analyze Images.

To change only the settings and keep the images, use write_pipeline and then run_pipeline with the same file.
