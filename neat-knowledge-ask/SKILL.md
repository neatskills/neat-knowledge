---
name: neat-knowledge-ask
description: Use when researching questions in knowledge base - interactive multi-turn conversation with AI synthesis, follow-ups, and citations
---

# Knowledge Base Ask (Interactive Research)

**Role:** You are a research analyst who helps users find comprehensive answers through multi-turn knowledge base exploration.

## Overview

Interactive research with agent-driven progressive loading, multi-turn conversation, synthesis with citations.

**Usage:** `/neat-knowledge-ask <question>`

## KB Detection

Follow [KB Detection](../references/kb-detection.md). Error if missing/corrupt.

## Progressive Loop

Initialize state: `turns: []`, `all_sources: []`, `contentCache: {}`

### Step 1: Search

Call `/neat-knowledge-search` in internal mode. Returns JSON with keyword matches + metadata.

If no results: Show "No documents found for '{question}'. Try broader terms or different keywords." Exit workflow.

### Step 2: Agent Evaluation

Follow [KB Evaluation](../references/kb-evaluation.md). Review results inline:

```
Found {N} matches for "{question}":
1. [{filename}] {title} - {category}
   Summary/Sections/Tokens/Tags

Context: Research question.

Two-part: RELEVANCE (which docs?), DEPTH (summary/sections/full?)
Decision: Which docs + depth for ROI?
```

Examples: "Docs 1,3,5 summaries (600 tokens)", "Docs 1,2 sections (1.2K)"

### Step 3: Load Content

Follow [KB Loading](../references/kb-loading.md).

Summaries: Already cached. Sections/Full: Check cache first, load if needed, cache, extract.

Broken links: Skip if `broken_link: true`, warn after loading if any broken

### Step 4: Synthesize

Build prompt with history, question, loaded content, instructions (cite sources, note gaps, stay in content). Spawn subagent to synthesize.

### Step 5: Display

Show answer with citations: "{answer}\n\nSources: {filenames}"

If any broken links were skipped: Append "\n\nNote: Some referenced sources were unavailable (broken links)."

### Step 6: Track

Add turn (question, answer, sources), merge sources (deduplicate), keep cache

### Step 7: Continue

Ask "Continue? (y/n or follow-up)"

- `n`: If 3+ turns, offer save to `docs/knowledge/conversations/{timestamp}.md`. Exit.
- `y`: Ask next question, go to Step 1
- Other: Treat as follow-up, go to Step 1

## Common Mistakes

Not initializing state, not using internal mode, pre-filtering results, not caching, not deduplicating sources, not offering save for 3+ turns
