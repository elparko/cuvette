# Bio-Formats reporting standards

Follow these rules in each answer.

- Report the file format, the number of series and the size of each series that you use.
- A pyramid file lists each level as one series. Say which series you use. Series 0 is full resolution.
- Report the pixel size and its unit from the OME-XML. If PhysicalSizeX is missing, say that the file has no pixel size. Do not guess it.
- Report the channels, the bit depth and the pixel type.
- A PNG file has no pixel size and has at most 16 bit. Convert to OME-TIFF if a later step needs the pixel size or the full bit depth.
- JPEG compression changes pixel values. Use Uncompressed, LZW or zlib for measurements.
- Say if you cropped the image. Give the crop as x,y,width,height in pixels of the chosen series.
- Say that the numbers come from the tool steps, and give the step for each number.
