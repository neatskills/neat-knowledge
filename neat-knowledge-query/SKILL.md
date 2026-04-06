---
name: neat-knowledge-query
description: Use when searching or researching in knowledge base - search mode for fast, AI ranking semantic search, ask mode for deep research with synthesis, extract mode for structured data extraction
---

# Knowledge Base Query

**Role:** You are a research analyst who helps users find and synthesize information from their accumulated knowledge.

## Overview

Search, research, and extract from knowledge base.

**Commands:**

- `/neat-knowledge-query search <query>` - Search documents
- `/neat-knowledge-query ask <question>` - Research with synthesis
- `/neat-knowledge-query extract <source> <options>` - Structured data extraction

**Clusters:** After `/neat-knowledge-rebuild`, clusters group related docs by theme for browsing. All modes query
summaries.json directly.

## KB Detection

**Personal KB:** Content in KB documents, no source field.

**Project KB:** Content at original paths, summaries have source field. Progressive disclosure.

Follow [KB Detection](../references/kb-detection.md). Store path and KB type.

## When to Use

- Find documents by keyword, topic, tag
- Research requiring multi-source synthesis
- Interactive exploration with follow-ups
- Understand connections between documents

After adding 10+ documents, run `/neat-knowledge-rebuild` to cluster by theme.

## Quick Reference

| Command | Purpose | Best For |
| --- | --- | --- |
| `/neat-knowledge-query search <query>` | AI ranking semantic search | Finding most relevant docs with high precision |
| `/neat-knowledge-query ask <question>` | Deep research with synthesis | Complex questions, multi-source answers |
| `/neat-knowledge-query extract <source> <options>` | Structured JSON extraction | Skill-to-skill calls (predictable, typed) |

**Mode details:**

- **Search:** Keyword filter → AI ranking → top 10 (score ≥ 0.5), adaptive candidates (20-50 based on KB size)
- **Ask:** Search + progressive loading (summaries first) + synthesis, tracks history, supports follow-ups
- **Extract:** Search + structured JSON, progressive section loading (summary-only or full)

**Token costs:** Summary-only: ~2-3K (80% reduction), full: ~6-8K (60% reduction), AI ranking: 3.5K-7.7K per search

## Prerequisites

If KB missing/empty: inform user, suggest `/neat-knowledge-ingest`

## Command: Search

**Usage:** `/neat-knowledge-query search <query>`

If query empty: show usage, return.

Detect KB path. Load summaries.json (error if missing/corrupt/empty).

**Pipeline:**

### Stage 1: Keyword Filter

1. Calculate adaptive cap: `max(20, min(50, KB_size × 0.1))`
2. Filter by keyword (case-insensitive in title/summary/tags/key_concepts)
3. Sort by relevance (matching field count)
4. Take top N where N = min(cap, total_matches)
5. If no matches: show "No matches for '{query}'. Try: broader keywords, check spelling, search by category/tag", return

### Stage 2: AI Ranking

1. Prepare candidates (filename, title, summary, key_concepts, tags)
2. Spawn subagent (description: "Rank search results by relevance") to score 0.0-1.0, return compact JSON with
   filename and score
3. Parse JSON (malformed if: not array, missing fields, invalid score range)
4. If subagent fails:
   - Log: "Warning: AI ranking unavailable, falling back to keyword search"
   - Use keyword-sorted candidates, skip Stage 3, return top 10 directly

### Stage 3: Filter and Return

1. Sort by score descending
2. Filter scores < 0.5
3. If none ≥ 0.5:
   - Show: "Found {N} matches but none highly relevant (all < 0.5). Try: specific query, different keywords, browse by category"
   - Return
4. Take top 10
5. Format: `[{filename}] {title} (category) [score: {score}] - {summary_snippet}... [tags]`
6. Show: "Found {total_matches} matches (showing {returned_count}, AI-ranked)"

## Command: Ask (Interactive Research)

**Usage:** `/neat-knowledge-query ask <question>`

Detect KB path. Load summaries.json (error if missing/corrupt/empty). Initialize: `turns: []`, `all_sources: []`

**Loop:**

1. **Search:** Call Search internally, get top 10 AI-ranked docs
2. **Progressive Load:** Use summaries.json metadata. If details needed: load 2-4 most relevant full docs via
   `<skill-dir>/scripts/kb-cache.js` (automatic caching for Project KB)
3. **Synthesize:** Build prompt with turns, question, docs, instructions (cite, note conflicts, format clearly)
4. **Execute:** Claude call
5. **Display:** Show answer
6. **Track:** Add turn, merge sources (deduplicate)
7. **Continue:** Ask "Continue? (y/n/question)"
   - `n`: If 3+ turns, offer save, exit
   - `y`: Ask "Next question:", continue
   - Other: treat as follow-up, continue

