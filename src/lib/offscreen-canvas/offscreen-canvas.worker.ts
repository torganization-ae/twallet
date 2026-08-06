import { createPostMessageInterface } from '../../util/createPostMessageInterface';
import { getCachedImageUrl } from '../../util/getCachedImageUrl';
import { logDebugError } from '../../util/logs';
import quantize from '../quantize';

function extractImageData(img: ImageBitmap) {
  const canvas = new OffscreenCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
}

function createPixelArray(imgData: Uint8ClampedArray, pixelCount: number, quality: number) {
  const pixels = imgData;
  const pixelArray = [];

  for (let i = 0, offset, r, g, b, a; i < pixelCount; i += quality) {
    offset = i * 4;
    r = pixels[offset + 0];
    g = pixels[offset + 1];
    b = pixels[offset + 2];
    a = pixels[offset + 3];

    // If pixel is mostly opaque and not white
    if (typeof a === 'undefined' || a >= 125) {
      if (!(r > 250 && g > 250 && b > 250)) {
        pixelArray.push([r, g, b]);
      }
    }
  }

  return pixelArray;
}

function extractPaletteFromImage(img: ImageBitmap, quality: number, colorCount: number) {
  const imageData = extractImageData(img);
  const pixelArray = createPixelArray(imageData, img.width * img.height, quality);
  const cmap = quantize(pixelArray, colorCount);
  return cmap ? cmap.palette() as [number, number, number][] : undefined;
}

async function extractPaletteFromImageUrl(url: string, quality: number, colorCount: number) {
  let bitmap: ImageBitmap | undefined;

  try {
    const cachedBlobUrl = await getCachedImageUrl(url);
    const response = await fetch(cachedBlobUrl);
    const blob = await response.blob();
    bitmap = await createImageBitmap(blob);

    return extractPaletteFromImage(bitmap, quality, colorCount);
  } catch (error) {
    logDebugError('[Worker] Error extracting palette from image:', error);
    return undefined;
  } finally {
    if (bitmap) {
      bitmap.close();
    }
  }
}

// This function is kept for backwards compatibility with any code that might still reference it
async function processNftImage(url: string, quality: number, colorCount: number) {
  return extractPaletteFromImageUrl(url, quality, colorCount);
}

const api = {
  'offscreen-canvas:processNftImage': processNftImage,
  'offscreen-canvas:extractPaletteFromImage': extractPaletteFromImage,
};

createPostMessageInterface(api);

export type OffscreenCanvasApi = typeof api;
