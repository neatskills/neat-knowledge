---
name: neat-knowledge-rebuild
description: Use when optimizing KB categories - AI analyzes all documents to redesign category structure, validates source links
---

# Knowledge Base Rebuild

**Role:** You are a data architect who optimizes category structures by analyzing content patterns and ensures KB health.

## Overview

Optimizes category structure by analyzing all documents, then validates KB integrity.

**References:** Shared across all neat-knowledge skills at `references/kb-*.md`

**Usage:** `/neat-knowledge-rebuild`

**Purpose:**

- Optimize categories based on KB-wide content analysis
- Reassign documents to optimized categories
- Validate source links (fix broken references)

## Quick Reference

| Aspect | Details |
| -------- | --------- |
| Target | One KB (auto-detected from convention paths, prompts if multiple found) |
| When to run | Categories need optimization or KB has grown significantly |
| Prerequisites | KB exists with .index/ directory (index.json and metadata.json can be regenerated if needed) |
| Output | Category optimization plan with document reassignments, source validation results |

## Prerequisites

- Existing KB with documents
- `.index/` directory exists (index.json and metadata.json can be regenerated if needed via Step 2)

## KB Detection

See [KB Detection](../references/kb-detection.md). If none: error "No KB found. Run /neat-knowledge-ingest"

## Workflow

### Step 1: Detect KB

Follow [KB Detection](../references/kb-detection.md).

**If KB detected but index files missing/corrupt:**

1. Check for markdown files: `glob {KB_PATH}/**/*.md`, exclude `.index/`
2. Check index file integrity:
   - Missing/corrupt: `.index/index.json`, `.index/metadata.json`, or `.index/summaries/` directory
   - Consider corrupt if: JSON parse fails, missing required fields, or summaries directory empty when documents exist
3. If markdown files exist and any index files missing/corrupt:
   - Show: "KB detected at {KB_PATH} with {count} markdown files, but index files (index.json, metadata.json, or summaries) are missing or corrupt."
   - Ask: "Regenerate all index files from existing markdown files? [y/n] (default: y):"
   - If `y`: Continue to Step 2 (auto-regenerate index.json, metadata.json, and all summaries)
   - If `n`: Error "Cannot proceed without valid indexes. Run /neat-knowledge-ingest to rebuild KB."
4. If no markdown files:
   - Error "KB directory exists but contains no markdown files. Run /neat-knowledge-ingest to add content."

### Step 2: Regenerate Index Files (Optional)

User controls regeneration. No validation - always regenerates from markdown files.

**If auto-triggered from Step 1:** Skip prompts, regenerate both index/metadata and summaries automatically.

Follow [KB Schema](../references/kb-schema.md).

1. **Prompt for index/metadata regeneration:**

   ```
   Regenerate index.json and metadata.json from markdown files? [y/n] (default: n):
   ```

   If `n`: Use existing files, skip to prompt 2

   If `y`:
   - Log: "Scanning markdown files..."
   - Scan: `glob {KB_PATH}/**/*.md`, exclude `.index/`
   - For each .md: read content, parse YAML frontmatter, extract title/category/tags/summary, calculate relative file_path, determine storage mode
   - Build index.json and metadata.json per kb-schema.md
   - Write `.index/index.json` and `.index/metadata.json` (compact JSON)
   - Log: "Regenerated index.json ({count} documents) and metadata.json"

