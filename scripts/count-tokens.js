#!/usr/bin/env node

/**
 * Token counter for markdown content
 *
 * Uses character-based estimation: chars ÷ 3.5 for Claude models
 * Accurate enough for ROI decisions without external dependencies
 *
 * Usage: node count-tokens.js <markdown-file>
 * Output: JSON with token counts
 */

import fs from 'fs';
import path from 'path';

const CHARS_PER_TOKEN = 3.5;

/**
 * Estimate token count from text
 */
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Extract frontmatter from markdown
 */
function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return { frontmatter: null, bodyStart: 0 };

  const frontmatter = match[1];
  const bodyStart = match[0].length;

  // Extract summary from frontmatter
  const summaryMatch = frontmatter.match(/summary:\s*(.+)/);
  const summary = summaryMatch ? summaryMatch[1].trim() : null;

  return { frontmatter, summary, bodyStart };
}

/**
 * Split markdown into sections by headings
 */
function extractSections(content, bodyStart) {
  const body = content.slice(bodyStart);
  const sections = [];

  // Split by markdown headings (# Header)
  const lines = body.split('\n');
  let currentSection = null;
  let currentContent = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      // Save previous section
      if (currentSection) {
        sections.push({
          heading: currentSection,
          content: currentContent.join('\n').trim(),
          tokens: estimateTokens(currentContent.join('\n'))
        });
      }

      // Start new section
      currentSection = headingMatch[2].trim();
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    sections.push({
      heading: currentSection,
      content: currentContent.join('\n').trim(),
      tokens: estimateTokens(currentContent.join('\n'))
    });
  }

  return sections;
}

/**
 * Count tokens in markdown file
 */
function countTokens(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract frontmatter and summary
    const { summary, bodyStart } = extractFrontmatter(content);

    // Extract sections
    const sections = extractSections(content, bodyStart);

    // Calculate tokens
    const summaryTokens = estimateTokens(summary || '');
    const fullTokens = estimateTokens(content);

    // Build section token map
    const sectionTokens = {};
    sections.forEach(section => {
      sectionTokens[section.heading] = section.tokens;
    });

    return {
      summary: summaryTokens,
      full: fullTokens,
      sections: sectionTokens
    };

  } catch (error) {
    console.error(`Error reading file: ${error.message}`);
    process.exit(1);
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node count-tokens.js <markdown-file>');
    process.exit(1);
  }

  const filePath = path.resolve(args[0]);

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const tokens = countTokens(filePath);
  console.log(JSON.stringify(tokens, null, 2));
}

export { estimateTokens, countTokens };
