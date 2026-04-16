---
name: neat-knowledge-extract
description: Use when extracting structured data from knowledge base for automation - returns predictable JSON with agent-optimized content loading
---

# Knowledge Base Extract (Structured Data)

**Role:** You are a data extraction specialist who retrieves structured information from knowledge bases for automation.

## Overview

Structured JSON extraction for skill-to-skill automation. Agent-driven loading optimizes content depth based on query and ROI.

**Usage:** `/neat-knowledge-extract <query>`

**Output:** Predictable JSON schema with loaded content.

## KB Detection

Follow [KB Detection](../references/kb-detection.md). Store KB path.

**If KB missing:** Error "No KB found. Run /neat-knowledge-ingest"

**If index files missing/corrupt but KB exists:**
- Glob: `{KB_PATH}/**/*.md`, exclude `.index/`
- If found: Error "KB has {count} files but index files corrupt. Run /neat-knowledge-rebuild to regenerate."
- If none: Error "No KB found. Run /neat-knowledge-ingest"

## When to Use

- Skill-to-skill data extraction
- Automated information retrieval
- Structured data needed with predictable format
- ROI-optimized content loading

## Algorithm

### Step 1: Search

Call `/neat-knowledge-search` in internal mode with the query.

Returns all keyword matches with metadata (summary, category, tags, tokens, sections, storage, file_path).

Store results for agent evaluation.

### Step 2: Agent Evaluation

Follow [KB Evaluation](../references/kb-evaluation.md) framework.

Present search results to agent with automation context:

```
Query: "{query}"

Found {N} matches:

1. [{filename}] {title} - {category}
   Summary: {text}
   Sections: {names}
   Tokens: {summary} / {full} / sections: {section: tokens}
   Tags: [{tags}]

[Continue for all N]

Context: Automation query requiring structured data extraction.

Two-part evaluation for automation:
1. RELEVANCE: Which documents relevant to skill's query? Filter by summary, sections, tags, context.
2. DEPTH: What loading depth? Summary sufficient → summaries, section data needed → sections, complete context → full.

Your decision: Which docs + depth for useful data with optimal ROI?
```

Agent responds with explicit decision. Examples:

- "Docs 1, 2, 4 relevant for tech stack overview. Load summaries (540 tokens)."
- "Docs 1, 3 relevant for authentication details. Load 'Implementation' sections (1.4K tokens)."
- "Doc 1 relevant, needs complete data. Load full (3.5K tokens)."

### Step 3: Load Content

Follow [KB Loading](../references/kb-loading.md) procedures.

Load based on agent decision:

**Summaries:**
- Already in category summary files from search
- No additional reads needed
- Extract from cached summaries

**Sections:**
- Load full document (embedded or referenced)
- Extract requested sections by heading
- Track loaded sections

**Full:**
- Load full document (embedded or referenced)
- Return complete content

**Broken link handling:**
- Check `broken_link: true` in category summary
- Skip broken docs, log warning
- Track count of broken docs
- Include warning in JSON output if any broken

### Step 4: Output JSON

Return structured JSON with predictable schema:

```json
{
  "documents": [
    {
      "filename": "example.md",
      "title": "Document Title",
      "summary": "Brief overview...",
      "category": "category-name",
      "tags": ["tag1", "tag2"],
      "storage": "embedded",
      "tokens": {
        "summary": 150,
        "full": 3500,
        "sections": {"Introduction": 200, "Details": 800}
      },
      "loaded": "summary",
      "content": "Summary text here..."
    }
  ],
  "total": 3,
  "loading_strategy": "summaries",
  "tokens_loaded": 450
}
```

**Fields:**

- `documents` - Array of document objects:
  - `filename` - Document filename
  - `title` - Document title
  - `summary` - Brief overview (always included)
  - `category` - Category name
  - `tags` - Array of tags
  - `storage` - "embedded" or "referenced"
  - `tokens` - Object with `summary`, `full`, and `sections` counts (for ROI tracking)
  - `loaded` - Depth loaded: "summary", "sections", or "full"
  - `content` - Loaded content based on depth
  - `source` - (Optional) Source path for referenced storage only
- `total` - Number of documents returned
- `loading_strategy` - Overall strategy: "summaries", "sections", "full", or "mixed"
- `tokens_loaded` - Total tokens loaded across all documents
- `warnings` - (Optional) Array of warning messages if broken links found

**Broken links warning:**

If any broken links encountered:

```json
{
  "documents": [...],
  "total": 2,
  "loading_strategy": "summaries",
  "tokens_loaded": 350,
  "warnings": [
    "2 broken source links found. Run /neat-knowledge-rebuild to repair."
  ]
}
```

## References

- [KB Detection](../references/kb-detection.md) - Finding KB path
- [KB Schema](../references/kb-schema.md) - Index structure
- [KB Loading](../references/kb-loading.md) - Content loading procedures
- [KB Evaluation](../references/kb-evaluation.md) - Agent decision framework

## Common Mistakes

- Not using internal mode for search (need structured JSON)
- Pre-filtering search results (let agent filter)
- Returning inconsistent JSON schema
- Not tracking token costs in output
- Forgetting to handle broken links
- Not specifying `loaded` depth field
- Omitting `warnings` field when broken links found
- Loading without agent evaluation (prescriptive instead of agent-driven)
