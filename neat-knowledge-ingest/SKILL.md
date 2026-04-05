---
name: neat-knowledge-ingest
description: Use when adding content to knowledge base - converts web/PDF/Word/Excel/ZIP/images/text to markdown with security warnings and automatic indexing
---

# Knowledge Base Ingest

**Role:** You are a data engineer who safely ingests content from various sources into a structured markdown knowledge base.

## Overview

Converts content to markdown with security warnings, AI-generated metadata, and automatic indexing.

**KB Types:** Project KB (progressive disclosure with source references) or Personal KB (full content storage). Both use dynamic cluster-based organization. See [KB Structure](../references/knowledge-structure.md).

**Supported:** Web (URL), ZIP, PDF, Word (.docx), Excel (.xlsx/.xls), Images, Text/markdown

**Limitations:** No .doc, complex formatting/images may degrade, nested ZIP skipped

**Command:** `/neat-knowledge-ingest <source>`

## When to Use

Add web articles, PDFs, Office files, images, or ZIP archives to KB. Build project context or personal knowledge repository.

## Quick Reference

| Source | Command | Notes |
| --- | --- | --- |
| Web page | `/neat-knowledge-ingest <url>` | Requires Chrome MCP |
| PDF | `/neat-knowledge-ingest <path.pdf>` | Auto-chunked if > 20 pages |
| Word | `/neat-knowledge-ingest <path.docx>` | Legacy .doc unsupported |
| Excel | `/neat-knowledge-ingest <path.xlsx>` | Converts sheets to tables |
| ZIP | `/neat-knowledge-ingest <path.zip>` | Batch processing |
| Image | `/neat-knowledge-ingest <path.png>` | AI text extraction |
| Text | `/neat-knowledge-ingest <path.txt>` | Direct import |

**Security:** Two-layer checks (filename + content analysis)  
**Output:** Document saved to `{KB_PATH}/{category}/{filename}.md` with auto-generated metadata

## Prerequisites

Chrome MCP (web), `mammoth`/`xlsx` (Office), `sharp` (images). Run `npm install`. Cancel if missing, show install instructions.

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
4. Process each: show progress, set category `<base>/<dir>`, run Steps 5-12 (skip Step 4 - Layer 1 security; skip Step 7 - Review Quality for non-web files), continue on error
5. Cleanup: `rm -rf {tempDir}`
6. Show counts, note "Run /neat-knowledge-rebuild to update clusters"

**ZIP ends workflow.** Non-ZIP continues to Step 4.

### Step 4: Security Check - Layer 1 (Filename)

**Single files only.**

Check filename for sensitive patterns (`.env*`, `.pem`, `.key`, `password`, `credential`, `token`, `apikey`).
If suspicious: warn, ask "Continue? (y/n)" (default: n).

### Step 5: Convert to Markdown

Log: `Fetching/Reading/Converting {source}...` **Do NOT echo content.**

**Web:** Check Chrome MCP, navigate/extract text/title/url  
**PDF:** Read (20-page chunks), title from filename  
**Word:** `convert-office.js convertWordToMarkdown()`  
**Excel:** `convert-office.js convertExcelToMarkdown()` → tables  
**Images:** Resize if needed (`resize-image.js` max 1568px), Read, extract text/diagrams, structured markdown  
**Text:** Read, wrap in heading if not `.md`

On error: show message, offer alternatives.

### Step 6: Review Content (Images Only)

Display markdown, prompt "Review. Edit or type 'ok':", use edited version.

### Step 7: Review Quality (Web Only)

Check first 1000-2000 chars. Good: log success, continue. Poor (navigation/paywall): explain, offer alternatives.

### Step 8: Security Check - Layer 2 (Content)

Scan for API keys, passwords, private keys, DB strings, JWT, secrets.

**If found:** Show "SECURITY RISK", list findings (type, first 10 chars, location), warn "UPDATE CREDENTIALS",
offer "1. Cancel / 2. Continue" (default: 1). If continue, set flag for Step 13 reminder.
Distinguish examples vs. real credentials.

### Step 9: Analyze and Suggest Category

Log: `Analyzing content...`

Load `metadata.json`, check `kb_type` (exists from Step 1).

**Project KB (kb_type: "project"):**

Spawn sub-agent to analyze content and return JSON: summary (2-3 sentences), key_concepts (3-8), related_topics (3-8), category. Category must be one of: `analysis`, `domains`, `adrs`. Fallback: "analysis"

