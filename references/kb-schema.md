# Knowledge Base Schema

Complete data structure and conventions for the knowledge base system.

## Directory Layout

```text
./knowledge/  (or ./docs/knowledge/)
  .index/
    index.json        # Lightweight search index (~200KB for 1000 docs)
    summaries/        # Per-category summary files
      web-development.json
      architecture.json
      data-science.json
      ...
    metadata.json     # Aggregate statistics and source_root
  <category>/
    <document>.md     # Embedded storage documents only
```

**Example:**

```text
./docs/knowledge/
  .index/
    index.json
    summaries/
      web-development.json
      architecture.json
      design-doc.json
    metadata.json     # source_root: "/Users/ji/project/"
  web-development/
    react-article.md  # Embedded (from web)
    screenshot.md     # Embedded (from image)
  architecture/
    design-doc.md     # Embedded (user choice)
    # system-design.pdf lives at source: "docs/system-design.pdf" (referenced)
```

## Storage Modes

Documents use either storage mode within the same KB:

**Embedded Storage:**

- Full content stored in KB as markdown
- No `source` field in category summary
- Used for: web content (always), images (always), local files (user choice)
- Physical location: `{KB_PATH}/{category}/{filename}.md`

**Referenced Storage:**

- Only summary stored in KB
- Has `source` field pointing to original file
- Content loaded on-demand
- Used for: local files only (PDF, Word, Excel, Markdown)
- Automatic recovery if source file moves (via neat-knowledge-ask, neat-knowledge-extract, or neat-knowledge-rebuild)
- Optional `broken_link: true` flag if recovery fails

**Source path calculation (referenced storage only):**

```javascript
// Get KB root and source_root from metadata.json
const kbRoot = KB_PATH;  // e.g., "/Users/ji/project/docs/knowledge/"
const sourceRoot = metadata.source_root;  // e.g., "/Users/ji/project/"

// Calculate relative path
let relativePath;
if (sourcePath.startsWith(sourceRoot)) {
  relativePath = path.relative(sourceRoot, sourcePath);
} else {
  // Fallback: relative to KB parent directory
  relativePath = path.relative(path.dirname(kbRoot), sourcePath);
}

// Store in category summary: "source": "docs/architecture.pdf"
```

**On-demand loading:**

- Embedded: Read directly from KB
- Referenced PDF: Read via Read tool (native support)
- Referenced Word/Excel: Convert via `convert-office.js` on-demand
- Referenced Markdown: Read directly from source

## Document Format

Markdown file with YAML frontmatter:

```markdown
---
title: Document Title
tags: [tag1, tag2, tag3]
summary: Brief summary of content
category: category-name
---

# Document content in markdown...
```

## Categories

AI-generated dynamically during ingestion:

- Lowercase with hyphens (e.g., `web-development`, `machine-learning`, `architecture`)
- Based on content analysis (AI prefers existing categories to prevent proliferation)
- Dual purpose: semantic classification + physical organization
- Rebuild maintains categories (merges similar, splits large)

## Tags

AI-generated concepts extracted from content during ingestion:

- 5-10 key concepts (e.g., `["microservices", "api", "authentication"]`)
- Used for flexible searching and keyword filtering

## Filename Convention

- Sanitized from document title
- Lowercase, spaces replaced with hyphens
- Special characters removed
- Extension: `.md`

Examples:

- "React Hooks Guide" → `react-hooks-guide.md`
- "AI & Machine Learning" → `ai-machine-learning.md`

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

**Fields:**

- `documents` - Map of filename to minimal document metadata
- `title` - Document title
- `category` - Lowercase-hyphenated category name (AI-generated)
- `tags` - Array of 5-10 AI-generated tags
- `file_path` - Relative path from KB root
- `storage` - "embedded" (full content in KB) or "referenced" (content at source path)

### summaries/{category}.json

Located at `{KB_PATH}/.index/summaries/{category}.json`

