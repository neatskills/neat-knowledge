# Knowledge Base Schema

Complete data structure and conventions for the knowledge base system.

## Directory Layout

```text
./knowledge/  (or ./docs/knowledge/)
  .index/
    index.json        # Lightweight search index
    summaries/        # Per-category summary files
      {category}.json
    metadata.json     # Aggregate statistics and source_root
  <category>/
    <document>.md     # Embedded storage only
```

## Storage Modes

**Embedded:** Full content in KB as markdown. Used for web content (always), images (always), local files (user choice). Location: `{KB_PATH}/{category}/{filename}.md`. No `source` field.

**Referenced:** Summary only in KB, content at source. Used for local files (PDF, Word, Excel, Markdown). Has `source` field. Auto-recovery if file moves. Optional `broken_link: true` flag.

**Source path calculation (referenced only):**

```javascript
const relativePath = sourcePath.startsWith(sourceRoot)
  ? path.relative(sourceRoot, sourcePath)
  : path.relative(path.dirname(kbRoot), sourcePath);
```

**Loading:**

- Embedded: Read from KB
- Referenced: PDF/Markdown via Read, Word/Excel via `convert-office.js`

## Document Format

Markdown with YAML frontmatter:

```markdown
---
title: Document Title
tags: [tag1, tag2]
summary: Brief summary
category: category-name
---
# Content...
```

## Categories

AI-generated during ingestion. Lowercase with hyphens. Dual purpose: semantic classification + physical organization. AI prefers existing to prevent proliferation. Rebuild merges/splits as needed.

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
    "filename.md": {
      "title": "Document Title",
      "category": "category-name",
      "tags": ["tag1", "tag2"],
      "file_path": "category/filename.md",
      "storage": "embedded"
    }
  }
}
```

Fields: `documents` (map), `title`, `category`, `tags`, `file_path`, `storage` ("embedded" or "referenced")

### summaries/{category}.json

Located at `{KB_PATH}/.index/summaries/{category}.json`. Loaded on-demand per category.

```json
{
  "category": "web-development",
  "documents": {
    "react-hooks-guide.md": {
      "title": "React Hooks Guide",
      "summary": "Brief 2-3 sentence overview...",
      "tags": ["tag1", "tag2"],
      "file_path": "web-development/react-hooks-guide.md",
      "last_modified": "2026-04-05T10:30:00Z",
      "storage": "embedded",
      "tokens": {"summary": 150, "full": 3500, "sections": {...}},
      "sections": [{"heading": "Introduction", "preview": "..."}]
    }
  }
}
```

Fields per document: `title`, `summary`, `tags`, `file_path`, `last_modified`, `storage`, `tokens` (summary/full/sections for ROI), `sections` (heading+preview), `source` (referenced only)

### Usage Notes

Empty state: `{"documents": {}}`. Updated by ingest/rebuild. Load summaries on-demand only.

### metadata.json

Located at `{KB_PATH}/.index/metadata.json`

```json
{
  "source_root": "/Users/ji/project/",
  "document_count": 42,
  "categories": {"web-development": 12, ...},
  "tags": {"react": 10, ...}
}
```

Fields: `source_root` (project root for recovery), `document_count`, `categories` (counts guide reuse), `tags` (counts for rebuild). Updated by ingest/rebuild.

## Atomic Write Pattern

Prevents corruption via temp files + atomic rename:

```javascript
const temp = `.index/summaries/.${category}.json.tmp`;
fs.writeFileSync(temp, JSON.stringify(data, null, 2));
fs.renameSync(temp, `.index/summaries/${category}.json`);
```

Convention: Category summaries use 2-space indent; index/metadata use compact format.

## Common Procedures

### Loading Category Summary Files

1. Load `.index/summaries/{category}.json`
2. If missing/corrupt: Log warning, skip category, continue
3. If valid: Extract metadata

Non-blocking: Missing files don't fail operation.

## Migration Note

Breaking change: New index structure. No migration provided. Re-ingest required for existing KBs.
