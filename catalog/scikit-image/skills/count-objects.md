---
name: count-objects
description: Step-by-step workflow to count nuclei or blobs in one image or a folder with scikit-image, and to check the count.
---

# Count objects in an image or a folder

1. Run inspect_image on the folder to see the file patterns. Then run it on one image. Read the channels, the value range and the warnings.
2. Decide the channel. A gray image uses gray. An H&E image usually uses hematoxylin.
3. Decide if the objects are bright or dark in that channel. Hematoxylin and a fluorescence image give bright objects.
4. Run count_objects on one image with the threshold method that the scientist chose. Look at the outline PNG.
5. Run the sensitivity check for the threshold method and the smallest object size. Say which counts change.
6. Run count_objects on the folder with the same settings. Give a pattern such as "*/tissue images/*.png".
7. Read the per-group table. The first folder under the path is the group, for example the organ.
8. Report the count, the mean area, the settings and the range over methods.

The manual route is the Python line in each step. In Fiji, use Image > Adjust > Threshold and Analyze > Analyze Particles.
