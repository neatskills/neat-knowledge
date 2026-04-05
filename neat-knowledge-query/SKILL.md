---
name: neat-knowledge-query
description: Use when searching or researching in knowledge base - search mode for quick lookups, ask mode for deep research with synthesis, extract mode for structured data extraction
---

# Knowledge Base Query

**Role:** You are a research analyst who helps users find and synthesize information from their accumulated knowledge.

## Overview

Search, research, and cluster documents in knowledge base.

**Commands:**

- `/neat-knowledge-query search <query>` - Search for documents
- `/neat-knowledge-query ask <question>` - Interactive research with synthesis
- `/neat-knowledge-query extract <source> <options>` - Extract structured data (skill-to-skill calls)

**Clusters:** If you've run `/neat-knowledge-rebuild`, clusters group related documents by theme. Clusters organize but don't change search results - all modes query summaries.json directly. Use clusters for filtering in extract mode.

## KB Detection

**Personal KB:** Content stored in KB documents, no source field in summaries.

**Project KB:** Content at original locations, summaries include source field pointing to original path. Enables progressive disclosure.

**Detection:**

1. Follow [KB Detection](../references/kb-detection.md) to find `.index/summaries.json`
2. Load `metadata.json` to check `kb_type: "personal" | "project"`
3. If neither found: error "No knowledge base found"

Store detected path and KB type for all operations.

## When to Use

- Finding documents by keyword, topic, or tag
- Quick lookups across document metadata
- Deep research requiring synthesis across multiple sources
- Interactive exploration with follow-up questions
- Understanding connections between documents
- Researching topics covered in your KB

After adding 10+ documents, run `/neat-knowledge-rebuild` to discover themes and group related documents into clusters.

## Quick Reference

| Command | Purpose | Best For |
| --- | --- | --- |
| `/neat-knowledge-query search <query>` | Fast keyword search | Quick lookups, finding specific docs |
| `/neat-knowledge-query ask <question>` | Deep research with synthesis | Complex questions, multi-source answers |
| `/neat-knowledge-query extract <source> <options>` | Structured JSON extraction | Skill-to-skill calls (predictable, typed) |

**Search:** Matches keywords in title/summary/tags/key_concepts, returns top 10 results

**Ask:** Progressive loading (summaries first, full docs if needed), synthesizes across sources, supports follow-up questions, tracks conversation history

**Context savings:** Summary-only: ~2-3K tokens (85% reduction), full docs: ~6-8K tokens (60% reduction)

## Prerequisites

- Knowledge base exists at detected path
- `[KB_PATH]/.index/summaries.json` exists with at least one document
- Index files initialized by neat-knowledge-ingest (see [Knowledge Schema](../references/knowledge-schema.md))

## Command: Search

**Usage:** `/neat-knowledge-query search <query>`

If query empty: show usage and return.

Detect KB path. Load summaries.json (error if missing/corrupt/empty).

Filter documents by keyword (case-insensitive match in title/summary/tags/key_concepts), take top 10, format as `[filename] title (category) - snippet... [tags]`, show "Found X matches (showing Y)".

## Command: Ask (Interactive Research)

**Usage:** `/neat-knowledge-query ask <question>`

Detect KB path. Load summaries.json (error if missing/corrupt/empty).

Initialize tracking: `turns: []`, `all_sources: []`

**Loop until user stops:**

1. **Search:** Find relevant docs (top 10-15) from summaries.json
2. **Progressive Loading:** Use metadata from summaries.json (title/summary/key_concepts/related_topics). If question needs details: load 2-4 most relevant full documents
3. **Synthesize:** Build prompt with previous turns, current question, document content, instructions (cite sources, note conflicts, format clearly)
4. **Execute:** Make Claude call
5. **Display:** Show answer
6. **Track:** Add turn to history, merge sources (deduplicate by filename)
7. **Continue:** Ask "Continue? (y/n/question)"
   - `n`: If 3+ turns, offer to save, then exit
   - `y`: Ask "Next question:" and continue
   - Other: treat as follow-up and continue

**Context Impact:** Summary-only: ~2-3K tokens (85% reduction). Deep dive: ~6-8K tokens (60% reduction).

## Command: Extract (Structured Data Extraction)

**Usage:** `/neat-knowledge-query extract <query> <options>`

**Purpose:** Skill-to-skill calls requiring predictable, typed responses. Returns structured JSON.

**Query:** Natural language query, cluster name, category, tag, or filename

**Options:**

- `--sections <list>` - Comma-separated section headings (e.g., "Introduction,Architecture,Risks")
- `--format json` - Output format (default: json)
- `--summary-only` - Return summaries without loading full content
- `--filter <key>=<value>` - Filter by metadata (e.g., category=analysis, sdd_type=feature)
- `--fields <list>` - Specific fields to extract from structured data
- `--limit <N>` - Maximum documents to return (default: 10)

### Extract Mode Algorithm

#### Step 1: Detect KB and Load Summaries

Follow KB detection to find `.index/summaries.json`. Load `metadata.json` to check `kb_type`. Read summaries.json (error if missing). Log: "Loaded summaries from KB (X documents)"

#### Step 2: Initialize Section Cache

First extract query in conversation: Check if `SECTION_CACHE` exists. If not: create empty. Format: `{"document_key": {"sections": {"Introduction": {"content": "...", "tokens": 847}}, "total_tokens_cached": 1470}}`

#### Step 3: Filter Documents

Start with all documents from summaries.json. Apply `--filter` conditions (category, sdd_type, custom fields). Apply query matching (title, summary, key_concepts, category, tags). Sort by relevance, apply `--limit` (default: 10).