Per-category summary file, loaded on-demand when documents from that category are accessed:

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
      "tokens": {
        "summary": 150,
        "full": 3500,
        "sections": {
          "Introduction": 200,
          "Architecture": 800
        }
      },
      "sections": [
        {"heading": "Introduction", "preview": "This document covers..."},
        {"heading": "Architecture", "preview": "The system consists of..."}
      ]
    },
    "nextjs-routing.md": {
      "title": "Next.js Routing",
      "summary": "Another summary...",
      "tags": ["nextjs", "routing"],
      "file_path": "web-development/nextjs-routing.md",
      "last_modified": "2026-04-06T14:20:00Z",
      "storage": "embedded",
      "tokens": {
        "summary": 180,
        "full": 4200,
        "sections": {
          "Overview": 150,
          "Dynamic Routes": 600,
          "API Routes": 500
        }
      },
      "sections": [...]
    }
  }
}
```

**Fields:**

- `category` - Category name (matches filename)
- `documents` - Object keyed by filename:
  - `title` - Document title
  - `summary` - Brief 2-3 sentence overview
  - `tags` - Array of 5-10 AI-generated tags
  - `file_path` - Relative path from KB root
  - `last_modified` - ISO-8601 timestamp
  - `storage` - "embedded" or "referenced"
  - `tokens` - Token count estimates for ROI decisions:
    - `summary` - Tokens in summary field
    - `full` - Tokens in full document
    - `sections` - Object mapping section headings to token counts
  - `source` - **Referenced storage only:** Relative path to original document. Omitted for embedded storage.
  - `sections` - Array of sections with headings and previews: `[{"heading": "Introduction", "preview": "first 100 chars..."}]`. Enables progressive section loading.

### Usage Notes

**Loading index files:**

- KB index: `./knowledge/.index/index.json` or `./docs/knowledge/.index/index.json`
- Category summaries: `./knowledge/.index/summaries/{category}.json`

**Empty state:**

```json
{
  "documents": {}
}
```

**Updates:**

- Index file updated when documents added/removed via `neat-knowledge-ingest`
- Category files updated when documents added/removed/moved via `neat-knowledge-ingest` or `neat-knowledge-rebuild`
- Load summaries on-demand only when full metadata needed

**Storage modes:**

- `embedded`: Full content in KB as markdown (web, images, or user choice for local files)
- `referenced`: Only summary in KB, content loaded on-demand from source (local files only)

### metadata.json

Located at `{KB_PATH}/.index/metadata.json`

```json
{
  "source_root": "/Users/ji/project/",
  "document_count": 42,
  "categories": {
    "web-development": 12,
    "backend-architecture": 8,
    "data-science": 5
  },
  "tags": {
    "react": 10,
    "nodejs": 8,
    "python": 6
  }
}
```

**Fields:**

- `source_root` - Absolute path to project root for source link recovery. Example: `/Users/ji/project/`
- `document_count` - Total documents in KB
- `categories` - Map of category names to document counts (guides category reuse during ingestion)
- `tags` - Map of tag names to usage counts (used in rebuild split analysis)

**Updates:** Updated by `neat-knowledge-ingest` each time a document is added. Recomputed by `neat-knowledge-rebuild` during category operations.

## Atomic Write Pattern

All index file writes use atomic operations to prevent corruption:

```javascript
// For category summary files
const tempPath = `.index/summaries/.${category}.json.tmp`;
fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
fs.renameSync(tempPath, `.index/summaries/${category}.json`);

// For index.json and metadata.json
const tempPath = `.index/.${filename}.tmp`;
fs.writeFileSync(tempPath, JSON.stringify(data));
fs.renameSync(tempPath, `.index/${filename}`);
```

**Why atomic writes:**

- Rename is atomic on most platforms
- Prevents partial writes if interrupted
- Readers always see complete, valid JSON
- Temp file prefix `.` hides from listings

**Convention:**

- Category summaries: 2-space indentation for readability
- index.json and metadata.json: compact (no whitespace) for performance

## Common Procedures

### Loading Category Summary Files

**When:** Loading category summaries for document metadata access

**Standard procedure:**

1. Load `.index/summaries/{category}.json`
2. **If missing/corrupt:**
   - Log: "Warning: Category summary file {category}.json missing or corrupt, skipping {N} documents from this category"
   - Skip documents from this category (don't fail operation)
   - Continue with other categories
3. **If valid:** Extract document metadata from documents object

**Error handling:**

- Missing file: Skip category, continue operation
- Corrupt JSON (parse error): Skip category, continue operation  
- Missing documents field: Skip category, continue operation

**Usage notes:**

- Non-blocking: Missing category files don't fail the operation
- Graceful degradation: Skip affected documents, process others
- User awareness: Always log warnings for missing files

## Migration Note

**Breaking change:** This version uses new index structure (index.json + summaries/). No migration provided. Users with existing KBs must re-ingest content.

**Why:** Clean break allows removing backward compatibility code. Project is early-stage, re-ingestion cost is acceptable.
