# Prompts

## Plain
1. I have a small satellite-style image of a patch of land. How many pixels wide and high is it, which map projection does it use, and how large is one pixel on the ground?
2. What are the lowest, highest and average pixel values, and the standard deviation?
3. Convert the image to latitude and longitude. How many pixels wide and high is the new image?
4. I drew two squares on the map. What is the average pixel value inside the first one, and how many pixels does it cover?
5. The second square cuts through pixels. How many pixels and what average do I get if I count only pixels whose center is inside, and then if I count every pixel it touches?

## Guided
Is this image a normal 8-bit grid, and how much does my choice of how to count the pixels at the edge of a square change the average inside it?
