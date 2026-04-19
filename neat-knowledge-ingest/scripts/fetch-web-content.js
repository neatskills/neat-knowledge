#!/usr/bin/env node
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';

const MAX_RESPONSE_SIZE = 10_000_000;
const MIN_HTML_LENGTH = 100;
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
    throw new Error(`Response size ${contentLength} bytes exceeds limit of ${MAX_RESPONSE_SIZE} bytes`);
  }

  let totalSize = 0;
  const streamReader = response.body.getReader();
  const bytes = [];

  try {
    while (true) {
      const { done, value } = await streamReader.read();
      if (done) break;

      totalSize += value.length;
      if (totalSize > MAX_RESPONSE_SIZE) {
        throw new Error(`Response size ${totalSize} bytes exceeds limit of ${MAX_RESPONSE_SIZE} bytes`);
      }

      bytes.push(value);
    }
  } finally {
    streamReader.releaseLock();
  }

  const combined = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of bytes) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  const decoder = new TextDecoder();
  const html = decoder.decode(combined);

  if (!html || html.length < MIN_HTML_LENGTH) {
    throw new Error('Response body too small or empty');
  }

  const dom = new JSDOM(html, { url });

  try {
    const document = dom.window.document;
    const articleReader = new Readability(document);
    const article = articleReader.parse();

    let markdown, title, excerpt;

    if (article) {
      markdown = turndownService.turndown(article.content);
      title = article.title || '';
      excerpt = article.excerpt || '';
    } else {
      const titleElement = document.querySelector('title');
      title = titleElement?.textContent || '';

      const bodyElement = document.querySelector('body');
      const textContent = bodyElement?.textContent || '';

      const lines = textContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      excerpt = lines.slice(0, 3).join(' ').substring(0, EXCERPT_MAX_LENGTH);
      markdown = lines.join('\n\n');
    }

    return {
      markdown,
      title,
      excerpt,
      usedFallback: !article
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
