#!/usr/bin/env node
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';

const MAX_RESPONSE_SIZE = 10_000_000;
const EXCERPT_MAX_LENGTH = 200;
const USER_AGENT = 'Mozilla/5.0 (compatible; NeatKnowledge/1.0)';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

export async function fetchWebContent(url) {
  const urlObj = new URL(url);
  if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
    throw new Error(`Invalid URL protocol: ${urlObj.protocol}. Must be HTTP or HTTPS.`);
  }

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const contentLength = response.headers.get('content-length');
  if (contentLength && Number(contentLength) > MAX_RESPONSE_SIZE) {
    throw new Error(`Response too large (${contentLength} bytes, max: ${MAX_RESPONSE_SIZE})`);
  }

  let totalSize = 0;
  const streamReader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks = [];

  try {
    while (true) {
      const { done, value } = await streamReader.read();
      if (done) break;

      totalSize += value.length;
      if (totalSize > MAX_RESPONSE_SIZE) {
        throw new Error(`Response exceeded ${MAX_RESPONSE_SIZE} bytes`);
      }

      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
  } finally {
    streamReader.releaseLock();
  }

  const html = chunks.join('');

  const dom = new JSDOM(html, { url });

  try {
    const document = dom.window.document;
    const articleReader = new Readability(document);
    const article = articleReader.parse();

    let markdown, title, excerpt, usedFallback = false;

    if (article) {
      markdown = turndownService.turndown(article.content);
      title = article.title || '';
      excerpt = article.excerpt || '';
    } else {
      usedFallback = true;

      const titleElement = document.querySelector('title');
      title = titleElement?.textContent || '';

      const bodyElement = document.querySelector('body');
      const textContent = bodyElement?.textContent || '';

      markdown = textContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n\n');

      excerpt = markdown.substring(0, EXCERPT_MAX_LENGTH);
    }

    return {
      markdown,
      title,
      excerpt,
      usedFallback
    };
  } finally {
    dom.window.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.argv[2];

  if (!url) {
    console.error('Usage: fetch-web-content.js <url>');
    process.exit(1);
  }

  try {
    console.log(`Fetching ${url}...`);
    const result = await fetchWebContent(url);

    if (result.usedFallback) {
      console.warn('Warning: Basic extraction used, content may include navigation elements');
    }

    console.log(`\nTitle: ${result.title}`);
    console.log(`Excerpt: ${result.excerpt}`);
    console.log(`Length: ${result.markdown.length} chars`);
    console.log(`\nMarkdown:\n${result.markdown}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
