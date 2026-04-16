---
name: neat-knowledge-rebuild
description: Use when optimizing KB categories - AI analyzes all documents to redesign category structure, validates source links
---

# Knowledge Base Rebuild

**Role:** You are a data architect who optimizes category structures by analyzing content patterns and ensures KB health.

## Overview

Optimizes category structure via AI analysis, validates source links.

**Usage:** `/neat-knowledge-rebuild`

**Prerequisites:** KB with documents (regenerates .index/ if needed)

## KB Detection

See [KB Detection](../references/kb-detection.md). If none: error "No KB found. Run /neat-knowledge-ingest"

## Workflow

### Step 1: Detect KB

Follow [KB Detection](../references/kb-detection.md).

**If KB exists but index files missing/corrupt:**

1. Glob markdown files: `{KB_PATH}/**/*.md`, exclude `.index/`
2. Check integrity: index.json, metadata.json, summaries/ (corrupt if parse fails, missing fields, or empty summaries with documents)
3. If markdown files exist and any index files missing/corrupt:
   - Show: "KB at {KB_PATH} has {count} files but index files (index.json, metadata.json, or summaries) missing/corrupt."
   - Ask: "Regenerate all index files? [y/n] (default: y)"
   - `y`: Continue to Step 2 (auto-regenerate all)
   - `n`: Error "Cannot proceed without valid index files. Run /neat-knowledge-ingest to rebuild KB."
4. If no markdown files: Error "KB directory exists but empty. Run /neat-knowledge-ingest to add content."

### Step 2: Regenerate Index Files (Optional)

User controls regeneration. Always regenerates from markdown (no validation).

**If auto-triggered from Step 1:** Skip prompts, regenerate both automatically.

Follow [KB Schema](../references/kb-schema.md).

1. **Prompt for index/metadata:**

   ```
   Regenerate index.json and metadata.json? [y/n] (default: n)
   ```

   If `n`: Use existing, skip to prompt 2

   If `y`:
   - Log: "Scanning markdown files..."
   - Glob: `{KB_PATH}/**/*.md`, exclude `.index/`
   - Per file: read, parse frontmatter, extract title/category/tags/summary, calculate file_path, determine storage
   - Build index.json and metadata.json per kb-schema.md
   - Write `.index/index.json` and `.index/metadata.json` (compact)
   - Log: "Regenerated index.json ({count} docs) and metadata.json"

2. **Prompt for summaries:**

   ```
   Regenerate all category summaries? [y/n] (default: n)
   ```

   If `n`: Use existing, continue to Step 3

   If `y`:
   - Log: "Regenerating summaries..."
   - Ensure `.index/summaries/` exists
   - Scan KB, group by category
   - Per category: Create structure, per document: read, parse, extract sections (##/# + first 100 chars), build summary (title, summary, tags, category, file_path, storage, source if referenced, last_modified, sections), add to documents object
   - Referenced storage: Calculate relative source path
   - Write `.index/summaries/{category}.json` (formatted, 2-space)
   - Delete orphaned summaries
   - Log: "Regenerated {category_count} summaries covering {document_count} docs"

**Errors:**

- No markdown: "No documents found. Cannot regenerate index files."
- Invalid KB_PATH: "Invalid KB path. Check KB detection."
- Write fails: Show error, exit without partial updates

### Step 3: Analyze KB Content

**Internal only.** Load index/summaries, build analysis, log "Analyzing {count} documents across {cat_count} categories..."

### Step 4: Design Category Structure

**Internal JSON only.** Show "Analyzing...", proceed to Step 5.

AI designs structure considering topic clusters, granularity, discoverability (target 5-15 categories).

JSON schema: `{proposed_categories: [{name, description, estimated_doc_count}], reasoning, major_changes, document_assignments: {file: {new_category, reasoning}}}`

### Step 5: Show Optimization Plan and Confirm

```
Category Optimization Plan
==========================

CURRENT: {X} → PROPOSED: {Y}

NEW STRUCTURE:
1. web-development (65 docs)
   Frontend frameworks, JavaScript
   From: web-dev (5), frontend (8), development subset (40)

REASONING: {AI reasoning}

MAJOR CHANGES: Merged 4 similar into web-development

REASSIGNMENTS: {count} of {total}
EXAMPLES: react-hooks.md: development → web-development

Apply? [y/n] (default: y)
```

If `n`: Skip to Step 7

### Step 6: Execute Optimization

Per changed document:

1. Embedded: Move file, update frontmatter. Referenced: No move
2. Update summaries (batch, atomic writes)
3. Update index.json (batch, atomic)
4. Log reassignment

After all:

1. Update metadata.json (atomic)
2. Delete empty folders (embedded)

**Completion:** "Optimization complete: Categories {old}→{new}, Reassigned {count}/{total}"

### Step 7: Validate Sources (Referenced Storage Only)

Follow [KB Recovery](../references/kb-recovery.md) procedures.

1. Log "Validating sources...", load index
2. Skip if no referenced docs or if `broken_link: true`
3. Validate with Read, queue failures
4. Recover: Glob source_root, AI matches
5. Auto-fix found matches (update source, remove broken_link, write atomically)
6. Prompt for ambiguous (multiple candidates)
7. Prompt for not_found (mark/provide/remove)
8. Recompute metadata.json
9. Show summary: auto-fixed, resolved, marked, removed

### Step 8: Complete

"Rebuild complete! Categories {old}→{new} ({reassigned} docs), Sources: {validated}/{fixed}/{broken}"

## When to Use

Run: Categories messy/proliferated, KB grown, similar names, periodic maintenance, validate sources

Skip: Categories good, KB < 20 docs, just added 1-2 docs

## Category Design Principles

Content-driven, optimal granularity (5-15), clear boundaries, user discoverability

## Common Mistakes

Running when categories good, too frequently, on tiny KBs, or manually moving files
