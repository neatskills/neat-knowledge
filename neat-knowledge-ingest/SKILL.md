---
name: neat-knowledge-ingest
description: Use when adding content to knowledge base - converts web/PDF/Word/Excel/images/text to markdown with security warnings and automatic indexing - supports single file or batch directory import
---

# Knowledge Base Ingest

**Role:** You are a data engineer who safely ingests content from various sources into a structured markdown knowledge base.

## Overview

Converts web/PDF/Word/Excel/images/text to markdown with security checks and auto-indexing.

**Types:** Web, PDF, Word (.docx), Excel (.xlsx/.xls), Images, Text/markdown  
**Modes:** Single or batch (directory, recursive)  
**Usage:** `/neat-knowledge-ingest <source>`

## Prerequisites

Dependencies: mammoth, node-xlsx, @mozilla/readability, jsdom, turndown (run `npm install` if missing)

## Workflow

**Do NOT skip or reorder.**

### Step 1: Detect KB

Follow [KB Detection](../references/kb-detection.md). If new KB, create `.index/` and `metadata.json`. Store as `KB_PATH`.

### Step 2: Detect Content Type

Check source exists, detect type: URL → `web`, Directory → `directory`, File by ext: `.pdf`/`.docx`/`.xlsx`/`.xls`/images/`.md`/other → respective type (`.doc` → error). Log: `Detected type: {contentType}`

### Step 3: Directory Processing (Directory only)

Glob recursive (*.md/pdf/docx/xlsx/xls/png/jpg/gif/txt; exclude: node_modules/.git/dist/build/.next/out/*.tmp/*.bak), load ignore from `{KB_PATH}/.index/ignore`, security scan filenames (.env*, .pem, .key, password, credential, token, apikey), warn if found. Preview counts/size, ask "Continue?". Process each: Run Steps 4-13 per file (skip 4/7/8), track success/skip/fail. Complete: "Directory import complete: {success}/{skip}/{fail}. Run /neat-knowledge-rebuild"

**Ends workflow.** Single files continue to Step 4.

### Step 4: Security Check - Layer 1 (Filename)

**Single files only.** Check filename (.env*, .pem, .key, password, credential, token, apikey). If suspicious: warn, ask "Continue? (y/n)" (default: n).

### Step 5: Convert to Markdown

Log: `Fetching/Reading/Converting {source}...` **Do NOT echo content.**

**Web:** `node <skill-dir>/scripts/fetch-web-content.js <url>`, parse title/excerpt/length  
**PDF:** Read (20-page chunks), title from filename  
**Word:** `node scripts/convert-office.js <path>`, parse title/type/warnings  
**Excel:** `node scripts/convert-office.js <path>`, sheets to tables  
**Images:** Read, extract text/diagrams, structured markdown  
**Text:** Read, wrap in heading if not `.md`

On error: show, offer alternatives.

### Step 6: Choose Storage Mode (Local Files Only)

**Skip:** Web URLs, images (auto-embedded). **For:** PDF, Word, Excel, Markdown

Prompt: "Storage mode: 1. Embedded - Full content, 2. Referenced - Source, on-demand (summary) [1-2] (default: 1)"

Parse: `1`/`embedded` → embedded, `2`/`referenced` → referenced, empty → embedded. Store for Step 11-12. Embedded: full doc. Referenced: summary only, skip Step 11.

### Step 7: Review Content (Images Only)

Display markdown, prompt "Review. Edit or 'ok':", use edited version if provided.

### Step 8: Review Quality (Web Only)

Check first 1000-2000 chars. Good: log, continue. Poor (< 500 chars, paywall, errors): explain, offer alternatives.

### Step 9: Security Check - Layer 2 (Content)

Scan API keys, passwords, private keys, DB strings, JWT, secrets. If found: Show "SECURITY RISK", list (type, first 10 chars, location), warn "UPDATE CREDENTIALS", offer "1. Cancel / 2. Continue" (default: 1), flag for Step 13 if continue. Distinguish examples vs real.

### Step 10: Generate Complete Metadata

Log "Analyzing content...", load existing categories. Detect mode: Frontmatter `category: captures` + `type` → CAPTURE, otherwise → REGULAR

**CAPTURE:** Validate type in ["solutions", "workflows"]. If invalid: error "Invalid capture type '{type}'. Expected 'solutions' or 'workflows'", abort ingestion. Spawn subagent: "Analyze CAPTURE. Type: {type}. Generate: title, summary (2-3 sentences, max 300 chars), 5-10 tags, sections. Return JSON". Parse, sanitize title, store: title, summary, tags, sections, category: "captures", type, filename, tokens. Log: "Capture type: {type}, Tags: {tags}, File: {filename}"

**REGULAR:** Spawn subagent: "Analyze document. EXISTING categories: {categories}. Generate: title, summary (2-3 sentences, max 300 chars), 5-10 tags, sections, category (prefer existing). Return JSON". Parse, sanitize title, store: title, summary, tags, sections, category, filename, tokens. Log: If is_new: "Creating category: {category} - {reasoning}". Then: "Category: {category}, Tags: {tags}, File: {filename}"

**Both:** Calculate tokens (temp markdown, run `count-tokens.js`, parse, clean)

### Step 11: Save Document (Embedded Storage Only)

Skip if `storage = "referenced"`. Path: Captures → `{KB_PATH}/captures/{type}/{filename}`, Regular → `{KB_PATH}/{category}/{filename}`. Create folder, build frontmatter (Captures: category: captures, type, date; Regular: category, synthesized_from if exists; Both: title, summary, tags, sections, tokens), append markdown, write, log path

### Step 12: Update Indexes

Follow [KB Schema](../references/kb-schema.md).

**index.json:** Load/create, add entry (title, category, tags, file_path, storage; Captures: +type), write compact

**summaries/{category}.json:** Path `.index/summaries/{category}.json` (captures: single file; regular: per-category). Load/create, set category at root, add entry (title, summary, tags, sections, tokens, file_path, last_modified, storage; Captures: +type, date; Regular: +synthesized_from; Referenced: +source), write atomic (temp + rename)

**metadata.json:** Increment document_count, `categories.{category}`, `tags.{tag}`, write compact. Order: index → summaries → metadata. Log "Indexes updated"

### Step 13: Complete

"Document added! Storage: {Embedded/Referenced}, Location/Source: {path}, Category: {category}, Tags: {tags}. Run /neat-knowledge-rebuild periodically". If sensitive: show security reminder

## Common Mistakes

- Ingesting JS-heavy SPAs without checking extraction quality
- Using Read tool for Office files (invoke conversion scripts instead)
- Not calling fetch-web-content.js or convert-office.js scripts
- Rigid security patterns (distinguish examples from real credentials)
