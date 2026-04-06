# KB Source Link Recovery Algorithm

## Overview

This algorithm finds moved or renamed files when source links break in Project KB. Both neat-knowledge-query (inline
recovery) and neat-knowledge-rebuild (batch validation) follow this specification.

**Triggers:**

- neat-knowledge-query: Read tool fails with ENOENT when loading full documents
- neat-knowledge-rebuild: After clustering, validate all source links

**Tools used:** Glob for filename search, AI reasoning for matching

**Related:** See `neat-knowledge-query/scripts/kb-cache.js` for document caching and conversion

## Algorithm Steps

### Step 1: Load Source Root

Read `source_root` from metadata.json to determine where project documents are located:

```json
// metadata.json
{
  "kb_type": "project",
  "source_root": "/Users/ji/project/",
  ...
}
```

All source documents should be under this root directory.

### Step 2: Get All Available Files

Use Glob to find all markdown files from source root:

```text
Pattern: source_root/**/*.md
Exclude: node_modules/, .git/, dist/, build/, .next/, out/

Returns: [
  "docs/design/architecture.md",
  "docs/design/system-architecture.md",  // un-ingested
  "docs/api/endpoints.md",
  "guides/setup.md",
  "guides/new-feature.md"  // un-ingested
]
```

### Step 3: Identify Un-ingested Files

Compare all files against summaries.json to find un-ingested documents:

```text
Known files (from summaries.json source fields):
- docs/design/architecture.md
- docs/api/endpoints.md
- guides/setup.md

Un-ingested files:
- docs/design/system-architecture.md
- guides/new-feature.md
```

### Step 4: AI Reasoning on Filenames

When a broken link occurs, use AI to find the best match:

**Input to AI:**

- Broken path: `docs/design/architecture.md`
- KB entry: `{title: "System Architecture", category: "design", key_concepts: [...]}`
- Available files: all files from Step 2
- Un-ingested files: from Step 3

**AI reasoning considers:**

- Filename similarity (exact → substring → abbreviation)
- Folder structure (matches category or original parent directory)
- Title hints (if filename contains title keywords)
- Un-ingested status (flag as candidate for ingestion)

**Result types:**

```javascript
// Confident match (moved file)
{found: true, path: "docs/architecture/system-arch.md", status: "moved"}

// Confident match (un-ingested file)
{found: true, path: "docs/design/system-architecture.md", status: "un-ingested"}

// Multiple good candidates
{ambiguous: true, candidates: [
  {path: "docs/design/system-architecture.md", status: "un-ingested"},
  {path: "docs/arch/architecture.md", status: "moved"}
]}

// No good match
{not_found: true}
```

## Return Format

Recovery algorithm returns one of these result types:

```javascript
// Found - moved file
{found: true, path: "docs/architecture/system-arch.md", status: "moved"}

// Found - un-ingested file (candidate for ingestion)
{found: true, path: "docs/design/system-architecture.md", status: "un-ingested"}

// Ambiguous - multiple good candidates
{
  ambiguous: true,
  candidates: [
    {path: "docs/design/system-architecture.md", status: "un-ingested"},
    {path: "docs/arch/architecture.md", status: "moved"}
  ]
}

// Not found
{not_found: true}
```

## Document Loading After Recovery

Once a source file is recovered, use `neat-knowledge-query/scripts/kb-cache.js` for efficient loading:

**Caching strategy:**

- **.md files:** Read source directly, cache sections only
- **Office files (.docx, .xlsx):** Convert to markdown, cache both markdown + sections
- **PDF files:** Convert via Read tool, cache both markdown + sections

**Cache location:** `.cache/` directory next to summaries.json

**Cache invalidation:** Timestamp comparison (source mtime > cache mtime)

**API usage:**

```javascript
import { loadFullDocument, loadSection } from './neat-knowledge-query/scripts/kb-cache.js';

// Load full document (with caching)
const markdown = await loadFullDocument(sourcePath, cacheDir);

// Load specific section (with caching)
const section = await loadSection(sourcePath, "Introduction", cacheDir);
```

## Error Handling

**metadata.json missing or no source_root field:**

- Log: "Warning: source_root not configured in metadata.json"
- Fallback: use project root (cwd) as source_root

**Glob tool fails:**

- Log: "Warning: Failed to search for files: {error}"
- Return: `{not_found: true}`

**summaries.json fails to load:**

- Log: "Warning: Failed to load summaries.json"
- Cannot determine known vs un-ingested files
- Proceed with AI reasoning on all available files

**Cache errors:**

- If cache read/write fails: fall back to direct source reading
- Log warning but don't block recovery
