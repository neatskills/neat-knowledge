# Knowledge Base Schema

Complete data structure and conventions for the knowledge base system.

## Directory Layout

```text
{KB_PATH}/  (user specifies: ./knowledge/, ./docs/kb/, etc.)
  .index/
    index.json        # Lightweight search index
    summaries/        # Per-category summary files
      {category}.json
    metadata.json     # Aggregate statistics and source_root
  captures/           # Special category - temporary holding area
    solutions/
    workflows/
  <other-categories>/  # Regular categories (AI-detected)
```

## Category Structure

**captures/** - Special category for team experience

Session-generated knowledge from problem-solving and workflows.

**Characteristics:**

- Persistent storage (not temporary)
- Types: `solutions/`, `workflows/`
- Multiple similar captures expected (team collaboration)
- Lifecycle: capture → accumulate → consolidate within captures/
- Consolidation stays in captures/, creates comprehensive captures from individual ones
- 3+ similar captures → 1 consolidated capture (deletes sources)

**Regular categories** - Manually created knowledge

**Characteristics:**

- Permanent storage
- AI-detected categories based on content during ingest
- Manually created knowledge only (not from captures)
- Rebuild can reorganize categories as KB evolves

## Storage Modes

**Embedded:** Full content in KB as markdown. Used for web content (always), images (always), local files (user choice). Location: `{KB_PATH}/{category}/{filename}.md`. No `source` field.

**Referenced:** Summary only in KB, content at source. Used for local files (PDF, Word, Excel, Markdown). Has `source` field. Auto-recovery if file moves. Optional `broken_link: true` flag.

**Loading:**

- Embedded: Read from KB
- Referenced: PDF/Markdown via Read, Word/Excel via `convert-office.js`

## Document Format

Markdown with YAML frontmatter:

**Captures:**

```markdown
---
title: Document Title
category: captures
type: solutions
date: YYYY-MM-DD
tags: [tag1, tag2]
summary: Brief summary
---
# Content...
```

Note: Captures are deleted during consolidation.

**Regular Categories:**

```markdown
---
title: Document Title
category: category-name
tags: [tag1, tag2]
summary: Brief summary
---
# Content...
```

## Categories and Types

**captures/** - Fixed types (not AI-detected)

- `solutions/` - Problem-solutions captured from troubleshooting
- `workflows/` - Processes and procedures discovered

Type comes from capture skill's detection, stored in `type` frontmatter field.

**Regular categories** - AI-generated during ingest/consolidation

- Lowercase with hyphens
- Semantic classification + physical organization
- AI prefers existing categories to prevent proliferation
- Rebuild can reorganize categories as KB evolves

## Tags

5-10 AI-generated concepts for searching/filtering.

## Filename Convention

Sanitized from title: lowercase, spaces→hyphens, special chars removed, `.md` extension.

## Index Files

### index.json

Located at `{KB_PATH}/.index/index.json`

```json
{
  "documents": {
    "postgres-timeout.md": {
      "title": "PostgreSQL Connection Timeout Fix",
      "category": "captures",
      "type": "solutions",
      "tags": ["postgresql", "database", "troubleshooting"],
      "file_path": "captures/solutions/postgres-timeout.md",
      "storage": "embedded"
    },
    "react-hooks-guide.md": {
      "title": "React Hooks Guide",
      "category": "guides",
      "tags": ["react", "hooks", "frontend"],
      "file_path": "guides/react-hooks-guide.md",
      "storage": "embedded"
    }
  }
}
```

**Fields:**

- `documents` (map): All documents keyed by filename
- `title`: Document title
- `category`: Category name ("captures" for captures, otherwise regular category)
- `type`: For captures only ("solutions" or "workflows")
- `tags`: Array of tags
- `file_path`: Relative path from KB root
- `storage`: "embedded" or "referenced"

### summaries/{category}.json

Located at `{KB_PATH}/.index/summaries/{category}.json`. Loaded on-demand per category/type.

**For captures:**

```json
{
  "category": "captures",
  "documents": {
    "postgres-timeout.md": {
      "title": "PostgreSQL Connection Timeout",
      "summary": "Brief 2-3 sentence overview...",
      "type": "solutions",
      "tags": ["postgresql", "database", "troubleshooting"],
      "file_path": "captures/solutions/postgres-timeout.md",
      "last_modified": "2026-04-15T10:30:00Z",
      "storage": "embedded",
      "date": "2026-04-15",
      "tokens": {"summary": 150, "full": 3500, "sections": {...}},
      "sections": [{"heading": "Problem", "preview": "..."}]
    }
  }
}
```

**For regular categories:**

```json
{
  "category": "guides",
  "documents": {
    "react-hooks-guide.md": {
      "title": "React Hooks Guide",
      "summary": "Brief 2-3 sentence overview...",
      "tags": ["react", "hooks", "frontend"],
      "file_path": "guides/react-hooks-guide.md",
      "last_modified": "2026-04-05T10:30:00Z",
      "storage": "embedded",
      "tokens": {"summary": 150, "full": 3500, "sections": {...}},
      "sections": [{"heading": "Introduction", "preview": "..."}]
    }
  }
}
```

**Fields per document:**

- Common: `title`, `summary`, `tags`, `file_path`, `last_modified`, `storage`, `tokens`, `sections`
- Captures only: `type` ("solutions" or "workflows"), `date`, `synthesized_from` (array, when consolidated from multiple captures)
- Regular only: `synthesized_from` (array, when consolidated from captures that were promoted)
- Referenced only: `source` (file path), `broken_link` (optional boolean, true if file missing)

### Usage Notes

Empty state: `{"documents": {}}`. Updated by ingest/rebuild. Load summaries on-demand only.

### metadata.json

Located at `{KB_PATH}/.index/metadata.json`

```json
{
  "source_root": "/Users/ji/project/",
  "document_count": 42,
  "categories": {
    "captures": 10,
    "guides": 7,
    "architecture": 4,
    "reference": 3
  },
  "tags": {"react": 10, "postgresql": 8, ...}
}
```

Fields:

- `source_root`: Project root for recovery
- `document_count`: Total documents (all categories)
- `categories`: Counts per category (includes "captures" as special category)
- `tags`: Counts across all documents

Updated by ingest/rebuild.

## Atomic Write Pattern

Prevents corruption via temp files + atomic rename. Convention: Category summaries use 2-space indent; index/metadata use compact format.

## Common Procedures

### Loading Category Summary Files

1. Load `.index/summaries/{category}.json`
2. If missing/corrupt: Log warning, skip category, continue
3. If valid: Extract metadata

Non-blocking: Missing files don't fail operation.
