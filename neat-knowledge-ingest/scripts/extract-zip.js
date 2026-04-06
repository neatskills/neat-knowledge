#!/usr/bin/env node

import AdmZip from 'adm-zip';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';

const MAX_ENTRIES = 10_000;
const MAX_TOTAL_SIZE = 100_000_000; // 100MB uncompressed
export function extractZip(zipPath) {
  let tempDir;
  try {
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();

    if (entries.length > MAX_ENTRIES) {
      return formatErrorResponse(`ZIP contains too many entries (${entries.length}, max: ${MAX_ENTRIES})`);
    }

    let totalSize = 0;
    const fileEntries = entries.filter(entry => {
      if (!entry.isDirectory) {
        totalSize += entry.header.size;
        return true;
      }
      return false;
    });

    if (totalSize > MAX_TOTAL_SIZE) {
      return formatErrorResponse(`ZIP uncompressed size too large (${totalSize} bytes, max: ${MAX_TOTAL_SIZE})`);
    }

    tempDir = mkdtempSync(join(tmpdir(), 'kb-ingest-'));

    const files = fileEntries.map(entry => {
      const extractedPath = join(tempDir, entry.entryName);
      zip.extractEntryTo(entry, tempDir, true, true);
      return {
        originalPath: entry.entryName,
        extractedPath,
        size: entry.header.size
      };
    });

    return {
      success: true,
      tempDir,
      files
    };
  } catch (error) {
    if (tempDir) {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    }
    return formatErrorResponse(error.message || String(error));
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

  const result = extractZip(zipPath);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}
