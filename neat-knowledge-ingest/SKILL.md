---
name: neat-knowledge-ingest
description: Use when adding content to knowledge base - converts web/PDF/Word/Excel/images/text to markdown with security warnings and automatic indexing - supports single file or batch directory import
---

# Knowledge Base Ingest

**Role:** You are a data engineer who safely ingests content from various sources into a structured markdown knowledge base.

## Overview

Converts content to markdown with security warnings, AI-generated metadata, and automatic indexing.

**References:** Shared across all neat-knowledge skills at `references/kb-*.md`

**Storage Modes:** Embedded (full content in KB) or referenced (content at source, loaded on-demand). See [KB Schema](../references/kb-schema.md).

**Content types:** Web (URL), PDF, Word (.docx), Excel (.xlsx/.xls), Images, Text/markdown

**Import modes:** Single file or batch (directory with recursive auto-detection)

**Limitations:** No .doc, complex formatting/images may degrade

**Usage:** `/neat-knowledge-ingest <source>` (URL, file, or directory)

## When to Use

Add web articles, PDFs, Office files, or images to KB (single or batch). Build knowledge repository.

## Quick Reference

| Source | Command | Notes |
| --- | --- | --- |
| Web page | `/neat-knowledge-ingest <url>` | Static HTML only (no JS-heavy sites) |
| PDF | `/neat-knowledge-ingest <path.pdf>` | Auto-chunked if > 20 pages |
| Word | `/neat-knowledge-ingest <path.docx>` | Legacy .doc unsupported |
| Excel | `/neat-knowledge-ingest <path.xlsx>` | Converts sheets to tables |
| Image | `/neat-knowledge-ingest <path.png>` | AI text extraction |
| Text | `/neat-knowledge-ingest <path.txt>` | Direct import |
| **Batch** | `/neat-knowledge-ingest <directory>` | **Recursively imports all supported files** |

**Security:** Two-layer checks (filename + content)  
**Storage:** Web/images always embedded, local files user chooses (embedded default)  
**Output:** Embedded → `{KB_PATH}/{category}/{filename}.md`, referenced → category summary only

## Prerequisites

Dependencies: mammoth, node-xlsx, @mozilla/readability, jsdom, turndown

Run `npm install`. Cancel if missing, show install instructions.

**Limitation:** Web ingestion requires static HTML. JS-heavy sites unsupported.

## Workflow

**Do NOT skip or reorder steps.**

### Step 1: Detect KB

Follow [KB Detection](../references/kb-detection.md). If creating new KB, create `.index/` and `metadata.json` immediately (summaries created per-category as needed). Store as `KB_PATH`.

### Step 2: Detect Content Type

1. Check if source exists
2. Detect type:
   - URL (http/https) → `web`
   - Directory (fs.statSync().isDirectory()) → `directory`
   - File by extension: `.pdf` → `pdf`, `.docx` → `word`, `.xlsx/.xls` → `excel`, `.png/.jpg/.jpeg/.gif` → `image`, `.md` → `markdown`, `.doc` → error, other → `text`
3. Log: `Detected type: {contentType}`

### Step 3: Directory Processing (Directory only)

**Triggered when:** Source is directory (auto-detects, always recursive)

1. **Validate:** Path exists and is directory. If not: error "Not a directory: {sourcePath}"

2. **Glob recursively:**

   ```javascript
   Pattern: `${sourcePath}/**/*`
   Include: *.md, *.pdf, *.docx, *.xlsx, *.xls, *.png, *.jpg, *.jpeg, *.gif, *.txt
   Exclude: node_modules/, .git/, dist/, build/, .next/, out/, *.tmp, *.bak
   ```

3. **Load ignore patterns:** Check `{KB_PATH}/.index/ignore`, parse gitignore-style patterns

4. **Security check (Layer 1):**
   - Scan filenames for sensitive patterns (`.env*`, `.pem`, `.key`, `password`, `credential`, `token`, `apikey`)
   - If suspicious: warn with list, ask "Continue? (y/n)" (default: n)

5. **Filter and count:** Remove ignored patterns, remove unsupported extensions, group by type, calculate total size

