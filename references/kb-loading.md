# KB Content Loading

Content loading procedures for embedded and referenced storage.

## Loading Embedded Documents

1. Build path: `{KB_PATH}/{category}/{filename}`
2. Read, parse markdown (skip frontmatter)
3. Return content

## Loading Referenced Documents

1. Check `broken_link` in summary, skip if true
2. Build path from `source` + `source_root`
3. Load: .md/.pdf via Read, .docx/.xlsx via `convert-office.js`

**Broken link:** Log warning, skip, track. After all loads: warn if any broken.

## Section Extraction

1. Load full document
2. Split by headings (#, ##, ###)
3. Find by exact match
4. Extract until next same/higher level
5. Return content

Not found: log warning, skip.

## Caching Strategy

Cache structure: `contentCache[file_path] = {full: "...", sections: {...}}`

Rules: Per document, persists in session, check before loading. Summaries in category files (no separate cache).

## Loading Depth Decisions

**Summary** (~200 tokens): Already in category file, no reads, fastest

**Sections** (~500-1000 tokens/section): Load full, extract by heading, cache, medium cost

**Full** (~3000-8000 tokens): Load entire, highest cost, deep context

**Order:** Summaries → sections → full

## References

See [KB Schema](kb-schema.md#loading-category-summary-files) and [KB Recovery](kb-recovery.md).
