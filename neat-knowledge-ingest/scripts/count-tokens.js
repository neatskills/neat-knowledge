#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const CHARS_PER_TOKEN = 3.5;

function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return { summary: null, bodyStart: 0 };

  const frontmatter = match[1];
  const bodyStart = match[0].length;

  const summaryMatch = frontmatter.match(/summary:\s*(.+)/);
  const summary = summaryMatch ? summaryMatch[1].trim() : null;

  return { summary, bodyStart };
}

function extractSections(content, bodyStart) {
  const body = content.slice(bodyStart);
  const sections = [];

  const lines = body.split('\n');
  let currentSection = null;
  let currentContent = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      if (currentSection) {
        const content = currentContent.join('\n').trim();
        sections.push({
          heading: currentSection,
          content,
          tokens: estimateTokens(content)
        });
      }

      currentSection = headingMatch[2].trim();
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  if (currentSection) {
    const content = currentContent.join('\n').trim();
    sections.push({
      heading: currentSection,
      content,
      tokens: estimateTokens(content)
    });
  }

  return sections;
}

function countTokens(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    const { summary, bodyStart } = extractFrontmatter(content);
    const sections = extractSections(content, bodyStart);

    const summaryTokens = estimateTokens(summary || '');
    const fullTokens = estimateTokens(content);

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

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node count-tokens.js <markdown-file>');
    process.exit(1);
  }

  const filePath = path.resolve(args[0]);
  const tokens = countTokens(filePath);
  console.log(JSON.stringify(tokens, null, 2));
}

export { estimateTokens, countTokens };