6. **Preview and confirm:**

   ```
   Found {N} files in {sourcePath}:
   
   By type:
   - Markdown: {count} files
   - PDF: {count} files
   - Word: {count} files
   - Excel: {count} files
   - Images: {count} files
   
   Total size: {total_size}
   
   Continue? [y/n] (default: y):
   ```

   If `n`: cancel and return

7. **Process each file:**
   - Show progress: "Processing {current}/{total}: {filename}"
   - Run Steps 4-13 per file
   - **Skip:** Step 4 (Layer 1 checked at directory level), Step 7 (image review), Step 8 (web quality)
   - Continue on errors
   - Track: successful, skipped, failed counts

8. **Batch completion:**

   ```
   Directory import complete:
   - Successful: {success_count} files
   - Skipped: {skip_count} files
   - Failed: {fail_count} files
   
   Run /neat-knowledge-rebuild to maintain categories
   ```

**Directory import ends workflow.** Single files continue to Step 4.

### Step 4: Security Check - Layer 1 (Filename)

**Single files only.** Check filename for sensitive patterns (`.env*`, `.pem`, `.key`, `password`, `credential`, `token`, `apikey`). If suspicious: warn, ask "Continue? (y/n)" (default: n).

### Step 5: Convert to Markdown

Log: `Fetching/Reading/Converting {source}...` **Do NOT echo content.**

**Web:** Bash: `node <skill-dir>/scripts/fetch-web-content.js <url>`. Parse "Title:", "Excerpt:", "Length:", then markdown after "Markdown:\n". Check for "Warning: Basic extraction".  
**PDF:** Read (20-page chunks), title from filename  
**Word:** Bash: `node scripts/convert-office.js <file-path>`. Parse "Title:", "Type:", warnings, markdown after "Markdown:\n".  
**Excel:** Bash: `node scripts/convert-office.js <file-path>`. Converts sheets to markdown tables.  
**Images:** Read, extract text/diagrams, structured markdown  
**Text:** Read, wrap in heading if not `.md`

On error: show message, offer alternatives.

### Step 6: Choose Storage Mode (Local Files Only)

**Skip for:** Web URLs (always embedded), images (always embedded)

**For:** PDF, Word, Excel, Markdown

Prompt:

```
Storage mode:
  1. Embedded - Copy full content to KB
  2. Referenced - Keep at source, load on-demand (summary only in KB)

[1-2] (default: 1):
```

Parse:

- `1` or `embedded` → `storage = "embedded"`
- `2` or `referenced` → `storage = "referenced"`
- Empty (default) → `storage = "embedded"`

Store for Step 11-12. **Embedded** = full document saved to KB. **Referenced** = summary only, Step 11 skipped.

### Step 7: Review Content (Images Only)

Display markdown, prompt "Review. Edit or type 'ok':", use edited version.

### Step 8: Review Quality (Web Only)

Check first 1000-2000 chars. Good: log, continue. Poor (< 500 chars or paywall patterns "subscribe to continue"/"sign in to read", error patterns "404"/"access denied"): explain, offer alternatives.

### Step 9: Security Check - Layer 2 (Content)

Scan for API keys, passwords, private keys, DB strings, JWT, secrets. **If found:** Show "SECURITY RISK", list findings (type, first 10 chars, location), warn "UPDATE CREDENTIALS", offer "1. Cancel / 2. Continue" (default: 1). If continue, set flag for Step 13 reminder. Distinguish examples vs. real credentials.

### Step 10: Generate Complete Metadata

Log: `Analyzing content...`

Load `metadata.json`, extract existing categories.

**Spawn subagent:**

If existing categories:

```
Analyze content, extract metadata.

EXISTING CATEGORIES (prefer these):
${existingCategories.map(c => `- ${c.name} (${c.count} docs)`).join('\n')}

Category:
1. If clearly matches existing, use it (PREFERRED)
2. Create NEW only if doesn't fit existing
3. New = lowercase-hyphenated
4. Consider: what would human browsing KB expect?

Return JSON (no whitespace):
{
  "title": "from first heading or filename",
  "summary": "2-3 sentences (max 300 chars)",
  "tags": ["5-10", "specific", "searchable", "terms"],
  "sections": [
    {"heading": "Section Title", "preview": "first 100 chars"}
  ],
  "category": "web-development",
  "is_new": false,
  "reasoning": "Content about React hooks, fits existing web-development"
}
```

If no existing categories:

