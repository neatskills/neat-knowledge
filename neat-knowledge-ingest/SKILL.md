---
name: neat-knowledge-ingest
description: Use when adding content to knowledge base - converts web/PDF/Word/Excel/images/text to markdown with security warnings and automatic indexing - supports single file or batch directory import
---

# Knowledge Base Ingest

**Role:** You are a data engineer who safely ingests content from various sources into a structured markdown knowledge base.

## Overview

Converts content to markdown with security checks, AI metadata, and auto-indexing.

**References:** Shared at `references/kb-*.md`

**Storage:** Embedded (full in KB) or referenced (source, on-demand). See [KB Schema](../references/kb-schema.md).

**Types:** Web (URL), PDF, Word (.docx), Excel (.xlsx/.xls), Images, Text/markdown

**Modes:** Single file or batch (directory, recursive)

**Limits:** No .doc, complex formatting/images may degrade

**Usage:** `/neat-knowledge-ingest <source>` (URL, file, or directory)

## When to Use

Add web articles, PDFs, Office files, or images to KB (single/batch). Build knowledge repository.

## Quick Reference

| Source | Command | Notes |
| --- | --- | --- |
| Web | `/neat-knowledge-ingest <url>` | Static HTML only |
| PDF | `/neat-knowledge-ingest <path.pdf>` | Auto-chunked if > 20 pages |
| Word | `/neat-knowledge-ingest <path.docx>` | .doc unsupported |
| Excel | `/neat-knowledge-ingest <path.xlsx>` | Sheets to tables |
| Image | `/neat-knowledge-ingest <path.png>` | AI text extraction |
| Text | `/neat-knowledge-ingest <path.txt>` | Direct import |
| **Batch** | `/neat-knowledge-ingest <directory>` | **Recursive all types** |

**Security:** Two-layer (filename + content)  
**Storage:** Web/images embedded, local files user choice (default embedded)  
**Output:** Embedded → `{KB_PATH}/{category}/{file}.md`, referenced → summary only

## Prerequisites

Dependencies: mammoth, node-xlsx, @mozilla/readability, jsdom, turndown

Run `npm install`. Cancel if missing, show install instructions.

**Limit:** Web needs static HTML (no JS-heavy sites)

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

**Triggered:** Source is directory (auto-detect, recursive)

1. **Validate:** Path is directory (else error "Not a directory: {path}")

2. **Glob recursive:**

   ```javascript
   Pattern: `${sourcePath}/**/*`
   Include: *.md, *.pdf, *.docx, *.xlsx, *.xls, *.png, *.jpg, *.jpeg, *.gif, *.txt
   Exclude: node_modules/, .git/, dist/, build/, .next/, out/, *.tmp, *.bak
   ```

3. **Load ignore:** Check `{KB_PATH}/.index/ignore`, parse gitignore-style

4. **Security (Layer 1):**
   - Scan filenames for: `.env*`, `.pem`, `.key`, `password`, `credential`, `token`, `apikey`
   - If suspicious: warn, ask "Continue? (y/n)" (default: n)

5. **Filter/count:** Remove ignored/unsupported, group by type, calc size

6. **Preview:**

   ```
   Found {N} files in {path}:
   
   By type:
   - Markdown: {count}
   - PDF: {count}
   - Word: {count}
   
   Total: {size}
   
   Continue? [y/n] (default: y)
   ```

   If `n`: cancel

7. **Process:**
   - Progress: "Processing {current}/{total}: {file}"
   - Run Steps 4-13 per file
   - **Skip:** Step 4 (Layer 1 done), Step 7 (image review), Step 8 (web quality)
   - Continue on errors
   - Track: success, skip, fail counts

8. **Complete:**

   ```
   Directory import complete:
   - Successful: {success}
   - Skipped: {skip}
   - Failed: {fail}
   
   Run /neat-knowledge-rebuild to maintain categories
   ```

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

Log: `Analyzing content...`

Load `metadata.json`, extract existing categories.

**Spawn subagent:**

If existing categories:

```
Analyze content, extract metadata.

EXISTING (prefer):
${existingCategories.map(c => `- ${c.name} (${c.count})`).join('\n')}

Category: 1) Match existing (PREFERRED), 2) Create NEW if doesn't fit, 3) lowercase-hyphenated

Return JSON (no whitespace):
{
  "title": "from heading or filename",
  "summary": "2-3 sentences (max 300 chars)",
  "tags": ["5-10", "specific", "terms"],
  "sections": [{"heading": "Title", "preview": "first 100 chars"}],
  "category": "web-development",
  "is_new": false,
  "reasoning": "Fits existing web-development"
}
```