2. **Prompt for summaries regeneration:**

   ```
   Regenerate all category summary files? [y/n] (default: n):
   ```

   If `n`: Use existing summaries, continue to Step 3

   If `y`:
   - Log: "Regenerating category summaries..."
   - Ensure `.index/summaries/` exists
   - Scan KB for all markdown files, group by category
   - For each category:
     - Create: `{"category": "{category}", "documents": {}}`
     - For each document: read markdown, parse frontmatter, extract sections (##/# headings + first 100 chars)
     - Build summary: title, summary, tags, category, file_path, storage, source (if referenced), last_modified (current timestamp), sections array
     - For referenced storage: Calculate relative source path
     - Add to category's documents object, keyed by filename
     - Write `.index/summaries/{category}.json` (formatted, 2-space indent)
   - Delete orphaned `.index/summaries/*.json` files
   - Log: "Regenerated {category_count} category summary files covering {document_count} documents"

**Error handling:**

- No markdown files: "No documents found in KB. Cannot regenerate indexes."
- Invalid KB_PATH: "Invalid KB path. Check KB detection."
- Write fails: Show error, exit without partial updates

### Step 3: Analyze KB Content

1. Load index.json and all summaries/*.json
2. Build content analysis:

   ```javascript
   {
     document_count: 150,
     current_categories: {
       "web-dev": 5,
       "web-development": 12,
       "frontend": 8,
       "development": 100,
       "react": 40
     },
     top_tags: {
       "react": 45,
       "nodejs": 30,
       "python": 25,
       "api": 40,
       "typescript": 35
     },
     documents: [
       {
         title: "React Hooks Guide",
         current_category: "web-development",
         tags: ["react", "javascript", "hooks"],
         summary: "...",
         filename: "react-hooks-guide.md"
       },
       // ... all docs
     ]
   }
   ```

3. Log: "Analyzing {count} documents across {cat_count} categories..."

### Step 4: Design Category Structure

AI designs optimal categories by analyzing all documents.

**Prompt AI:**

```
You are analyzing a knowledge base to design an optimal category structure.

CURRENT STATE:
- {document_count} documents
- {current_category_count} current categories: {list with counts}
- Top tags: {top 20 tags with counts}

SAMPLE DOCUMENTS (5-10 representative):
- Title: {title}
  Current category: {category}
  Tags: {tags}
  Summary: {first 100 chars}

FULL DOCUMENT LIST:
{All documents with: title, current_category, tags, summary preview}

TASK:
Design better category structure. Consider:
1. Natural topic clusters
2. Current categories too granular or broad
3. User discoverability
4. Aim for 5-15 categories (fewer is better)

Return JSON:
{
  "proposed_categories": [
    {
      "name": "lowercase-hyphenated-name",
      "description": "What belongs here",
      "estimated_doc_count": 45
    }
  ],
  "reasoning": "Why this is better",
  "major_changes": [
    "Merged web-dev/web-development/frontend into web-development",
    "Split development into web-development and backend-development"
  ],
  "document_assignments": {
    "react-hooks-guide.md": {
      "new_category": "web-development",
      "reasoning": "React content fits web development"
    },
    // ... all documents
  }
}
```

### Step 5: Show Optimization Plan and Confirm

**Display:**

```
Category Optimization Plan
==========================

CURRENT: {X} categories
PROPOSED: {Y} categories

NEW CATEGORY STRUCTURE:

1. web-development (65 docs)
   Description: Frontend frameworks, JavaScript, React, Vue
   From: web-dev (5), web-development (12), frontend (8), development subset (40)

2. backend-development (50 docs)
   Description: Server-side, APIs, databases
   From: backend (7), server-side (4), development subset (39)

3. devops (15 docs)
   Description: CI/CD, infrastructure, deployment
   From: development subset (15)

4. mobile-development (20 docs)
   Description: iOS, Android, React Native
   From: mobile (18), ios-dev (2)

REASONING:
{AI reasoning}

MAJOR CHANGES:
- Merged 4 similar categories into web-development
- Split overly broad "development" into 3 focused categories
- Created "devops" for infrastructure content

DOCUMENTS TO REASSIGN: {count} of {total}

EXAMPLES:
- react-hooks-guide.md: development → web-development
- nodejs-api-design.md: development → backend-development
- docker-compose-guide.md: development → devops

---

Apply optimization? [y/n] (default: y):
```

If `n`: Skip optimization, go to Step 7

### Step 6: Execute Optimization

**For each document needing reassignment:**

1. Get new category from AI's document_assignments
2. If unchanged: skip
3. If changed:
   - **Embedded storage:** Move file `{old_category}/{filename}.md` → `{new_category}/{filename}.md`, create directory if needed, update frontmatter category
   - **Referenced storage:** No file move, source path unchanged

4. Update category summaries:
   - Group moves by source/destination (batch optimization)
   - For each affected category:
     - Load `.index/summaries/{category}.json`
     - If moving out: remove document
     - If moving in: add/update document (set new category, update last_modified)
     - Write atomically (temp file + rename)
   - If empty: delete category summary file

5. Update index.json: Update category field for moved documents (batch), write atomically

6. Log: "Reassigned {filename}: {old} → {new}"

**After all processed:**

1. Update metadata.json: Rebuild categories object, count documents per category, write atomically

2. Delete empty old category folders (embedded only)

**Completion:**

```
Optimization complete:
- Categories: {old_count} → {new_count}
- Documents reassigned: {reassigned_count} of {total_count}
- New structure:
  - web-development: 65 docs
  - backend-development: 50 docs
  - devops: 15 docs
  - mobile-development: 20 docs
```

### Step 7: Validate Sources (Referenced Storage Only)

Validates source links for referenced storage documents. Batch validation with auto-fix for confident matches.

**Flow:**

1. Log: "Validating sources..."
2. Load index.json, check for `storage: "referenced"`
   - If none: skip (all embedded)
3. Per referenced entry with `source`:
   - Skip if `broken_link: true` (remove flag manually to retry)
   - Validate with Read
   - If fails: add to recovery queue
4. Recover via [KB Recovery](../references/kb-recovery.md): Glob source_root, AI reasoning on filenames
   - Classify results:
     - **found (moved/un-ingested)**: auto_fixed (high confidence)
     - **ambiguous**: multiple candidates
     - **not_found**: no matches
5. Apply auto-fixes:
   - Group by category
   - For each category:
     - Load `.index/summaries/{category}.json`
     - If missing/corrupt: log "Warning: category file {category}.json missing, skipping {N} documents", skip
     - For each recovered: update source, remove broken_link, update last_modified
     - Write atomically
   - Update index.json (remove broken_link, batch)
   - Log: "Auto-fixed {N}"
6. Handle ambiguous:
   - Show: "Multiple matches for {filename}:"
   - List: "1. {path} (score: {score})"
   - Ask: "Which? [1-N/skip]"
   - If chosen: Load category file, if missing log warning and skip, else update, write atomically, update index.json
7. Handle not found:
   - Show: "{N} files not found"
   - Ask: "Action? [mark/provide/remove]"
     - **mark**: Load category file, if missing log warning and skip, else add broken_link: true, write atomically, update index.json
     - **provide**: Ask path per file, validate, load category file, if missing log warning and skip, else update, write atomically, update index.json
     - **remove**: Load category file, if missing only delete index.json entry, else delete from documents, write atomically, delete index.json entry
8. Recompute metadata.json: Load index.json, rebuild tags and categories counts, write atomically
9. Show summary: auto-fixed, user resolved, marked, removed counts

**Errors:**

- Glob fails: log, treat as not_found
- Unwritable: error, exit without partial updates
- Invalid path: validate, "Not found, retry or skip?"

**Performance:** ~1-2s per broken link

**Note:** broken_link: true skipped (remove to retry)

### Step 8: Complete

```
Rebuild complete!
- Categories: {old_count} → {new_count} ({reassigned_count} docs reassigned)
- Sources: {validated_count} validated, {fixed_count} auto-fixed, {broken_count} broken
```

## When to Use

**Run when:**

- Categories feel messy or proliferated
- KB has grown significantly
- Many similar category names (web-dev, web-development, frontend)
- Some categories are very large or unfocused
- Periodic maintenance (monthly for active KBs)
- Need to validate source links for referenced documents

**Skip when:**

- Categories already reflect content well
- KB has < 20 documents
- Just added 1-2 documents

## Category Design Principles

**Content-driven:** Categories emerge from actual document content, tags, and topics - not predetermined hierarchies.

**Optimal granularity:** 5-15 categories. Fewer is better (easier browsing), but not so few categories lose meaning.

**Clear boundaries:** Each category has clear semantic meaning. Avoid overlapping categories or vague names.

**User discoverability:** Categories match how users think. "What would someone look for?"

**Flexible reassignment:** Documents can move as KB evolves. Category from ingest is not permanent.

**AI reasoning:** AI analyzes all documents together to find natural groupings - better than incremental categorization during ingest.

**User control:** Always show redesign plan before executing. User can reject changes.

## Common Mistakes

- Running when categories are already well-organized
- Running too frequently (let KB grow, run periodically)
- Running on tiny KBs (< 20 docs)
- Manually moving files between categories (let rebuild handle it)
- Rejecting AI suggestions without reviewing reasoning
