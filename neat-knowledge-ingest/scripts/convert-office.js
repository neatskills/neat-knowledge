#!/usr/bin/env node
/**
 * Office File Converter
 *
 * Converts Word (.docx) and Excel (.xlsx, .xls) files to markdown.
 *
 * Dependencies:
 * - mammoth: Word document conversion (.docx only)
 * - xlsx: Excel spreadsheet conversion
 *
 * Note: Legacy .doc format not supported by mammoth.js
 */

import mammoth from 'mammoth';
import XLSX from 'xlsx';
import { basename, extname } from 'path';

const FILE_EXTENSIONS = {
  WORD: ['.docx', '.doc'],
  EXCEL: ['.xlsx', '.xls']
};

function generateTitleFromFilename(filePath) {
  const filename = basename(filePath, extname(filePath));
  return filename
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

export async function convertWordToMarkdown(filePath) {
  try {
    const result = await mammoth.convertToMarkdown({ path: filePath });
    const title = generateTitleFromFilename(filePath);

    return {
      markdown: result.value,
      title,
      warnings: result.messages
    };
  } catch (error) {
    throw new Error(`Failed to convert Word document: ${error.message}`);
  }
}

export async function convertExcelToMarkdown(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const title = generateTitleFromFilename(filePath);
    const markdownParts = [];
    const hasMultipleSheets = workbook.SheetNames.length > 1;

    workbook.SheetNames.forEach((sheetName, index) => {
      const sheet = workbook.Sheets[sheetName];

      if (hasMultipleSheets && index > 0) {
        markdownParts.push('\n\n');
      }
      if (hasMultipleSheets) {
        markdownParts.push(`## ${sheetName}\n\n`);
      }

      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (data.length === 0) {
        markdownParts.push('*Empty sheet*\n');
        return;
      }

      const headers = data[0];
      const rows = data.slice(1);
      const separator = '---';

      markdownParts.push(`| ${headers.join(' | ')} |\n`);
      markdownParts.push(`| ${Array(headers.length).fill(separator).join(' | ')} |\n`);

      rows.forEach(row => {
        const normalizedRow = row.length < headers.length
          ? [...row, ...Array(headers.length - row.length).fill('')]
          : row.slice(0, headers.length);
        markdownParts.push(`| ${normalizedRow.join(' | ')} |\n`);
      });
    });

    return {
      markdown: markdownParts.join(''),
      title
    };
  } catch (error) {
    throw new Error(`Failed to convert Excel spreadsheet: ${error.message}`);
  }
}

export async function convertOfficeFile(filePath) {
  const ext = extname(filePath).toLowerCase();

  if (FILE_EXTENSIONS.WORD.includes(ext)) {
    const result = await convertWordToMarkdown(filePath);
    return { ...result, fileType: 'word' };
  } else if (FILE_EXTENSIONS.EXCEL.includes(ext)) {
    const result = await convertExcelToMarkdown(filePath);
    return { ...result, fileType: 'excel' };
  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }
}

// CLI usage
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
    console.error('Error:', error.message);
    process.exit(1);
  }
}
