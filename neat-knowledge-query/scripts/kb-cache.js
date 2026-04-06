#!/usr/bin/env node

/**
 * KB Cache Manager
 *
 * Caches converted documents and extracted sections to avoid repeated conversion.
 * Markdown files cached for sections only; Office/PDF cached for full content + sections.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { convertOfficeFile, FILE_EXTENSIONS } from '../../neat-knowledge-ingest/scripts/convert-office.js';

function getCacheKey(sourcePath) {
  const hash = crypto.createHash('md5').update(sourcePath).digest('hex').slice(0, 8);
  const ext = path.extname(sourcePath);
  const basename = path.basename(sourcePath, ext);
  return `${basename}-${hash}`;
}

function getCacheStrategy(sourcePath, cacheDir) {
  const ext = path.extname(sourcePath).toLowerCase();
  const cacheKey = getCacheKey(sourcePath);

  const strategy = {
    extension: ext,
    needsFullCache: ext !== '.md',
    fullDocPath: ext === '.md' ? sourcePath : path.join(cacheDir, `${cacheKey}.md`),
    sectionsPath: path.join(cacheDir, `${cacheKey}-sections.json`)
  };

  return strategy;
}

function needsRegeneration(sourcePath, cachePath) {
  try {
    const sourceMtime = fs.statSync(sourcePath).mtime;
    const cacheMtime = fs.statSync(cachePath).mtime;
    return sourceMtime > cacheMtime;
  } catch {
    return true;
  }
}

const SUPPORTED_OFFICE_EXTENSIONS = [...FILE_EXTENSIONS.WORD, ...FILE_EXTENSIONS.EXCEL];

async function convertToMarkdown(sourcePath) {
  const ext = path.extname(sourcePath).toLowerCase();

  if (ext === '.md') {
    return fs.readFileSync(sourcePath, 'utf-8');
  }

  if (SUPPORTED_OFFICE_EXTENSIONS.includes(ext)) {
    const result = await convertOfficeFile(sourcePath);
    return result.markdown;
  }

  if (ext === '.pdf') {
    throw new Error('PDF conversion must be handled via Claude Read tool');
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

const HEADER_REGEX = /^(#{1,6})\s+(.+)$/;

function saveSection(currentSection, currentContent, currentLineStart, lines, lineNumber, isLast) {
  const trimmedContent = currentContent.join('\n').trim();
  currentSection.content = trimmedContent;

  let endLine = isLast ? lineNumber : lineNumber - 1;
  while (endLine > currentLineStart && lines[endLine - 1].trim() === '') {
    endLine--;
  }
  currentSection.line_end = endLine;
  return currentSection;
}

function extractSections(markdown) {
  const lines = markdown.split('\n');
  const sections = [];
  let currentSection = null;
  let currentContent = [];
  let currentLineStart = 0;
  let lineNumber = 0;

  for (const line of lines) {
    lineNumber++;
    const headerMatch = line.match(HEADER_REGEX);

    if (headerMatch) {
      if (currentSection) {
        sections.push(saveSection(currentSection, currentContent, currentLineStart, lines, lineNumber, false));
      }

      const level = headerMatch[1].length;
      const heading = headerMatch[2].trim();
      const preview = heading.slice(0, 100);

      currentSection = {
        heading,
        level,
        preview,
        line_start: lineNumber
      };
      currentContent = [line];
      currentLineStart = lineNumber;
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  if (currentSection) {
    sections.push(saveSection(currentSection, currentContent, currentLineStart, lines, lineNumber, true));
  }

  return sections;
}

async function regenerateCache(sourcePath, cacheDir) {
  const strategy = getCacheStrategy(sourcePath, cacheDir);

  fs.mkdirSync(cacheDir, { recursive: true });

  let markdown;
  if (strategy.extension === '.pdf') {
    throw new Error('PDF conversion must be handled by caller via Read tool');
  } else {
    markdown = await convertToMarkdown(sourcePath);
  }

  if (strategy.needsFullCache) {
    fs.writeFileSync(strategy.fullDocPath, markdown, 'utf-8');
  }

  const sections = extractSections(markdown);
  const sectionsData = {
    source: sourcePath,
    cached_at: new Date().toISOString(),
    sections
  };

  fs.writeFileSync(strategy.sectionsPath, JSON.stringify(sectionsData, null, 2), 'utf-8');

  return { markdown, fullDocPath: strategy.fullDocPath, sectionsPath: strategy.sectionsPath };
}

export async function loadFullDocument(sourcePath, cacheDir) {
  const strategy = getCacheStrategy(sourcePath, cacheDir);

  if (strategy.needsFullCache) {
    if (needsRegeneration(sourcePath, strategy.fullDocPath)) {
      const { markdown } = await regenerateCache(sourcePath, cacheDir);
      return markdown;
    }
    return fs.readFileSync(strategy.fullDocPath, 'utf-8');
  } else {
    if (needsRegeneration(sourcePath, strategy.sectionsPath)) {
      const { markdown } = await regenerateCache(sourcePath, cacheDir);
      return markdown;
    }
    return fs.readFileSync(sourcePath, 'utf-8');
  }
}

async function loadSectionsData(strategy, sourcePath, cacheDir, retryCount = 0) {
  try {
    return JSON.parse(fs.readFileSync(strategy.sectionsPath, 'utf-8'));
  } catch (error) {
    if (retryCount > 0) throw error;
    await regenerateCache(sourcePath, cacheDir);
    return loadSectionsData(strategy, sourcePath, cacheDir, 1);
  }
}

export async function loadSection(sourcePath, heading, cacheDir) {
  const strategy = getCacheStrategy(sourcePath, cacheDir);

  if (needsRegeneration(sourcePath, strategy.sectionsPath)) {
    await regenerateCache(sourcePath, cacheDir);
  }

  const sectionsData = await loadSectionsData(strategy, sourcePath, cacheDir);
  const section = sectionsData.sections.find(
    s => s.heading.toLowerCase() === heading.toLowerCase()
  );

  if (!section) {
    throw new Error(`Section "${heading}" not found in ${sourcePath}`);
  }

  return section;
}

export async function loadSections(sourcePath, cacheDir) {
  const strategy = getCacheStrategy(sourcePath, cacheDir);

  if (needsRegeneration(sourcePath, strategy.sectionsPath)) {
    await regenerateCache(sourcePath, cacheDir);
  }

  const sectionsData = await loadSectionsData(strategy, sourcePath, cacheDir);
  return sectionsData.sections;
}

export function clearCache(cacheDir, sourcePath = null) {
  if (sourcePath) {
    const strategy = getCacheStrategy(sourcePath, cacheDir);

    try {
      if (strategy.needsFullCache) fs.unlinkSync(strategy.fullDocPath);
    } catch {}

    try {
      fs.unlinkSync(strategy.sectionsPath);
    } catch {}
  } else {
    try {
      fs.rmSync(cacheDir, { recursive: true, force: true });
    } catch {}
  }
}

// Export utilities for testing
export { getCacheKey, getCacheStrategy, needsRegeneration, extractSections };
