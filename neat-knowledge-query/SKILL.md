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

## KB Detection

Follow [KB Detection](../references/kb-detection.md). Store KB path.

**Storage modes:** Documents use embedded (content in KB) or referenced (content at source path). Check `storage` field in `.index/summaries/{category}.json`.

**References:** Shared across neat-knowledge skills at `references/kb-*.md`

## When to Use

- Find documents by category, keyword, tag
- Research requiring multi-source synthesis
- Interactive exploration with follow-ups

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

Detect KB path. Load index.json (error if missing/corrupt/empty).

**Modes:**

- **User mode** (default): Formatted text output
- **Internal mode** (Ask/Extract): Structured data `{results: [{filename, title, summary, category, tags, score}], total_candidates: N, total_returned: N}`

**Pipeline:**

### Stage 1: Keyword Filter

1. Calculate adaptive cap: `max(20, min(50, KB_size × 0.1))`
2. Filter by keyword (case-insensitive in title/category/tags), support `category:name` syntax
3. Sort by relevance (matching field count), take top N where N = min(cap, total_matches)
4. If no matches: show "No matches for '{query}'. Try: broader keywords, check spelling, use category: filter", return

### Stage 2: AI Ranking

1. Group candidates by category
2. Load `.index/summaries/{category}.json` for each unique category
   - If missing/corrupt: log "Skipping category {category}, summary file not found", remove those documents
3. Extract document summaries
   - If document missing: log "Skipping {filename}, not found in category summary", remove from candidates
4. Spawn subagent (description: "Rank search results by relevance") to score 0.0-1.0, return compact JSON with filename and score
5. Parse JSON (malformed if: not array, missing fields, invalid score range)
6. If subagent fails: log "Warning: AI ranking unavailable, falling back to keyword search", use keyword-sorted candidates, skip Stage 3, return top 10

### Stage 3: Filter and Return

1. Sort by score descending, filter scores < 0.5
2. If none ≥ 0.5: show "Found {N} matches but none highly relevant (all < 0.5). Try: specific query, different keywords, category: filter", return
3. Take top 10
4. **User mode:** Format: `[{filename}] {title} (category) [score: {score}] - {first 150 chars}... [tags]`, show "Found {total_candidates} candidates ({total_returned} relevant, AI-ranked)"
5. **Internal mode:** Return structured data

## Command: Ask (Interactive Research)

**Usage:** `/neat-knowledge-query ask <question>`

Detect KB path. Load index.json (error if missing/corrupt/empty). Initialize: `turns: []`, `all_sources: []`

**Loop:**

1. **Search:** Call Search in internal mode, get top 10 AI-ranked docs
2. **Progressive Load:** Use summary metadata. If details needed: load 2-4 most relevant full docs on-demand
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

**Options:**

- `--summary-only` - Summaries only (80% token savings)
- `--sections <names>` - Specific sections (comma-separated)
- `--score-threshold <N>` - Min score (default: 0.5, range: 0.0-1.0)

### Extract Algorithm

**Step 1: Load** - Detect KB, load index.json.

**Step 2: Search** - Call Search in internal mode with `--score-threshold` (default: 0.5).

**Step 3: Load Content** - Per matched doc:

- `--summary-only`: Load `.index/summaries/{category}.json`, extract summary field
- `--sections`: Load `.index/summaries/{category}.json`, extract sections (100-char previews)
- Otherwise: Load full docs (Embedded: read from KB, Referenced: read/convert from source)
  - Load `.index/summaries/{category}.json` to get file_path and storage mode

If category file missing/corrupt: log warning, skip those documents.

**Loading by file type:**

- `.md` files: Read via Read tool
- PDF files: Read via Read tool
- Office files (.docx, .xlsx): `node scripts/convert-office.js <file-path>`

**Referenced storage loading:**

Per document with `source`:

1. Check if `broken_link: true`: log "Skipping {filename} (marked broken)", track in broken_links, skip
2. Attempt load from source
3. If succeeds: use content
4. If fails (ENOENT): log "Skipping {filename} - source not found at {source}", track in broken_links, skip

**At end:** If broken links found:

```
Warning: {N} document(s) have broken source links.
Run /neat-knowledge-rebuild to repair all broken links.
```

**Step 4: Output** - Compact JSON:

```json
{
  "documents": [
    {
      "filename": "example.md",
      "title": "...",
      "summary": "...",
      "category": "...",
      "tags": [...],
      "score": 0.85,
      "storage": "embedded",
      "content": "..."
    }
  ],
  "total": 3
}
```

**Key fields:**

- `filename` - Document filename
- `title` - Document title
- `summary` - Brief summary
- `category` - Document category
- `tags` - Array of tags
- `score` - Relevance score (0.0-1.0)
- `storage` - "embedded" or "referenced"
- `source` - (Referenced only) Source path
- `content` - Full content or summary
- `sections` - (If `--sections` used) Specific sections
- `total` - Total documents returned

**Embedded storage:** Full content in KB, no source field. **Referenced storage:** Summaries in KB, content at source paths, has source field.

## Common Mistakes

- Not checking KB exists before queries
- Not handling empty results
- Loading full docs when summaries suffice
- Forgetting to deduplicate sources in Ask mode
- Not handling AI ranking failures (check errors, fall back to keyword)
- Passing too many candidates (use adaptive cap)
- Not using `--summary-only` or `--sections` when appropriate
- Using user-mode Search output when Ask/Extract need internal mode
- Not checking `broken_link: true` before attempting load
