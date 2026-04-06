---
name: neat-knowledge-rebuild
description: Use when rebuilding KB clusters after adding many documents - groups related documents by shared themes - works for both personal and project KBs
---

# Knowledge Base Rebuild

**Role:** You are a data analyst who discovers and organizes document clusters based on semantic relationships.

## Overview

Rebuilds KB cluster index, groups related content by shared concepts. Spawns background subagent to save context (~50K tokens).

**Usage:** `/neat-knowledge-rebuild`

**Clusters** help browsing, relationships, filtering in neat-knowledge-query.

## Quick Reference

| Aspect | Details |
| -------- | --------- |
| Target | Both Personal and Project KB (auto-detected) |
| When to run | After adding 10+ documents |
| Prerequisites | 10+ documents, summaries.json and metadata.json exist |
| Output | Cluster list with counts, spawns background subagent |
| Context savings | ~50K tokens (background subagent) |

## Prerequisites

- KB with 10+ documents
- `.index/summaries.json` and `metadata.json` exist
- `metadata.json` has `kb_type`

## KB Detection

See [KB Detection](../references/kb-detection.md). If none: error "No KB found. Run /neat-knowledge-ingest"

## Workflow

**Usage:** `/neat-knowledge-rebuild`

### Step 1: Detect KB

Follow [KB Detection](../references/kb-detection.md).

### Step 2: Spawn Subagent

Tell user: "Spawning background subagent... You'll be notified when complete."

Spawn subagent (description: "Rebuild cluster index", run_in_background: true) to load summaries.json, group by
shared key_concepts/tags (2+), generate cluster metadata, save to .index/clusters/, report counts and top 3.

### Step 3: Continue

Main context continues while subagent runs.

### Step 4: Display Results

Show: processed count, cluster count, top clusters.

Note: "Clusters organize docs by theme in /neat-knowledge-query."

**Context Impact:** <500 tokens vs 50K+ if direct

### Step 5: Validate Sources (Project KB Only)

After clustering completes. Proactively fix broken source links.

Rebuild uses batch validation with auto-fix (confident matches applied automatically, only ambiguous require user input).

**Flow:**

1. Log: "Validating sources..."
2. Load summaries.json, check kb_type
   - Personal KB: skip (no sources)
   - Project KB: continue
3. Per entry with `source`:
   - Skip if no source or `broken_link: true` (remove flag manually to retry)
   - Validate with Read
   - If succeeds: continue
   - If fails: add to recovery queue
4. Recover broken links via [KB Recovery](../references/kb-recovery.md): Glob all files in source_root, AI reasoning
   on filenames
   - Classify by result type:
     - **found (moved/un-ingested)**: auto_fixed list (high confidence matches)
     - **ambiguous**: ambiguous list (multiple good candidates)
     - **not_found**: not_found list
5. Apply auto-fixes:
   - Update source, remove broken_link, update last_modified
   - Log: "Auto-fixed {N}"
6. Handle ambiguous:
   - Show: "Multiple matches for {filename}:"
   - List: "1. {path} (score: {score})"
   - Ask: "Which? [1-N/skip]"
   - If chosen: update
7. Handle not found:
   - Show: "{N} files not found"
   - Ask: "Action? [mark/provide/remove]"
     - **mark**: Add broken_link: true
     - **provide**: Ask path per file, validate, update
     - **remove**: Delete entries
8. Write summaries.json atomically
9. Show summary: auto-fixed, user resolved, marked, removed counts

**Errors:**

- Glob fails: log, treat as not_found
- Unwritable: error, exit without partial updates
- Invalid path: validate, "Not found, retry or skip?"

**Performance:** ~1-2s per broken link

**Note:** broken_link: true skipped (remove to retry)

## When to Use

**Run when:** 10+ new docs, multiple topics, discover relationships

**Skip when:** <10 docs, 1-2 added, already organized

## Common Mistakes

- Running with <10 docs (wait for 10+)
- Expecting instant results (background subagent)
- Running after each doc (batch 10+)
- Not checking prerequisites (verify summaries.json)
- Expecting clusters to change search (organizes only, search uses summaries.json)
- Expecting instant validation (adds time per broken link)
- Manually fixing before rebuild (let auto-fix work)