#### Step 4: Determine Loading Strategy

If `--summary-only`: use summaries.json data only.
If `--sections` specified: check if sections in summary or cache, determine which need loading.
If `--fields` specified: check if fields in summary (SDD structured data), load full document if not.

#### Step 5: Load Missing Sections

**Project KB (source field present):**
Validate source file exists at `{KB_PATH}/{source_path}`. If not: error "Source file not found: {source_path}. Document may have moved."
Spawn Explore subagent to read file and extract requested sections by heading. Receive extracted text, cache in `SECTION_CACHE`.

**Personal KB (no source field):**
Read document from `{KB_PATH}/{category}/{filename}.md`, extract requested sections by heading, cache in `SECTION_CACHE`.

**Why subagent (Project KB):** Read 5-15K full file, return 1-3K sections (70-90% savings). Main context doesn't bloat. Sections cached for future queries.

#### Step 6: Extract Structured Data

If SDD fields present in summary:

- `sdd_type="analysis"`: Include layers (L0, L1, L3, L6), structured fields (tech_stack, components, risks)
- `sdd_type="domain_knowledge"`: Include investigations array
- `sdd_type="feature"`: Include state, goal
- `sdd_type="adr"`: Include status, decision

If `--fields` specified: extract only requested fields.

#### Step 7: Construct JSON Response

Build structured response (`loaded_from` fields are query-generated runtime metadata, not stored in summaries.json):

```json
{
  "documents": [
    {
      "filename": "document-name.md",
      "title": "Document Title",
      "summary": "Brief overview",
      "category": "category-name",
      "tags": ["tag1", "tag2"],
      "source": "path/to/original.md",
      "loaded_from": "summary" | "full" | "cache",
      "sections": {
        "Introduction": {"content": "...", "token_count": 847, "loaded_from": "summary"}
      },
      "structured": {
        "sdd_type": "analysis",
        "layers": {"L0": "...", "L1": "..."},
        "tech_stack": [...],
        "components": [...]
      }
    }
  ],
  "metadata": {
    "total_documents": 3,
    "total_tokens": 1470,
    "cache_hits": 2,
    "newly_loaded": 1,
    "kb_type": "project"
  }
}
```

#### Step 8: Return Response

Return JSON string to caller.

### Extract Mode Examples

**Example 1: SDD-optimized (summary only)**

```text
extract "authentication" --filter sdd_type=analysis --sections L1,L3,L6
→ Load summaries, filter, L1/L3/L6 in summary → return immediately
Context: ~1K tokens = instant
```

**Example 2: Progressive loading (spawn subagent)**

```text
extract "payment flow" --sections "Technical Flows,Business Logic"
→ Load summaries, find match, spawn subagent to extract sections, cache
Context: 2K tokens (vs 10K full) = 80% savings
```

**Example 3: Summary-only (fastest)**

```text
extract "security" --summary-only --limit 5
→ Match "security", return top 5 summaries
Context: ~500 tokens = instant
```

### Extract Mode Response Schema

**Key fields:**

- `documents` - Array of matched documents
- `filename`, `title`, `summary`, `category`, `tags`
- `source` - Original file path (Project KB only)
- `loaded_from` - Where data came from (summary/full/cache)
- `sections` - Extracted sections by heading name
- `structured` - SDD fields if detected
- `metadata` - Token counts, cache hits, KB type

### Extract Mode - Project KB vs Personal KB

**Project KB:** Progressive disclosure (KB has summaries, full content at source paths). `source` field in entries. Section extraction with subagents (read more, return less). SDD-optimized when detected.

**Personal KB:** Full content in KB documents. No `source` field. Section extraction by reading documents directly. Generic summarization.

### Extract Mode Context Savings

**Typical conversation:**

```text
Query 1: extract "auth" --sections Introduction,Architecture → 2.3K tokens
Query 2: extract "auth" --sections Risks → 400 tokens (cache hit)
Query 3: extract "security" --summary-only → 200 tokens (instant)
Total: 2.9K tokens vs 25K (3x full loads) = 88% savings
```

## Common Mistakes

**All modes:**

- Not checking if KB exists before queries
- Not handling empty results gracefully

**Search/Ask modes:**

- Loading full documents when summaries suffice (use progressive loading)
- Forgetting to deduplicate sources
- Expecting clusters to affect search (uses summaries.json only)

**Extract mode:**

- Requesting `--sections all` when only need specific sections
- Not using `--summary-only` when full content not needed
- Querying same sections multiple times (trust conversation cache)
- Spawning subagent for small files (read directly if <3K tokens)
- Forgetting to parse structured fields from response

## Error Handling

**All modes:**

- KB not found: "No knowledge base found. Run analysis to generate KB or /neat-knowledge-ingest to create one."
- summaries.json missing/corrupt: "KB index missing. Run /neat-knowledge-ingest to regenerate."
- Empty results: "No matches found. Try different keywords/sections."

**Extract mode:**

- Invalid section: "Section '{name}' not found in document. Available sections: {list}"
- No documents match filters: "No documents match filters. Try different query or --filter values"
- Source file missing (Project KB): "Source file not found: {path}. Document may have moved."

**Response format:**

```json
{
  "error": true,
  "message": "Section L9 does not exist. Valid sections: L0-L6",
  "code": "INVALID_SECTION",
  "valid_sections": ["L0", "L1", "L2", "L3", "L4", "L5", "L6"]
}
```

Show error message, suggest fixes, return gracefully.
