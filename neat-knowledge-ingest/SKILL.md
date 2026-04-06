---
name: neat-knowledge-ingest
description: Use when adding content to knowledge base - converts web/PDF/Word/Excel/ZIP/images/text to markdown with security warnings and automatic indexing
---

# Knowledge Base Ingest

**Role:** You are a data engineer who safely ingests content from various sources into a structured markdown knowledge base.

## Overview

Converts content to markdown with security warnings, AI-generated metadata, and automatic indexing.

**KB Types:** Project KB (progressive disclosure with source references) or Personal KB (full content
storage). Both use dynamic cluster-based organization. See
[KB Structure](../references/kb-structure.md).

**Supported:** Web (URL), ZIP, PDF, Word (.docx), Excel (.xlsx/.xls), Images, Text/markdown

**Limitations:** No .doc, complex formatting/images may degrade, nested ZIP skipped

**Command:** `/neat-knowledge-ingest <source>`

## When to Use

Add web articles, PDFs, Office files, images, or ZIP archives to KB. Build project context or personal knowledge repository.

## Quick Reference

| Source | Command | Notes |
| --- | --- | --- |
| Web page | `/neat-knowledge-ingest <url>` | Static HTML only (no JS-heavy sites) |
| PDF | `/neat-knowledge-ingest <path.pdf>` | Auto-chunked if > 20 pages |
| Word | `/neat-knowledge-ingest <path.docx>` | Legacy .doc unsupported |
| Excel | `/neat-knowledge-ingest <path.xlsx>` | Converts sheets to tables |
| ZIP | `/neat-knowledge-ingest <path.zip>` | Batch processing |
| Image | `/neat-knowledge-ingest <path.png>` | AI text extraction |
| Text | `/neat-knowledge-ingest <path.txt>` | Direct import |

**Security:** Two-layer checks (filename + content analysis)  
**Output:** Document saved to `{KB_PATH}/{category}/{filename}.md` with auto-generated metadata

## Prerequisites

Dependencies: mammoth, node-xlsx, sharp, @mozilla/readability, jsdom, turndown

Run `npm install`. Cancel if missing, show install instructions.

**Limitation:** Web ingestion requires static HTML. JS-heavy sites (SPAs, dynamic content) not supported.

## Workflow

**Do NOT skip or reorder steps.**

### Step 1: Detect KB

Follow [KB Detection](../references/kb-detection.md). If creating new KB, create `.index/` and `metadata.json`
immediately. Store as `KB_PATH`.

### Step 2: Detect Content Type

URL → `web`, `.zip` → `zip`, `.pdf` → `pdf`, `.docx` → `word`, `.xlsx/.xls` → `excel`, images → `image`,
`.doc` → error, other → `text`. Log: `Detected type: {contentType}`

### Step 3: ZIP Processing (ZIP only)

1. Run `extract-zip.js`, parse JSON, abort if fails
2. Sanitize base category (remove `.zip`, lowercase-hyphens)
3. Filter: supported → processable, unsupported → skipped, failures → failed
4. Process each: show progress, set category `<base>/<dir>`, run Steps 5-12 (skip Step 4 - Layer 1
   security; skip Step 7 - Review Quality for non-web files), continue on error
5. Cleanup: `rm -rf {tempDir}`
6. Show counts, note "Run /neat-knowledge-rebuild to update clusters"

**ZIP ends workflow.** Non-ZIP continues to Step 4.

### Step 4: Security Check - Layer 1 (Filename)

**Single files only.** Check filename for sensitive patterns (`.env*`, `.pem`, `.key`, `password`,
`credential`, `token`, `apikey`). If suspicious: warn, ask "Continue? (y/n)" (default: n).

### Step 5: Convert to Markdown

Log: `Fetching/Reading/Converting {source}...` **Do NOT echo content.**

**Web:** Run `<skill-dir>/scripts/fetch-web-content.js` with URL. Logs: "Fetching {url}...". Returns:
`{ markdown, title, url, excerpt, usedFallback }`. On success: "Article extracted ({length} chars)". If
usedFallback is true: "Warning: Basic extraction used, content may include navigation". On error: show message,
offer alternatives.  
**PDF:** Read (20-page chunks), title from filename  
**Word:** `convert-office.js convertWordToMarkdown()`  
**Excel:** `convert-office.js convertExcelToMarkdown()` → tables  
**Images:** Resize if needed (`resize-image.js` max 1568px), Read, extract text/diagrams, structured markdown  
**Text:** Read, wrap in heading if not `.md`

On error: show message, offer alternatives.

### Step 6: Review Content (Images Only)

Display markdown, prompt "Review. Edit or type 'ok':", use edited version.

### Step 7: Review Quality (Web Only)

Check first 1000-2000 chars. Good: log success, continue. Poor (too short <500 chars/paywall patterns
"subscribe to continue"/"sign in to read"/error page "404"/"access denied"): explain, offer alternatives.

### Step 8: Security Check - Layer 2 (Content)

Scan for API keys, passwords, private keys, DB strings, JWT, secrets. **If found:** Show "SECURITY
RISK", list findings (type, first 10 chars, location), warn "UPDATE CREDENTIALS", offer "1. Cancel /
2. Continue" (default: 1). If continue, set flag for Step 14 reminder. Distinguish examples vs. real
credentials.

### Step 9: Analyze and Suggest Category

Log: `Analyzing content...` Load `metadata.json`, check `kb_type`.

Spawn general-purpose subagent (description: "Analyze content and extract metadata") to return compact JSON (no
whitespace) with summary (2-3 sentences), key_concepts (3-8), related_topics (3-8), category (lowercase-hyphenated
string based on content analysis).

### Step 10: Set Metadata

Set tags filename (sanitized title), (key_concepts from AI analysis), category (from AI analysis). Store values as
`category`, `tags`, `filename`. Log: "Category: {category}, Tags: {tags}, Filename: {filename}"

### Step 11: Save Document

Path: `{KB_PATH}/{category}/{filename}`. Create category folder, build frontmatter, append markdown, write. Log path.

### Step 12: Generate Structured Summary

Spawn Explore subagent to extract title (first heading), summary (first 2-3 sentences/300 chars), key_concepts (5-10
terms), sections array (heading + first 100 chars) and return compact JSON (no whitespace). Receive compact JSON,
parse, validate. Log token count.

### Step 13: Update Indexes

**summaries.json:** Create `.index/` if missing. Load or create `{"documents": {}}`. If corrupt/malformed JSON,
recreate with empty structure and log warning: "Warning: summaries.json was corrupt, recreated with empty structure".
Add entry with title, summary, key_concepts, related_topics, category, tags, last_modified, and sections from Step
12.

**Key difference:** Project KB includes `"source"` field (relative path, enables progressive
disclosure). Personal KB omits source (content in document). Write compact JSON (no whitespace) to summaries.json.

**metadata.json:** Load (exists from Step 1), increment document_count, update last_updated
(ISO-8601), increment category/tag counts. Write compact JSON. Log: "Indexes updated"

### Step 14: Complete

Show: "Document added! Location: {path}, Category: {category}, Tags: {tags}". If sensitive flag: show Step 8 reminder.

**Note:** For Project KB, the query skill uses caching for efficient document access and conversion.

## Common Mistakes

- Attempting to ingest JS-heavy SPAs (won't work without JavaScript execution)
- Using rigid security patterns instead of reasoning
- Not reviewing web quality or handling errors
- Not using Read (PDF) or convert-office.js (Office)
- Missing dependency checks or index updates
