---
name: inspect-ion-image
description: Procedure to save and read the ion image of one annotation, and to judge whether it comes from tissue.
---

# Look at the ion image of one annotation

1. Run list_annotations. Pick the row. Note the formula, the adduct and the off_sample value.
2. Call get_ion_image with dataset_id, formula and adduct. The formula is the neutral formula without the adduct, such as C39H78NO8P with +H.
3. Look at the PNG. Say if the signal is inside the tissue, or around it, or only at the edge.
4. An off-sample annotation usually shows signal outside the tissue. Say so.
5. Report the image size and the number of pixels with signal. Do not call a distribution "localized" without a comparison with the tissue outline.
6. The image uses the first isotope peak and its own maximum. Two images are not on the same scale.
