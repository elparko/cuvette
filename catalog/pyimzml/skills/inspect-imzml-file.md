---
name: inspect-imzml-file
description: Get the facts of an imzML file before any analysis, such as pixel count, m/z range, mode, polarity and storage. Use it when the scientist gives a new imzML file.
---

# Inspect an imzML file

1. Call `read_file_info` with the absolute path of the `.imzML` file. The `.ibd` file must be in the same folder.
2. Read the pixel count, the grid, the pixel size, the m/z range, `spectrum_mode`, `polarity` and `storage_mode`.
3. Compare `polarity` with the decision `polarity`. If they differ, tell the scientist before you go on.
4. If the file is a large processed file, say that the m/z range comes from `mz_range_basis`.
5. Call `get_tic_image` to see the tissue shape and the strongest pixel. A large file takes minutes.
6. Give the manual route: `ImzMLParser(path)`, then `p.polarity`, `p.spectrum_mode` and `p.imzmldict`.

Do not state a value that no tool gave.
