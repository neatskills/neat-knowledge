# KB Content Loading

Content loading procedures for embedded and referenced storage modes.

## Loading Embedded Documents

Embedded documents store full content as markdown in KB.

**Procedure:**

1. Build path: `{KB_PATH}/{category}/{filename}`
2. Read file with Read tool
3. Parse markdown (skip frontmatter)
4. Return content

**Example:**
```
KB_PATH = "./docs/knowledge/"
category = "security"
filename = "auth-patterns.md"
path = "./docs/knowledge/security/auth-patterns.md"
```

## Loading Referenced Documents

Referenced documents store only summary in KB, content at source path.

**Procedure:**

1. Check `broken_link` field in category summary
2. If `broken_link: true`, skip document and log warning
3. Build source path from `source` field (relative to `source_root` in metadata.json)
4. Load based on file type

**File type handling:**
- `.md` - Read tool directly
- `.pdf` - Read tool (native PDF support)
- `.docx`, `.xlsx` - Convert via `node scripts/convert-office.js <path>`

**Example:**
```
source_root = "/Users/ji/project/" (from metadata.json)
source = "docs/architecture.pdf" (from category summary)
full_path = "/Users/ji/project/docs/architecture.pdf"
```

**Broken link handling:**

If file not found (ENOENT):
1. Log: "Warning: Source file not found: {source}"
2. Skip document
3. Track for rebuild suggestion
4. After loading all docs, if any broken: "Warning: {N} broken source links. Run /neat-knowledge-rebuild to repair."

## Section Extraction

Extract specific sections from full document by heading.

**Procedure:**

1. Load full document (embedded or referenced)
2. Split by markdown headings (`#`, `##`, `###`, etc.)
3. Find section by heading name (exact match)
4. Extract content until next heading of same or higher level
5. Return section content

**Example:**
```
Document:
# Introduction
Intro content here

## JWT Flow
JWT details here

## OAuth
OAuth details here

Extract "JWT Flow" → returns "JWT details here"
```

**Not found:** If section heading not found, log warning and skip.

## Caching Strategy

Cache loaded content to avoid re-reading same documents.

**Cache structure:**
```javascript
contentCache = {
  "security/auth-patterns.md": {
    full: "...",
    sections: {
      "JWT Flow": "...",
      "OAuth": "..."
    }
  }
}
```

**Cache rules:**
- Cache per document, not per query
- Cache persists across conversation turns (ask mode)
- Check cache before loading
- Summaries already in category summary files (no separate cache needed)

## Loading Depth Decisions

Three loading depths based on agent evaluation:

**Summary** (~200 tokens):
- Already loaded from category summary file
- No additional file reads needed
- Fastest, lowest token cost

**Sections** (~500-1000 tokens per section):
- Load full document
- Extract requested sections by heading
- Cache for future use
- Medium token cost

**Full** (~3000-8000 tokens):
- Load entire document
- Highest token cost
- Use when deep context needed

**Loading order:**
1. Summaries (free, already loaded)
2. Sections (targeted, medium cost)
3. Full (complete, high cost)

## Common Procedures Reference

For category summary loading, see [KB Schema](kb-schema.md#loading-category-summary-files).

For broken link recovery, see [KB Recovery](kb-recovery.md).
