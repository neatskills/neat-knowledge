#!/usr/bin/env node
/**
 * Image Resizer
 *
 * Resizes images larger than 1568px (max dimension) for optimal Claude vision processing.
 *
 * Dependencies:
 * - sharp: Image resizing
 */

import sharp from 'sharp';
import { tmpdir } from 'os';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';

const MAX_DIMENSION = 1568;

export async function resizeIfNeeded(filePath) {
  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();
    const { width, height } = metadata;
    const maxDim = Math.max(width, height);

    if (maxDim <= MAX_DIMENSION) {
      return {
        path: filePath,
        resized: false
      };
    }

    const ext = extname(filePath);
    const tempPath = join(tmpdir(), `resized-${randomUUID()}${ext}`);

    await image
      .resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .toFile(tempPath);

    const scaleFactor = MAX_DIMENSION / maxDim;
    const newWidth = Math.round(width * scaleFactor);
    const newHeight = Math.round(height * scaleFactor);

    return {
      path: tempPath,
      resized: true,
      originalSize: { width, height },
      newSize: { width: newWidth, height: newHeight }
    };
  } catch (error) {
    throw new Error(`Failed to resize image: ${error.message}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('Usage: resize-image.js <image-path>');
    process.exit(1);
  }

  try {
    const result = await resizeIfNeeded(filePath);

    if (result.resized) {
      console.log(`Resized: ${result.originalSize.width}x${result.originalSize.height} → ${result.newSize.width}x${result.newSize.height}`);
      console.log(`Output: ${result.path}`);
    } else {
      console.log('No resize needed');
      console.log(`Path: ${result.path}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}
