---
name: inspect-and-convert
description: Procedure to read the metadata of a microscopy file and to convert one series or plane to OME-TIFF or PNG.
---

# Inspect and convert an image file

1. Run read_image_info with the file path. Read the series count, the width, the height, the channels and the pixel type of each series.
2. If the file is a pyramid, run read_image_info with noflat. The result shows one series with its resolutions.
3. Run read_ome_xml. Find PhysicalSizeX, PhysicalSizeY, the unit and the channel names.
4. If PhysicalSizeX is missing, tell the scientist that the file has no pixel size.
5. Ask the scientist which series to convert. The decision is series.
6. Use convert_to_ome_tiff to keep the pixel size and the bit depth. Use convert_to_png only for a picture.
7. For a multi-channel file, give channel, z and timepoint to choose one plane.
8. Run read_image_info on the output. Check that the width and the height are the ones that you expect.

Some formats need a native library. If showinf fails with a message about a Turbo JPEG library, convert the file in QuPath.