**Personal KB (kb_type: "personal" or missing):**

Spawn sub-agent to analyze content and return JSON: summary (2-3 sentences), key_concepts (3-8), related_topics (3-8), category (lowercase-hyphens). Suggest any descriptive category. Fallback: "general"

### Step 10: Confirm Metadata

Suggest tags (first 5 concepts), filename (sanitized title). Show metadata, prompt with defaults.

**Project KB:** Category must be one of: analysis, domains, adrs. If user enters invalid category, re-prompt.

**Personal KB:** Category can be any lowercase-hyphenated string.

Parse tags, log "Metadata confirmed."

### Step 11: Save Document

Path: `{KB_PATH}/{category}/{filename}`. Create category folder, build frontmatter, append markdown, write. Log path.

### Step 11.5: Generate Structured Summary

**Purpose:** Generate structured summaries for progressive disclosure (all KB types).

Spawn Explore subagent with task:

```text
Read file: {saved_path}

Generate structured summary as JSON with these steps:

1. Extract generic fields (always):
{
  "title": "Extract from first # heading",
  "summary": "First 2-3 sentences or first 300 chars",
  "key_concepts": ["Extract 5-10 key terms from headings/bold text"],
  "sections": [
    {"heading": "Section Name", "summary": "First 100 chars"}
  ]
}

2. Detect SDD patterns and enrich (optional):

IF document contains "## L0", "## L1", "## L3", "## L6" headings:
  Add "sdd_type": "analysis"
  Add "layers": {
    "L0": "Extract L0 section (first 500 chars)",
    "L1": "Extract L1 section (first 500 chars)",
    "L3": "Extract L3 section (first 500 chars)",
    "L6": "Extract L6 section (first 500 chars)"
  }
  Add "structured": {
    "tech_stack": ["Parse from L1 if present"],
    "components": ["Parse from L3 if present"],
    "risks": ["Parse from L6 if present"]
  }

IF document contains "## Investigation:" patterns:
  Add "sdd_type": "domain_knowledge"
  Add "investigations": [
    {
      "title": "Investigation title",
      "slug": "investigation-slug",
      "summary": "First paragraph (150 chars)"
    }
  ]

IF frontmatter has "state:" and "goal:" fields:
  Add "sdd_type": "feature"
  Add "state": "Extract from frontmatter state field"
  Add "goal": "Extract from frontmatter goal field"

IF document has "Status:" and "Decision:" sections:
  Add "sdd_type": "adr"
  Add "status": "Extract from Status section"
  Add "decision": "Extract Decision section (first 200 chars)"

Return JSON only.
```

**Why subagent:**

- File could be 5-15K tokens
- Subagent reads full file, extracts summary (~500-1K tokens)
- Main context receives only summary JSON
- Read MORE (10K), return LESS (1K) = 90% context savings

**Receive summary JSON, parse, validate required fields present.**

Log: "Generated structured summary (X tokens)"

### Step 12: Update Indexes

**summaries.json:** Create `.index/` if missing. Load (or create `{"documents": {}}`).

Add entry to `documents` object:

```json
{
  "filename": {
    "title": "Document title",
    "summary": "Brief overview",
    "key_concepts": [...],
    "related_topics": [...],
    "category": "category-name",
    "tags": [...],
    "last_modified": "ISO-8601 timestamp",
    "source": "relative/path/from/KB_PATH",  // Project KB only
    ...structured fields from Step 11.5 if SDD detected...
  }
}
```

**Key difference:**

- **Project KB:** Include `"source"` field pointing to saved document path (relative from KB_PATH). This enables progressive disclosure - KB entry has summary, full content read from source.
- **Personal KB:** Omit `"source"` field. Content is stored in the document itself at `{KB_PATH}/{category}/{filename}.md`.

Write summaries.json.

**metadata.json:** Load (exists from Step 1), increment `document_count`, update `last_updated` (ISO-8601),
increment category/tag counts. Write.

**Logging:**

- **Project KB:** "Indexes updated (source: {relative_path} - progressive disclosure enabled)"
- **Personal KB:** "Indexes updated"

### Step 13: Complete

Show: "Document added! Location: {path}, Category: {category}, Tags: {tags}". If sensitive flag: show Step 8 reminder.

## Common Mistakes

- Not checking Chrome MCP before web import
- Using rigid security patterns instead of reasoning
- Not reviewing web quality or handling errors
- Not using Read (PDF) or convert-office.js (Office)
- Missing dependency checks or index updates
