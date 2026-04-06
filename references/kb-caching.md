# KB Caching Architecture

## Overview

Project KB caches converted documents and extracted sections. Source files stay in original format. Timestamp-based
invalidation. Cache is transparent (can be deleted/regenerated).

## Cache Structure

```text
Project structure:
  docs/design/architecture.pdf        (source - single source of truth)
  docs/api/endpoints.docx             (source)
  guides/setup.md                     (source - already markdown)

KB structure:
  docs/kb/.index/summaries.json       (index)
  docs/kb/.index/metadata.json        (config)
  docs/kb/.cache/                     (cache directory)
    architecture-abc123.md            (converted PDF → markdown)
    architecture-abc123-sections.json (extracted sections)
    endpoints-def456.md               (converted Word → markdown)
    endpoints-def456-sections.json    (extracted sections)
    setup-ghi789-sections.json        (sections only, source is .md)
```

## Caching Strategy by File Type

**Markdown (.md):** Read source directly for full doc. Cache sections only.

**Office (.docx, .xlsx):** Convert via `convert-office.js`, cache markdown + sections.

**PDF (.pdf):** Convert via Read tool, cache markdown + sections.

## Progressive Loading

**Browse:** summaries.json only (fastest)  
**Section:** `loadSection(sourcePath, heading, cacheDir)` (medium)  
**Full:** `loadFullDocument(sourcePath, cacheDir)` (slowest)

## Cache Invalidation

Timestamp comparison: regenerate if source mtime > cache mtime or cache missing. Markdown sources read directly for
full docs (no cache).

## Section Extraction

Regex parses markdown headers (`/^(#{1,6})\s+(.+)$/`). Stores heading, level, preview (100 chars), content, line range.

## Cache Management

`clearCache(cacheDir, sourcePath?)` clears all or specific file cache. Cache regenerates automatically on next access.

## Performance Characteristics

| Operation           | Without Cache    | With Cache | Savings            |
|---------------------|------------------|------------|--------------------|
| Load .md full doc   | ~10ms            | ~10ms      | None (no cache)    |
| Load .md section    | ~10ms + parse    | ~5ms       | 2x faster          |
| Load .pdf full doc  | ~500ms           | ~10ms      | 50x faster         |
| Load .pdf section   | ~500ms + parse   | ~5ms       | 100x faster        |
| Load .docx full doc | ~200ms           | ~10ms      | 20x faster         |
| Load .docx section  | ~200ms + parse   | ~5ms       | 40x faster         |

## Error Handling

**Cache read/write fails:** Fall back to source, log warning, regenerate on next access. Don't block operations.

**Conversion fails:** Throw error. User fixes source file.

## Integration with Recovery

Recovery finds broken source links, caching handles loading, summaries.json updated with new path. See [kb-recovery.md](./kb-recovery.md).
