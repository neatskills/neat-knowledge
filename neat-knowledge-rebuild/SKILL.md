---
name: neat-knowledge-rebuild
description: Use when rebuilding KB clusters after adding many documents - groups related documents by shared themes - works for both personal and project KBs
---

# Knowledge Base Rebuild

**Role:** You are a data analyst who discovers and organizes document clusters based on semantic relationships.

## Overview

Rebuilds KB cluster index by analyzing documents and grouping related content by shared concepts and themes.
Runs in background to save context (~50K tokens).

**Usage:** `/neat-knowledge-rebuild`

**Works for both KB types:** Personal KB and Project KB both use dynamic clustering to discover themes and relationships.

**Clusters are for organization:** Clusters help with browsing, understanding relationships, and filtering queries in neat-knowledge-query.

## Quick Reference

| Aspect | Details |
| -------- | --------- |
| Target | Both Personal and Project KB (auto-detected) |
| When to run | After adding 10+ documents |
| Prerequisites | 10+ documents, summaries.json and metadata.json exist |
| Output | Cluster list with counts, runs in background |
| Context savings | ~50K tokens (background sub-agent) |

## Prerequisites

- KB exists (any location)
- 10+ ingested documents
- `.index/summaries.json` exists
- `.index/metadata.json` exists with `kb_type`

## KB Detection

See [KB Detection](../references/kb-detection.md) for full logic. If none found, error: "No knowledge base found.
Run /neat-knowledge-ingest to create one."

## Workflow

**Usage:** `/neat-knowledge-rebuild`

### Step 1: Detect KB path

Follow [KB Detection](../references/kb-detection.md) logic to find KB path (works for both personal and project KB).

### Step 2: Start background rebuild

Tell user: "Starting cluster rebuild in background... You'll be notified when complete."

Spawn background general-purpose sub-agent with prompt:

```text
Rebuild cluster index at ./knowledge/:

1. Load ./knowledge/.index/summaries.json
   - If file missing or invalid JSON: error 'summaries.json not found or corrupt. Run /neat-knowledge-ingest to rebuild.'
   - If documents empty or fewer than 10: error 'Need at least 10 documents for meaningful clustering. Add more with /neat-knowledge-ingest'
2. Group docs by shared key_concepts/tags (2+ matches)
3. For each cluster: generate {cluster_name, overview, main_themes} via LLM
   - If LLM call fails: retry once, then skip cluster and continue with others
4. Save each cluster to ./knowledge/.index/clusters/[name].json
   - Create clusters directory if missing
5. Update ./knowledge/.index/clusters.json with all clusters

Report: doc count, cluster count, top 3 clusters with doc counts.
If any clusters failed: report count and suggest manual retry.
```

### Step 3: Continue in main context

Main conversation continues while sub-agent runs in background.

### Step 4: Display results when notified

Show: processed count, generated count, top clusters with doc counts.

Note: "These clusters are available in /neat-knowledge-query for filtering by theme and understanding document relationships."

**Context Impact:** <500 tokens in main vs 50K+ if done directly

## Error Handling

**Sub-agent fails to start:** Show error message and suggest checking system resources.
User can retry by running the command again.

**summaries.json corrupt or missing:** Sub-agent reports error with message to run `/neat-knowledge-ingest`
to rebuild the index.

**Fewer than 10 documents:** Sub-agent reports minimum requirement error.
User should add more documents before retrying.

**LLM clustering call fails:** Sub-agent retries once, then skips failed cluster and continues.
Final report indicates partial success with failed cluster count.

**Sub-agent completes with errors:** Display what succeeded and what failed.
User can re-run to retry failed clusters or investigate specific issues.

**metadata.json missing kb_type:** Proceed with rebuild (backward compatibility).

## When to Use

**Run rebuild when:**

- Added 10+ new documents to KB
- Documents span multiple topics
- Want to discover related content

**Skip when:**

- Fewer than 10 documents
- Just added 1-2 documents
- Documents already well-organized

## Common Mistakes

| Mistake | Fix |
| --------- | ----- |
| Running with <10 documents | Wait until 10+ documents added |
| Expecting instant results | Remember it runs in background |
| Running after each document | Batch 10+ docs before rebuild |
| Not checking prerequisites | Verify summaries.json exists first |
| Expecting clusters to change search results | Clusters organize but don't change underlying data - search uses summaries.json |
