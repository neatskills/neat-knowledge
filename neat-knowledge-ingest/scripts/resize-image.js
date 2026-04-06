#!/usr/bin/env node

import sharp from 'sharp';
import { tmpdir } from 'os';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';

const MAX_DIMENSION = 1568;

export async function resizeIfNeeded(filePath) {
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

  return {
    path: tempPath,
    resized: true,
    originalSize: { width, height },
    maxDim
  };
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
      const scaleFactor = MAX_DIMENSION / result.maxDim;
      const newWidth = Math.round(result.originalSize.width * scaleFactor);
      const newHeight = Math.round(result.originalSize.height * scaleFactor);
      console.log(`Resized: ${result.originalSize.width}x${result.originalSize.height} → ${newWidth}x${newHeight}`);
      console.log(`Output: ${result.path}`);
    } else {
      console.log('No resize needed');
      console.log(`Path: ${result.path}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
