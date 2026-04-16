---
name: neat-knowledge-search
description: Use when searching knowledge base for documents - fast keyword matching returns all matches with metadata, token costs, and section details
---

# Knowledge Base Search

**Role:** You are a research analyst who helps users discover documents in their knowledge base.

## Overview

Fast semantic search returning metadata only (no content loading). Returns all keyword matches with rich metadata: summaries, sections, token costs, tags.

**Usage:** `/neat-knowledge-search <query>`

**Output:** Document metadata sorted by relevance with progressive disclosure format.

## KB Detection

Follow [KB Detection](../references/kb-detection.md). Store KB path.

**If KB missing:** Error "No KB found. Run /neat-knowledge-ingest"

**If index files missing/corrupt but KB exists:**
- Glob: `{KB_PATH}/**/*.md`, exclude `.index/`
- If found: Error "KB has {count} files but index files corrupt. Run /neat-knowledge-rebuild to regenerate."
- If none: Error "No KB found. Run /neat-knowledge-ingest"

## When to Use

- Find documents by keyword, category, tag
- Explore what's available before deeper research
- Quick metadata scan without loading content

## Algorithm

### Stage 1: Keyword Filter

1. Load `{KB_PATH}/.index/index.json`
2. Filter documents by query (case-insensitive):
   - Match in `title` field
   - Match in `category` field
   - Match in `tags` array
   - Support `category:name` syntax for filtering by category
3. Sort by relevance (count of matching fields, descending)
4. If no matches: "No matches for '{query}'. Try: broader keywords, check spelling, use category: filter"

### Stage 2: Load Rich Metadata

For each matched document:

1. Group matches by category
2. Load category summary files: `{KB_PATH}/.index/summaries/{category}.json`
3. Follow [Common Procedures](../references/kb-schema.md#loading-category-summary-files) for error handling
4. Extract metadata:
   - `summary` - Brief overview text
   - `tokens` - Object with `summary`, `full`, and `sections` counts
   - `sections` - Array of section objects with `heading` and `preview`
   - `storage` - "embedded" or "referenced"
   - `file_path` - Relative path from KB root
5. If document not in summary file: log "Skipping {filename}, not in summary", remove from results

### Stage 3: Format and Return

1. Sort matches by relevance (descending)
2. Return all matches (no artificial cap)
3. If 50+ matches: Show warning "Found {N} matches. Consider more specific keywords or category: filter."

**Output format (user mode):**

```
[{filename}] {title} ({category})
  Overview: {first 150 chars of summary}...
  Sections: {section1} ({tokens}), {section2} ({tokens})
  Tokens: ~{summary} summary / ~{full} full
  Tags: [{tags}]
```

**Token formatting:**
- <1000: exact number ("150", "800")
- ≥1000: K suffix with 1 decimal ("3.5K", "12.8K")

**Footer:** "Found {total_returned} matches"

**Example:**

```
[auth-patterns.md] Authentication Patterns (security)
  Overview: Comprehensive guide to JWT, OAuth2...
  Sections: Introduction (150), JWT Flow (800), OAuth (650)
  Tokens: ~200 summary / ~3.5K full
  Tags: [jwt, oauth, authentication]

[api-security.md] API Security Best Practices (security)
  Overview: Security patterns for REST APIs...
  Sections: Authentication (400), Rate Limiting (300)
  Tokens: ~180 summary / ~2.8K full
  Tags: [api, security, rest]

Found 2 matches
```

## Internal Mode (for ask/extract skills)

**Usage:** Called programmatically by other skills

**Output:** Structured JSON

```json
{
  "results": [
    {
      "filename": "auth-patterns.md",
      "title": "Authentication Patterns",
      "summary": "Comprehensive guide to JWT, OAuth2...",
      "category": "security",
      "tags": ["jwt", "oauth", "authentication"],
      "tokens": {
        "summary": 200,
        "full": 3500,
        "sections": {"Introduction": 150, "JWT Flow": 800, "OAuth": 650}
      },
      "sections": ["Introduction", "JWT Flow", "OAuth"],
      "storage": "embedded",
      "file_path": "security/auth-patterns.md"
    }
  ],
  "total_returned": 1
}
```

## Common Mistakes

- Not checking KB exists before search
- Not handling empty results gracefully
- Filtering results before presenting (show all, let agent/user filter)
- Not loading category summaries per-category (load per matched category)
- Forgetting to handle missing/corrupt summary files
- Treating internal mode same as user mode (different output formats)