## Command: Extract (Structured Data Extraction)

**Usage:** `/neat-knowledge-query extract <query> <options>`

Skill-to-skill calls, returns structured JSON.

**Query:** Natural language, cluster, category, tag, or filename

**Options:**

- `--summary-only` - Summaries only (80% token savings)
- `--sections <names>` - Specific sections (comma-separated)
- `--score-threshold <N>` - Min score (default: 0.5, range: 0.0-1.0)

### Extract Algorithm

**Step 1: Load** - Detect KB, load summaries.json, log count.

**Step 2: Search** - Call Search, use `--score-threshold` (default: 0.5), return docs with score ≥ threshold.

**Step 3: Load Content** - Per matched doc:

- `--summary-only`: use summaries.json summary
- `--sections`: load from cache via `<skill-dir>/scripts/kb-cache.js loadSection()` (summaries.json has 100-char previews
  only)
- Otherwise: load full docs via `<skill-dir>/scripts/kb-cache.js loadFullDocument()` (Project KB: read source with caching and
  recovery, Personal KB: embedded)

**Caching (Project KB only):**

- `.md` files: Read source directly, cache sections only
- Office/PDF files: Cache converted markdown + sections
- Timestamp-based invalidation (auto-regenerates if source newer)
- Cache location: `.index/.cache/` directory

**Project KB loading with recovery:**

Query uses interactive inline recovery (user confirms each decision immediately during extraction).

Per document with `source`:

1. Attempt load via `<skill-dir>/scripts/kb-cache.js loadFullDocument(source, cacheDir)`
2. If succeeds: use cached/converted content
3. If fails (ENOENT):
   - Check `broken_link: true` → if yes: skip, log "Skipping {filename} (marked broken)"
   - Log: "Source not found at {source}, attempting recovery..."
   - Follow [KB Recovery](../references/kb-recovery.md): Glob all files in source_root, AI reasoning on filenames
   - Handle by type (query confirms; rebuild auto-fixes):
     - **found (moved/un-ingested)**: Ask "Found at {newPath} (status: {status}). Update? (y/n)" → yes: update
       source, remove broken_link, update last_modified, load via cache; no: skip
     - **ambiguous**: Show list → "Which? [1-N/skip]" → if chosen: update, load via cache; skip: skip
     - **not_found**: Ask "Provide path or skip? [path/skip]" → path: validate, update, load via cache; skip: skip
4. If updated: load summaries.json, modify, write atomically
5. Continue remaining docs

**Note:** After recovery, document loading uses caching automatically (see [KB Caching](../references/kb-caching.md))

**Errors:**

- Glob fails: log, ask manual path
- Invalid path: validate, "Not found, retry or skip? [path/skip]"
- Unwritable: show error, skip doc (don't abort)

**Step 4: Output** - Compact JSON:

```json
{
  "documents": [
    {"title": "...", "summary": "...", "category": "...", "tags": [...], "key_concepts": [...], "content": "..."}
  ],
  "total": 3
}
```

**Key fields:** documents, filename, title, summary, category, tags, score (0.0-1.0), source (Project KB only),
content, sections, metadata

**Project KB:** Summaries in KB, content at source paths, has source field. **Personal KB:** Full content in KB, no
source field. Both: section extraction via subagents.

## Cache Management (Project KB Only)

**Cache location:** `.index/.cache/` directory

**Automatic cache invalidation:** Cache regenerates when source files are modified (timestamp comparison)

**Manual cache operations:**

```javascript
import { clearCache } from '..<skill-dir>/scripts/kb-cache.js';

// Clear all cache
clearCache(cacheDir);

// Clear specific file cache
clearCache(cacheDir, sourcePath);
```

**When to clear cache:**

- Source files corrupted or converted incorrectly
- Testing/debugging document loading
- Freeing disk space (cache auto-regenerates)

**Troubleshooting:**

- "Cache read failed": Falls back to direct source reading, logs warning
- "Conversion failed": Fix source file format or encoding
- Stale cache: Check file timestamps, cache should auto-regenerate

See [KB Caching](../references/kb-caching.md) for architecture details.

## Common Mistakes

- Not checking KB exists before queries
- Not handling empty results
- Loading full docs when summaries suffice
- Forgetting to deduplicate sources
- Expecting clusters to affect search (uses summaries.json)
- Not handling AI ranking failures (check errors, fall back to keyword)
- Passing too many candidates (use adaptive cap)
- Requesting all sections when only need specific
- Not using `--summary-only` when appropriate
- Not using `--sections` for targeted extraction
