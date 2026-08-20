---
name: neat-knowledge-extract
description: Use when extracting structured data from knowledge base for automation - returns predictable JSON with agent-optimized content loading
---

# Knowledge Base Extract (Structured Data)

**Role:** You are a data extraction specialist who retrieves structured information from knowledge bases for automation — producing predictable JSON with agent-optimized content loading.

## Overview

Structured JSON extraction for automation. Agent-driven loading optimizes depth based on query and ROI.

**Usage:** `/neat-knowledge-extract <query>`

**Output:** Predictable JSON with loaded content

## When to Use

Run when another skill or automation needs structured, machine-readable knowledge base content. Not for a human-readable answer — use `neat-knowledge-ask` for that. Not for a quick document lookup — use `neat-knowledge-search` for that.

## Phase 1: Algorithm

**Step 1 — KB Detection:** Follow [KB Detection](../references/kb-detection.md). Error if missing/corrupt.

**Step 2 — Search:** Call `/neat-knowledge-search` in internal mode. Returns JSON with matches + metadata.

If no results: Return `{"documents": [], "total": 0, "loading_strategy": "none", "tokens_loaded": 0}`

**Step 3 — Agent Evaluation:** Follow [KB Evaluation](../references/kb-evaluation.md). Review inline with automation context:

```
Query: "{query}"
Found {N} matches: [{filename}] {title} - Summary/Sections/Tokens/Tags

Context: Automation query.

Two-part: RELEVANCE (which docs?), DEPTH (summary/sections/full?)
Decision: Which docs + depth for ROI?
```

Examples: "Docs 1,2,4 summaries (540 tokens)", "Docs 1,3 sections (1.4K)"

**Step 4 — Load Content:** Follow [KB Loading](../references/kb-loading.md). Initialize cache, check before loads.

Summaries: Already cached. Sections/Full: Check cache, load if needed, cache, extract.

Broken links: Skip if `broken_link: true`, track skipped documents, include warnings array in JSON with one entry per broken link

**Step 5 — Output JSON:**

```json
{
  "documents": [
    {
      "filename": "example.md",
      "title": "...",
      "summary": "...",
      "category": "...",
      "tags": ["..."],
      "storage": "embedded",
      "tokens": {"summary": 150, "full": 3500, "sections": {...}},
      "loaded": "summary",
      "content": "...",
      "source": "..."
    }
  ],
  "total": 3,
  "loading_strategy": "summaries",
  "tokens_loaded": 450,
  "warnings": ["..."]
}
```

Fields: documents (array with filename, title, summary, category, tags, storage, tokens, loaded, content, source), total, loading_strategy, tokens_loaded, warnings (if broken links)

Done.

## Common Mistakes

Not using internal mode, pre-filtering, inconsistent JSON, not tracking tokens, missing loaded/warnings fields, not checking cache
