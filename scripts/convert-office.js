#!/usr/bin/env node

import mammoth from 'mammoth';
import xlsx from 'node-xlsx';
import { basename, extname } from 'path';

export const FILE_EXTENSIONS = {
  WORD: ['.docx', '.doc'],
  EXCEL: ['.xlsx', '.xls']
};

export const FILE_TYPES = {
  WORD: 'word',
  EXCEL: 'excel'
};

const MAX_ROWS_PER_SHEET = 10_000;

function generateTitleFromFilename(filename) {
  return filename
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function createConversionResult(markdown, warnings = []) {
  return { markdown, warnings };
}

export async function convertWordToMarkdown(filePath) {
  const result = await mammoth.convertToMarkdown({ path: filePath });
  return createConversionResult(result.value, result.messages);
}

function formatTableRow(cells) {
  return `| ${cells.join(' | ')} |\n`;
}

function formatSheetAsMarkdown(sheet, shouldShowHeader) {
  const parts = [];

  if (shouldShowHeader) {
    parts.push(`\n\n## ${sheet.name}\n\n`);
  }

  const data = sheet.data;
  if (data.length === 0) {
    parts.push('*Empty sheet*\n');
    return parts.join('');
  }

  const headers = data[0];
  const rows = data.slice(1, MAX_ROWS_PER_SHEET + 1);

  if (data.length - 1 > MAX_ROWS_PER_SHEET) {
    parts.push(`*Note: Sheet contains ${data.length - 1} rows, showing first ${MAX_ROWS_PER_SHEET}*\n\n`);
  }

  const separator = Array(headers.length).fill('---');
  const headerCount = headers.length;

  parts.push(formatTableRow(headers));
  parts.push(formatTableRow(separator));

  rows.forEach(row => {
    const cells = Array.from({ length: headerCount }, (_, i) => row[i] ?? '');
    parts.push(formatTableRow(cells));
  });

  return parts.join('');
}

export async function convertExcelToMarkdown(filePath) {
  const sheets = xlsx.parse(filePath);
  const hasMultipleSheets = sheets.length > 1;

  const markdown = sheets.map((sheet, index) =>
    formatSheetAsMarkdown(sheet, hasMultipleSheets && index > 0)
  ).join('');

  return createConversionResult(markdown);
}

export async function convertOfficeFile(filePath) {
  const ext = extname(filePath).toLowerCase();
  const filename = basename(filePath, ext);
  const title = generateTitleFromFilename(filename);

  let result;
  let fileType;

  if (FILE_EXTENSIONS.WORD.includes(ext)) {
    result = await convertWordToMarkdown(filePath);
    fileType = FILE_TYPES.WORD;
  } else if (FILE_EXTENSIONS.EXCEL.includes(ext)) {
    result = await convertExcelToMarkdown(filePath);
    fileType = FILE_TYPES.EXCEL;
  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }

  return { ...result, title, fileType };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('Usage: convert-office.js <file-path>');
    process.exit(1);
  }

  try {
    const result = await convertOfficeFile(filePath);
    console.log('Title:', result.title);
    console.log('Type:', result.fileType);

    if (result.warnings && result.warnings.length > 0) {
      console.error('\nConversion warnings:');
      result.warnings.forEach(msg => {
        console.error(`  ${msg.type}: ${msg.message}`);
      });
    }

    console.log('\nMarkdown:');
    console.log(result.markdown);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
