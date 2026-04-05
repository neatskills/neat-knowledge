#!/usr/bin/env node
/**
 * ZIP Extractor
 *
 * Extracts ZIP files to temp directory and returns file inventory.
 *
 * Usage: node extract-zip.js <zip-path>
 * Output: JSON with extraction results
 *
 * Dependencies:
 * - adm-zip: ZIP extraction
 */

import AdmZip from 'adm-zip';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync } from 'fs';

export function extractZip(zipPath) {
  try {
    const tempDir = mkdtempSync(join(tmpdir(), 'kb-ingest-'));
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(tempDir, true);

    const entries = zip.getEntries();
    const files = entries
      .filter(entry => !entry.isDirectory)
      .map(entry => ({
        originalPath: entry.entryName,
        extractedPath: join(tempDir, entry.entryName),
        size: entry.header.size
      }));

    return {
      success: true,
      tempDir,
      files
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function formatErrorResponse(error) {
  return {
    success: false,
    error
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const zipPath = process.argv[2];

  if (!zipPath) {
    console.error(JSON.stringify(formatErrorResponse('Usage: extract-zip.js <zip-path>')));
    process.exit(1);
  }

  try {
    const result = extractZip(zipPath);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error(JSON.stringify(formatErrorResponse(error.message)));
    process.exit(1);
  }
}
