---
name: neat-knowledge-ingest
description: Use when adding content to knowledge base - converts web/PDF/Word/Excel/images/text to markdown with security warnings and automatic indexing - supports single file or batch directory import
---

# Knowledge Base Ingest

**Role:** You are a data engineer who safely ingests content from various sources into a structured markdown knowledge base.

## Overview

Converts web/PDF/Word/Excel/images/text to markdown with security checks and auto-indexing.

**Types:** Web (URL), PDF, Word (.docx), Excel (.xlsx/.xls), Images, Text/markdown

**Modes:** Single or batch (directory, recursive)

**Usage:** `/neat-knowledge-ingest <source>`

## Prerequisites

Dependencies: mammoth, node-xlsx, @mozilla/readability, jsdom, turndown. Run `npm install` if missing.

## Workflow

**Do NOT skip or reorder.**

### Step 1: Detect KB

Follow [KB Detection](../references/kb-detection.md). If creating new KB, create `.index/` and `metadata.json` immediately (summaries per-category as needed). Store as `KB_PATH`.

### Step 2: Detect Content Type

1. Check source exists
2. Detect type:
   - URL (http/https) → `web`
   - Directory (fs.statSync().isDirectory()) → `directory`
   - File by ext: `.pdf` → `pdf`, `.docx` → `word`, `.xlsx/.xls` → `excel`, `.png/.jpg/.jpeg/.gif` → `image`, `.md` → `markdown`, `.doc` → error, other → `text`
3. Log: `Detected type: {contentType}`

### Step 3: Directory Processing (Directory only)

1. Validate directory
2. Glob recursive (include: *.md/pdf/docx/xlsx/xls/png/jpg/gif/txt; exclude: node_modules/.git/dist/build/.next/out/*.tmp/*.bak)
3. Load ignore from `{KB_PATH}/.index/ignore`
4. Security Layer 1: Scan filenames (.env*, .pem, .key, password, credential, token, apikey), warn if suspicious
5. Filter, count, group by type
6. Preview with counts/size, ask "Continue?"
7. Process each: Run Steps 4-13 per file (skip 4/7/8), track success/skip/fail
8. Complete: "Directory import complete: {success}/{skip}/{fail}. Run /neat-knowledge-rebuild"

**Ends workflow.** Single files continue to Step 4.

### Step 4: Security Check - Layer 1 (Filename)

**Single files only.** Check filename for: `.env*`, `.pem`, `.key`, `password`, `credential`, `token`, `apikey`. If suspicious: warn, ask "Continue? (y/n)" (default: n).

### Step 5: Convert to Markdown

Log: `Fetching/Reading/Converting {source}...` **Do NOT echo content.**

**Web:** `node <skill-dir>/scripts/fetch-web-content.js <url>`, parse "Title:", "Excerpt:", "Length:", markdown after "Markdown:\n", check "Warning: Basic extraction"  
**PDF:** Read (20-page chunks), title from filename  
**Word:** `node scripts/convert-office.js <path>`, parse "Title:", "Type:", warnings, markdown after "Markdown:\n"  
**Excel:** `node scripts/convert-office.js <path>`, sheets to tables  
**Images:** Read, extract text/diagrams, structured markdown  
**Text:** Read, wrap in heading if not `.md`

On error: show, offer alternatives.

### Step 6: Choose Storage Mode (Local Files Only)

**Skip:** Web URLs (embedded), images (embedded)

**For:** PDF, Word, Excel, Markdown

Prompt:

```
Storage mode:
  1. Embedded - Full content in KB
  2. Referenced - Source, on-demand (summary in KB)

[1-2] (default: 1)
```

Parse: `1`/`embedded` → embedded, `2`/`referenced` → referenced, empty → embedded

Store for Step 11-12. **Embedded:** full doc to KB. **Referenced:** summary only, skip Step 11.

### Step 7: Review Content (Images Only)

Display markdown, prompt "Review. Edit or 'ok':", use edited.

### Step 8: Review Quality (Web Only)

Check first 1000-2000 chars. Good: log, continue. Poor (< 500 chars, paywall "subscribe"/"sign in", errors "404"/"access denied"): explain, offer alternatives.

### Step 9: Security Check - Layer 2 (Content)

Scan: API keys, passwords, private keys, DB strings, JWT, secrets. **If found:** Show "SECURITY RISK", list (type, first 10 chars, location), warn "UPDATE CREDENTIALS", offer "1. Cancel / 2. Continue" (default: 1). If continue, flag for Step 13. Distinguish examples vs real.

### Step 10: Generate Complete Metadata

Log "Analyzing content...", load existing categories from metadata.json

Spawn subagent with prompt:

```
Analyze, extract metadata. EXISTING (prefer): {categories}
Return JSON: {title, summary (2-3 sent, max 300 chars), tags (5-10), sections ([{heading, preview}]), category (lowercase-hyphenated), is_new, reasoning}
```

Parse/derive: Extract fields, sanitize title to filename

Calculate tokens: Create temp markdown with frontmatter, run `count-tokens.js`, parse `{summary, full, sections}`, clean temp

Store: title, summary, tags, sections, category, filename, tokens

Log: If is_new: "Creating category: {category} - {reasoning}". Then: "Category: {category}, Tags: {tags}, File: {filename}"

### Step 11: Save Document (Embedded Storage Only)

**Skip if:** `storage = "referenced"`

**If embedded:** Path `{KB_PATH}/{category}/{filename}`, create folder, build frontmatter, append markdown, write. Log path.

### Step 12: Update Indexes

Follow [KB Schema](../references/kb-schema.md).

**index.json:** Load/create, add entry (title, category, tags, file_path, storage), write compact

**summaries/{category}.json:** Load/create, add doc (filename key: title, summary, tags, sections, tokens, category, file_path, last_modified, storage, source if referenced), write atomic

**Source calc (referenced):** Relative path from source_root or KB parent

**metadata.json:** Increment document_count, categories[category], tags[tag], write compact

Order: index → summaries → metadata. Log "Indexes updated"

### Step 13: Complete

"Document added! Storage: {Embedded/Referenced}, Location/Source: {path}, Category: {category}, Tags: {tags}. Note: Run /neat-knowledge-rebuild periodically"

If sensitive: show security reminder

## Common Mistakes

Ingesting JS-heavy SPAs, rigid security patterns, using Read for Office files, not invoking scripts for web/Office
