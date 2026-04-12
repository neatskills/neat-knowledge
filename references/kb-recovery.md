# KB Recovery

Covers KB regeneration and source link recovery.

## KB Regeneration

Regenerates index files when documents exist but index files need updating or are corrupted.

### When to Regenerate

- Index files (index.json, metadata.json, summaries) corrupted or missing
- Documents added/modified outside skills
- Rebuild index files after manual changes

### Regeneration Process

Regenerates from document content (same as ingest):

**If index.json exists:**

1. Use index as source of truth for document locations
2. For each document in index:
   - `storage: "embedded"`: Read from `{KB_PATH}/{file_path}`
   - `storage: "referenced"`: Read from `source` path (if broken, see Source Link Recovery)
3. AI analyzes document → extract metadata (title, summary, tags, sections, category)
4. Write summaries/{category}.json
5. Write index.json with minimal entries
6. Write metadata.json with counts

**If index.json missing:**

1. Scan KB for embedded documents: Glob `{KB_PATH}/**/*.md` (exclude `.index/`)
2. For each embedded document:
   - Read content
   - AI analyzes → extract metadata
   - Write summary, index entry, update counts
3. Warning: Referenced documents lost (need re-ingestion)

### Auto-Recovery: metadata.json Only

**When:** Only metadata.json is missing, but index.json and summaries exist and are valid

**Behavior:** Silent auto-recovery (no user prompt)

**Why silent:** metadata.json is derivative data that can be reliably reconstructed from index.json without data loss

**Process:**

1. Regenerate metadata.json from index.json
2. Count documents, extract categories and tags
3. Set `source_root` to current working directory
4. Log: "Recovered metadata.json from index.json"
5. Continue operation

**Note:** Full index regeneration (when index.json or summaries missing/corrupt) always requires user confirmation via `/neat-knowledge-rebuild` to avoid unintended data loss

## Source Link Recovery

Finds moved or renamed files when source links break for referenced documents.

**Triggers:**

- neat-knowledge-query: Read fails with ENOENT loading referenced document
- neat-knowledge-rebuild: Batch validation of source links

**Tools:** Glob for file search, AI reasoning for matching

### Algorithm

#### Step 1: Load Source Root

Read `source_root` from metadata.json:

```json
{
  "source_root": "/Users/ji/project/",
  ...
}
```

All referenced documents must be under this root.

#### Step 2: Get All Available Files

Glob all supported files from source root:

```text
Pattern: source_root/**/*
Extensions: .md, .pdf, .docx, .xlsx
Exclude: node_modules/, .git/, dist/, build/, .next/, out/

Returns: [
  "docs/design/architecture.md",
  "docs/design/system-architecture.md",  // un-ingested
  "docs/api/endpoints.pdf",
  "guides/setup.docx"
]
```

#### Step 3: Identify Un-ingested Files

Compare against KB index:

```text
Known files (from index.json source fields):
- docs/design/architecture.md
- docs/api/endpoints.pdf

Un-ingested files:
- docs/design/system-architecture.md
- guides/setup.docx
```

#### Step 4: AI Reasoning for Matching

For broken links, AI finds best match:

**Input to AI:**

- Broken path: `docs/design/architecture.md`
- KB entry: `{title: "System Architecture", category: "design", tags: [...]}`
- Available files: all files from Step 2
- Un-ingested files: from Step 3

**AI considers:**

- Filename similarity (exact → substring → abbreviation)
- Folder structure (matches category or original parent)
- Title hints (filename contains title keywords)
- Un-ingested status (flag as candidate)

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

### Handling Results

**Auto-fix (found):**

- Update summary `source` field with new path
- Remove `broken_link` flag if present
- Update index.json entry
- Log: "Auto-fixed: {title} → {new_path}"

**User choice (ambiguous):**

```
Multiple matches for "System Architecture":
[1] docs/design/system-architecture.md (un-ingested)
[2] docs/arch/architecture.md (moved)
Choose [1-2/skip]:
```

Update if chosen, skip if not.

**Mark broken (not_found):**

```
Source not found for "System Architecture"
Action:
[1] Mark as broken (add broken_link flag)
[2] Provide path manually
[3] Remove from KB
[1-3]:
```

### Document Loading After Recovery

Load content on-demand after recovery:

- **.md files:** Read directly via Read tool
- **.pdf files:** Read directly via Read tool (native support)
- **.docx/.xlsx files:** Convert on-demand: `node scripts/convert-office.js <file-path>`
