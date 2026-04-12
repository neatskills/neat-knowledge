---
name: neat-knowledge-rebuild
description: Use when optimizing KB categories - AI analyzes all documents to redesign category structure, validates source links
---

# Knowledge Base Rebuild

**Role:** You are a data architect who optimizes category structures by analyzing content patterns and ensures KB health.

## Overview

Optimizes category structure via KB-wide content analysis and validates source links.

**References:** Shared at `references/kb-*.md`

**Usage:** `/neat-knowledge-rebuild`

**Purpose:** Optimize categories, reassign documents, validate/fix source links

## Quick Reference

| Aspect | Details |
| -------- | --------- |
| Target | One KB (auto-detected, prompts if multiple) |
| When to run | Categories need optimization or KB grown significantly |
| Prerequisites | KB with documents and .index/ (regenerates if needed) |
| Output | Optimization plan with reassignments, source validation |

## Prerequisites

Existing KB with documents and `.index/` directory (regenerates index.json/metadata.json if needed via Step 2)

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

**Internal processing - do not display to user.**

1. Load index.json and summaries/*.json
2. Build analysis: document_count, current_categories (counts), top_tags (counts), documents with metadata
3. Log: "Analyzing {count} documents across {cat_count} categories..."

### Step 4: Design Category Structure

AI designs optimal categories from document analysis.

**IMPORTANT:** Internal JSON only. Show "Analyzing..." status, proceed to Step 5 with user-friendly summary.

**Internal Analysis:**

Analyze: {document_count} documents, {current_category_count} categories (list with counts), top 20 tags (counts), documents (title, category, tags, summary)

Design better structure considering:

1. Natural topic clusters
2. Granularity (too narrow or broad)
3. User discoverability
4. Target 5-15 categories (fewer better)

**Internal JSON:**

```json
{
  "proposed_categories": [
    {"name": "lowercase-hyphenated", "description": "What belongs", "estimated_doc_count": 45}
  ],
  "reasoning": "Why better",
  "major_changes": ["Merged X/Y/Z into X", "Split A into B and C"],
  "document_assignments": {
    "file.md": {"new_category": "web-development", "reasoning": "Fits category"}
  }
}
```

**User output:** `Analyzing 150 documents across 8 categories...` then proceed to Step 5.

### Step 5: Show Optimization Plan and Confirm

**Display:**

```
Category Optimization Plan
==========================

CURRENT: {X} categories
PROPOSED: {Y} categories

NEW STRUCTURE:

1. web-development (65 docs)
   Frontend frameworks, JavaScript, React, Vue
   From: web-dev (5), web-development (12), frontend (8), development subset (40)

2. backend-development (50 docs)
   Server-side, APIs, databases
   From: backend (7), server-side (4), development subset (39)

3. devops (15 docs)
   CI/CD, infrastructure, deployment
   From: development subset (15)

REASONING: {AI reasoning}

MAJOR CHANGES:
- Merged 4 similar into web-development
- Split broad "development" into 3 focused
- Created "devops" for infrastructure

REASSIGNMENTS: {count} of {total}

EXAMPLES:
- react-hooks.md: development → web-development
- api-design.md: development → backend-development

Apply? [y/n] (default: y)
```

If `n`: Skip to Step 7

### Step 6: Execute Optimization

**Per document needing reassignment:**

1. Get new category from document_assignments
2. Skip if unchanged
3. If changed:
   - **Embedded:** Move `{old}/{file}.md` → `{new}/{file}.md`, create dir if needed, update frontmatter
   - **Referenced:** No move (source path unchanged)

4. Update category summaries:
   - Group moves by source/dest (batch)
   - Per affected category: Load summary, remove if moving out, add/update if moving in (new category, last_modified), write atomically (temp + rename)
   - Delete if empty

5. Update index.json: Update category field (batch), write atomically

6. Log: "Reassigned {file}: {old} → {new}"

**After all:**

1. Update metadata.json: Rebuild categories object with counts, write atomically
2. Delete empty old category folders (embedded only)

**Completion:**

```
Optimization complete:
- Categories: {old} → {new}
- Reassigned: {count} of {total}
- New structure:
  - web-development: 65 docs
  - backend-development: 50 docs
```

### Step 7: Validate Sources (Referenced Storage Only)

Validates source links for referenced documents. Batch validation with auto-fix.

**Flow:**

1. Log: "Validating sources..."
2. Load index.json, check `storage: "referenced"` (skip if none)
3. Per referenced entry with `source`:
   - Skip if `broken_link: true` (remove flag to retry)
   - Validate with Read
   - If fails: add to recovery queue
4. Recover via [KB Recovery](../references/kb-recovery.md): Glob source_root, AI matches filenames
   - Classify: **found** (auto_fixed), **ambiguous** (multiple), **not_found** (none)
5. Apply auto-fixes:
   - Group by category
   - Load summary (follow [Common Procedures](../references/kb-schema.md#loading-category-summary-files))
   - Update: source, remove broken_link, last_modified
   - Write atomically
   - Update index.json (batch)
   - Log: "Auto-fixed {N}"
6. Handle ambiguous:
   - Show: "Multiple matches for {file}:", list with scores
   - Ask: "Which? [1-N/skip]"
   - If chosen: Load summary, update, write, update index
7. Handle not found:
   - Show: "{N} files not found"
   - Ask: "Action? [mark/provide/remove]"
     - **mark**: Load summary, add broken_link: true, write, update index
     - **provide**: Ask path, validate, load summary, update, write, update index
     - **remove**: Load summary, delete from documents, write, delete index entry (if summary missing, only delete index)
8. Recompute metadata.json: Load index, rebuild tags/categories counts, write
9. Show summary: auto-fixed, resolved, marked, removed counts

**Errors:**

- Glob fails: log, treat as not_found
- Unwritable: error, exit without partial updates
- Invalid path: "Not found, retry or skip?"

**Performance:** ~1-2s per broken link

**Note:** broken_link: true skipped (remove flag to retry)

### Step 8: Complete

```
Rebuild complete!
- Categories: {old} → {new} ({reassigned} docs)
- Sources: {validated} validated, {fixed} auto-fixed, {broken} broken
```

## When to Use

**Run when:**

- Categories messy or proliferated
- KB grown significantly
- Similar category names (web-dev, web-development, frontend)
- Categories very large or unfocused
- Periodic maintenance (monthly for active KBs)
- Validate source links (referenced documents)

**Skip when:**

- Categories reflect content well
- KB < 20 documents
- Just added 1-2 documents

## Category Design Principles

**Content-driven:** Categories emerge from document content, tags, topics—not predetermined hierarchies

**Optimal granularity:** 5-15 categories (fewer better for browsing, not so few they lose meaning)

**Clear boundaries:** Clear semantic meaning, avoid overlaps or vague names

**User discoverability:** Match how users think ("What would someone look for?")

**Flexible reassignment:** Documents move as KB evolves (ingest category not permanent)

**AI reasoning:** Analyzes all documents together (better than incremental during ingest)

**User control:** Show redesign plan before executing (user can reject)

## Common Mistakes

- Running when categories already well-organized
- Running too frequently (let KB grow, run periodically)
- Running on tiny KBs (< 20 docs)
- Manually moving files (let rebuild handle)
- Rejecting AI suggestions without reviewing reasoning
