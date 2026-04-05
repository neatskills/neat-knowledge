# Knowledge Schema

## summaries.json

Located at `./knowledge/.index/summaries.json` (personal KB) or `./docs/knowledge/.index/summaries.json` (project KB)

```json
{
  "documents": {
    "filename.md": {
      "title": "Document Title",
      "summary": "Brief summary...",
      "key_concepts": ["concept1", "concept2"],
      "related_topics": ["topic1", "topic2"],
      "tags": ["tag1", "tag2"],
      "category": "category-name",
      "file_path": "category/filename.md",
      "last_modified": "2026-04-05T10:30:00Z",
      "source": "relative/path/from/KB_PATH/to/original.md"
    }
  }
}
```

**Fields:**

- `documents` - Map of filename to document metadata
- `title` - Document title (from first heading)
- `summary` - Brief 2-3 sentence overview
- `key_concepts` - Array of 3-8 key terms extracted from content
- `related_topics` - Array of 3-8 related topics
- `tags` - Array of user-confirmed tags
- `category` - Lowercase-hyphenated category name
- `file_path` - Relative path from KB root (for personal KB)
- `last_modified` - ISO-8601 timestamp of last modification
- `source` - **Project KB only:** Relative path to original document from KB_PATH. Enables progressive disclosure - KB stores summary, full content at source path. Omitted for personal KB (content stored in KB document).

### SDD-Specific Fields (Optional)

When SDD patterns are detected during ingest, additional structured fields are added:

**For Analysis documents (contains `## L0`, `## L1`, `## L3`, `## L6` headings):**

```json
{
  "sdd_type": "analysis",
  "layers": {
    "L0": "Extract L0 section (first 500 chars)",
    "L1": "Extract L1 section (first 500 chars)",
    "L3": "Extract L3 section (first 500 chars)",
    "L6": "Extract L6 section (first 500 chars)"
  },
  "structured": {
    "tech_stack": ["Next.js 14", "React 18"],
    "components": ["API layer", "Auth service"],
    "risks": ["Technical debt item"]
  }
}
```

**For Domain Knowledge documents (contains `## Investigation:` patterns):**

```json
{
  "sdd_type": "domain_knowledge",
  "investigations": [
    {
      "title": "Investigation title",
      "slug": "investigation-slug",
      "summary": "First paragraph (150 chars)"
    }
  ]
}
```

**For Feature documents (frontmatter has `state:` and `goal:` fields):**

```json
{
  "sdd_type": "feature",
  "state": "refined",
  "goal": "Enable users to authenticate via OAuth2"
}
```

**For ADR documents (has `Status:` and `Decision:` sections):**

```json
{
  "sdd_type": "adr",
  "status": "accepted",
  "decision": "Use PostgreSQL for primary datastore"
}
```

**Detection Rules:**

- Analysis: Document must contain at least 2 of the 4 layer headings (L0, L1, L3, L6)
- Domain Knowledge: Document must contain at least 1 `## Investigation:` heading
- Feature: Frontmatter must contain both `state:` and `goal:` fields
- ADR: Document must contain both a Status section and a Decision section

**Partial Matches:**

If only some SDD patterns detected (e.g., only L0 and L1 found), include only detected fields in `layers` object. Generic fields (title, summary, key_concepts) always present.

## Usage Notes

**Loading indexes:**
Read JSON file directly with fs.readFile:

- Personal KB: `./knowledge/.index/summaries.json`
- Project KB: `./docs/knowledge/.index/summaries.json`

**Empty state:**
When index doesn't exist, use default empty structure:

```json
{
  "documents": {}
}
```

**Updates:**
Index file is updated immediately when documents are added via `neat-knowledge-ingest`.

## metadata.json

Located at `./knowledge/.index/metadata.json` (personal KB) or `./docs/knowledge/.index/metadata.json` (project KB)

**Personal KB Example:**

```json
{
  "kb_type": "personal",
  "document_count": 42,
  "last_updated": "2026-04-04T10:30:00Z",
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

**Project KB Example:**

```json
{
  "kb_type": "project",
  "document_count": 23,
  "last_updated": "2026-04-05T14:20:00Z",
  "categories": {
    "analysis": 8,
    "domains": 12,
    "adrs": 3
  },
  "tags": {
    "nextjs": 5,
    "api": 8,
    "architecture": 4
  }
}
```

**Fields:**

- `kb_type` - "project" or "personal" (set during KB creation)
- `document_count` - Total number of documents in KB
- `last_updated` - ISO-8601 timestamp of last index update
- `categories` - Map of category names to document counts
- `tags` - Map of tag names to usage counts

**Updates:** Updated by `neat-knowledge-ingest` each time a document is added.

## clusters.json

Located at `./knowledge/.index/clusters.json` (both personal and project KB)

```json
{
  "clusters": {
    "web-development": {
      "name": "web-development",
      "document_count": 5,
      "overview": "Documents related to web development..."
    },
    "backend-architecture": {
      "name": "backend-architecture",
      "document_count": 8,
      "overview": "Documents about backend system design..."
    }
  }
}
```

**Fields:**

- `clusters` - Map of cluster name to cluster metadata
  - `name` - Cluster identifier (lowercase-hyphenated)
  - `document_count` - Number of documents in this cluster
  - `overview` - Brief description of cluster theme

**Generated by:** `neat-knowledge-rebuild` skill after analyzing document relationships

## Individual Cluster Files

Located at `./knowledge/.index/clusters/[name].json` (both personal and project KB)

```json
{
  "cluster_name": "web-development",
  "overview": "Documents related to web development...",
  "main_themes": ["React", "JavaScript", "Frontend"],
  "documents": ["react-hooks.md", "nextjs-routing.md", "css-grid.md"]
}
```

**Fields:**

- `cluster_name` - Cluster identifier (matches filename)
- `overview` - Detailed description of cluster theme
- `main_themes` - Array of key themes/technologies in this cluster
- `documents` - Array of document filenames belonging to this cluster

**Generation:** Created by `neat-knowledge-rebuild` when documents share 2+ key_concepts or tags