If no existing:

```
Analyze content, extract metadata.

Return JSON (no whitespace):
{
  "title": "from heading or filename",
  "summary": "2-3 sentences (max 300 chars)",
  "tags": ["5-10", "specific", "terms"],
  "sections": [{"heading": "Title", "preview": "first 100 chars"}],
  "category": "lowercase-hyphenated"
}
```

**Parse/derive:**

- Extract: `title`, `summary`, `tags`, `sections`, `category`, `is_new`, `reasoning`
- Derive `filename`: Sanitize title (lowercase, spaces/special → hyphens, add `.md`)

**Calculate tokens:**

Create temp markdown with frontmatter:

```markdown
---
title: {title}
summary: {summary}
tags: {tags}
category: {category}
---

{markdown_content}
```

Bash: `node scripts/count-tokens.js /tmp/temp-doc-{timestamp}.md`

Parse JSON:

```json
{"summary": 150, "full": 3500, "sections": {"Introduction": 200, "Architecture": 800}}
```

Store tokens for Step 12, clean temp file.

**Store for Steps 11-12:** `title`, `summary`, `tags`, `sections`, `category`, `filename`, `tokens`

**Log:**

- If `is_new`: "Creating category: {category} - {reasoning}"
- "Category: {category}, Tags: {tags}, File: {filename}"

### Step 11: Save Document (Embedded Storage Only)

**Skip if:** `storage = "referenced"`

**If embedded:** Path `{KB_PATH}/{category}/{filename}`, create folder, build frontmatter, append markdown, write. Log path.

### Step 12: Update Indexes

Follow [KB Schema](../references/kb-schema.md).

**index.json:** Load or create `{"documents": {}}` at `.index/index.json`. If corrupt: recreate empty, log "Warning: index.json corrupt, recreated empty".

Add entry: `title`, `category`, `tags` (Step 10), `file_path`: `{category}/{filename}.md`, `storage`. Write compact.

**summaries/{category}.json:**

1. Load or create:
   - Path: `.index/summaries/{category}.json`
   - If missing: Create `{"category": "{category}", "documents": {}}`
   - If corrupt: Log, treat as new

2. Add/update document:
   - Key: `{filename}`
   - Value: `title`, `summary`, `tags`, `sections`, `tokens`, `category`, `file_path`, `last_modified` (ISO-8601), `storage`, `source` (referenced only, relative)

3. **Source calc (referenced only):**
   - Get KB_PATH, source_root from metadata
   - Relative: If starts with source_root: `path.relative(source_root, sourcePath)`, else: `path.relative(path.dirname(KB_PATH), sourcePath)`
   - Example: `/Users/ji/project/docs/arch.pdf` + source_root `/Users/ji/project/` → `docs/arch.pdf`

4. Write atomic:

   ```javascript
   temp = `.index/summaries/.${category}.json.tmp`;
   fs.writeFileSync(temp, JSON.stringify(data, null, 2));
   fs.renameSync(temp, `.index/summaries/${category}.json`);
   ```

**metadata.json:** Load from `.index/metadata.json`. Update: increment `document_count`, `categories[category]`, `tags[tag]` (set 1 if new). Write compact.

**Order:** index.json, summaries, metadata.json. If fails, abort (partial OK). Log: "Indexes updated"

### Step 13: Complete

**If embedded:**

```
Document added!
  Storage: Embedded
  Location: {KB_PATH}/{category}/{filename}.md
  Category: {category}
  Tags: {tags}

Note: Run /neat-knowledge-rebuild periodically to optimize categories
```

**If referenced:**

```
Document added!
  Storage: Referenced
  Source: {source}
  Summary in KB
  Category: {category}
  Tags: {tags}

Note: Run /neat-knowledge-rebuild periodically to:
  - Validate source links
  - Optimize categories
```

If sensitive flag: show security reminder from Step 9.

## Common Mistakes

- Ingesting JS-heavy SPAs (needs JS execution)
- Rigid security patterns (reason instead)
- Not reviewing web quality or errors
- Using Read for Office files (use convert-office.js for .docx/.xlsx)
- Not invoking fetch-web-content.js for URLs (can't fetch directly)
- Missing dependency checks or index updates
