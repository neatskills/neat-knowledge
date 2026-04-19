---
name: neat-knowledge-search
description: Use when searching knowledge base for documents - fast keyword matching returns all matches with metadata, token costs, and section details
---

# Knowledge Base Search

**Role:** You are a research analyst who helps users discover documents in their knowledge base.

## Overview

Fast keyword search returning metadata only (no content). Returns all matches with rich metadata: summaries, sections, token costs, tags.

**Usage:** `/neat-knowledge-search <query>`

## Prerequisites

- Knowledge base with `.index/index.json` and `.index/summaries/` structure
- Category summary files for rich metadata

## KB Detection

Follow [KB Detection](../references/kb-detection.md). Error if missing/corrupt.

## Algorithm

### Stage 1: Keyword Filter

- Load index.json
- Filter by query (case-insensitive): match title/category/tags, support `category:name` syntax
- Sort by relevance (matching field count)
- If none: suggest broader keywords

### Stage 2: Load Rich Metadata

- Group by category
- Load summaries, follow [Common Procedures](../references/kb-schema.md#loading-category-summary-files)
- Extract: summary, tokens, sections, storage, file_path
- Skip if not in summary file

### Stage 3: Format and Return

Sort by relevance, return all. Warn if 50+ matches.

**Output format (user mode):**

```
[{filename}] {title} ({category})
  Overview: {first 150 chars}...
  Sections: {section} ({tokens}), ...
  Tokens: ~{summary} summary / ~{full} full
  Tags: [{tags}]

Found {total} matches
```

Token formatting: <1000 exact ("150"), ≥1000 K suffix ("3.5K")

## Internal Mode (for ask/extract skills)

Structured JSON output:

```json
{
  "results": [
    {
      "filename": "auth-patterns.md",
      "title": "Authentication Patterns",
      "summary": "...",
      "category": "security",
      "tags": ["jwt", "oauth", "..."],
      "tokens": {"summary": 200, "full": 3500, "sections": {...}},
      "sections": [{"heading": "Introduction", "preview": "..."}],
      "storage": "embedded",
      "file_path": "security/auth-patterns.md",
      "broken_link": false
    }
  ],
  "total_returned": 1
}
```

Note: `broken_link` field (optional boolean) indicates if referenced file is missing.

## Common Mistakes

Not checking KB exists, filtering results before presenting, treating internal mode same as user mode