```
Analyze content, extract metadata.

Return JSON (no whitespace):
{
  "title": "from first heading or filename",
  "summary": "2-3 sentences (max 300 chars)",
  "tags": ["5-10", "specific", "searchable", "terms"],
  "sections": [
    {"heading": "Section Title", "preview": "first 100 chars"}
  ],
  "category": "lowercase-hyphenated from content"
}
```

**Parse and derive:**

- Extract: `title`, `summary`, `tags`, `sections`, `category`, `is_new`, `reasoning`
- Derive `filename`: Sanitize title (lowercase, spaces/special chars → hyphens, add `.md`)

**Store** for Steps 11-12: `title`, `summary`, `tags`, `sections`, `category`, `filename`

**Log:**

- If `is_new: true`: "Creating new category: {category} - {reasoning}"
- "Category: {category}, Tags: {tags}, Filename: {filename}"

### Step 11: Save Document (Embedded Storage Only)

**Skip if:** `storage = "referenced"`

**If embedded:** Path: `{KB_PATH}/{category}/{filename}`. Create category folder, build frontmatter, append markdown, write. Log path.

### Step 12: Update Indexes

Follow [KB Schema](../references/kb-schema.md) structures.

**index.json:** Load or create `{"documents": {}}` at `{KB_PATH}/.index/index.json`. If corrupt: recreate empty, log "Warning: index.json was corrupt, recreated with empty structure".

Add entry with `title`, `category`, `tags` from Step 10, `file_path`: `{category}/{filename}.md`, `storage`: `"embedded"` or `"referenced"`. Write compact JSON.

**summaries/{category}.json:** Update category summary at `.index/summaries/{category}.json`:

1. Load existing or create new:
   - Path: `.index/summaries/{category}.json`
   - If doesn't exist: Create `{"category": "{category}", "documents": {}}`
   - If corrupt: Log warning, treat as new file

2. Add/update document in documents object:
   - Key: `{filename}` from Step 10
   - Value: `title`, `summary`, `tags`, `sections`, `category` from Step 10, `file_path`: `{category}/{filename}.md`, `last_modified`: Current ISO-8601 timestamp, `storage`: `"embedded"` or `"referenced"`, `source` (referenced only): Relative path to original from KB_PATH

3. **Source path calculation (referenced only):**
   - Get KB root from KB_PATH, source_root from metadata.json
   - Calculate relative: If sourcePath starts with source_root: `path.relative(source_root, sourcePath)`, otherwise: `path.relative(path.dirname(KB_PATH), sourcePath)`
   - Example: Source `/Users/ji/project/docs/architecture.pdf`, source_root `/Users/ji/project/` → `docs/architecture.pdf`

4. Write atomically:

   ```javascript
   const temp = `.index/summaries/.${category}.json.tmp`;
   fs.writeFileSync(temp, JSON.stringify(categoryData, null, 2));
   fs.renameSync(temp, `.index/summaries/${category}.json`);
   ```

Write formatted JSON with 2-space indentation.

**metadata.json:** Load from `{KB_PATH}/.index/metadata.json`. Update:

- Increment `document_count`
- Increment `categories[category]` (or set 1 if new)
- For each tag: increment `tags[tag]` (or set 1 if new)

Write compact JSON.

**Write order:** index.json, summaries, metadata.json. If any fails, abort (partial state acceptable). Log: "Indexes updated"

### Step 13: Complete

Summary based on storage:

**If embedded:**

```
Document added!
  Storage: Embedded
  Location: {KB_PATH}/{category}/{filename}.md
  Category: {category}
  Tags: {tags}
```

**If referenced:**

```
Document added!
  Storage: Referenced
  Source: {source}
  Summary stored in KB
  Category: {category}
  Tags: {tags}
```

If sensitive flag: show security reminder from Step 9.

Note: "Run /neat-knowledge-rebuild periodically to optimize category structure - AI redesigns categories based on all documents"

## Common Mistakes

- Ingesting JS-heavy SPAs (won't work without JS execution)
- Using rigid security patterns instead of reasoning
- Not reviewing web quality or handling errors
- Using Read for Office files (Read can't parse .docx/.xlsx binary - use convert-office.js)
- Not invoking fetch-web-content.js for URLs (Claude can't fetch web directly)
- Missing dependency checks or index updates
