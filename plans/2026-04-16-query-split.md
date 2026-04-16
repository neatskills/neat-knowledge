# Split neat-knowledge-query Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split monolithic neat-knowledge-query skill into three focused standalone skills (search, ask, extract) with shared reference files.

**Architecture:** Extract shared logic (KB loading, agent evaluation) into reference files. Create three independent SKILL.md files that reference shared procedures. Delete old query skill directory. Update README and symlink management.

**Tech Stack:** Markdown documentation, Bash scripts

---

## File Structure

**Create:**
- `references/kb-loading.md` - Content loading procedures (embedded/referenced storage, sections, broken links)
- `references/kb-evaluation.md` - Agent evaluation framework (relevance filtering, depth decisions)
- `neat-knowledge-search/SKILL.md` - Search skill (metadata only, no content loading)
- `neat-knowledge-ask/SKILL.md` - Ask skill (interactive research with synthesis)
- `neat-knowledge-extract/SKILL.md` - Extract skill (JSON automation)

**Delete:**
- `neat-knowledge-query/SKILL.md`
- `neat-knowledge-query/` (directory)

**Modify:**
- `README.md` - Update skills section
- `scripts/manage-skills.sh` - No changes needed (auto-discovers by SKILL.md frontmatter)

---

### Task 1: Create references/kb-loading.md

**Files:**
- Create: `references/kb-loading.md`

- [ ] **Step 1: Write kb-loading.md**

```markdown
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
```

- [ ] **Step 2: Verify markdown formatting**

Read the file and check for proper markdown syntax.

- [ ] **Step 3: Commit**

```bash
git add references/kb-loading.md
git commit -m "docs: add kb-loading reference for content loading procedures"
```

---

### Task 2: Create references/kb-evaluation.md

**Files:**
- Create: `references/kb-evaluation.md`

- [ ] **Step 1: Write kb-evaluation.md**

```markdown
# KB Agent Evaluation

Agent-driven evaluation framework for filtering relevance and deciding loading depth.

## Two-Part Evaluation

Agent sees all keyword matches with full metadata, makes two explicit decisions:

**Part 1 - RELEVANCE:** Which documents are relevant?
- Semantic filtering based on summary, sections, tags, context
- Not just keyword matching (already done)
- Narrow from N matches → 2-5 relevant docs

**Part 2 - DEPTH:** What depth to load for each relevant doc?
- Summary: Overview sufficient (~200 tokens)
- Sections: Need specific section details (~500-1000 tokens per section)
- Full: Need complete context (~3000-8000 tokens)

## Evaluation Prompt Template

Present search results to agent with this structure:

```
Found {N} matches for "{query/question}":

1. [{filename}] {title} - {category}
   Summary: {summary_text}
   Sections: {section_names}
   Tokens: {summary} summary / {full} full / sections: {section: tokens}
   Tags: [{tags}]

2. [{filename}] {title} - {category}
   ...

[Continue for all N matches]

Context: {ask|extract}

Two-part evaluation:
1. RELEVANCE: Which documents are relevant? Filter by summary, titles, sections, tags using semantic understanding, not just keywords.
2. DEPTH: What loading depth for each relevant document? Consider token costs vs information needs.

Your decision: Which docs + what depth for good ROI?
```

## Context Differences

**Ask (research):**
- User question needs comprehensive answer
- May need deeper context for synthesis
- Citations required
- Bias toward sections/full for quality

**Extract (automation):**
- Skill needs structured data
- Summary often sufficient
- Predictable output required
- Bias toward summaries for efficiency

## Example Decisions

**Ask - Overview question:**
```
Question: "What authentication methods are available?"
Decision: Docs 1, 3, 5 relevant. Load summaries (600 tokens) - provides overview without deep detail.
```

**Ask - Technical question:**
```
Question: "How does JWT token validation work?"
Decision: Docs 1, 2 relevant. Load 'JWT Flow' section from doc 1, 'Validation' section from doc 2 (1.2K tokens) - targeted technical details.
```

**Ask - Deep investigation:**
```
Question: "Explain the complete OAuth flow with error handling"
Decision: Doc 1 relevant, needs complete context. Load full document (3.5K tokens) - comprehensive coverage required.
```

**Extract - High-level data:**
```
Query: "authentication methods"
Decision: Docs 1, 2, 4 relevant for tech stack overview. Load summaries (540 tokens) - sufficient for listing methods.
```

**Extract - Specific data:**
```
Query: "JWT implementation details"
Decision: Docs 1, 3 relevant. Load 'Implementation' and 'Security' sections (1.4K tokens) - specific data needed.
```

## Token Cost ROI Considerations

**ROI formula:** Relevance × Information Density / Token Cost

**High ROI:**
- Very relevant doc, need specific section → load section
- Highly relevant, need overview → load summary
- Multiple docs cover same topic → load summaries, pick best

**Low ROI:**
- Marginally relevant → skip entirely
- Need 1 fact from 8K doc → try section first
- Already have answer → stop loading

**Progressive loading:**
1. Start with summaries (free, already loaded)
2. If insufficient, load targeted sections
3. If still insufficient, load full document
4. Stop as soon as answer is complete

## Key Principles

**No system pre-filtering:**
- Agent sees ALL keyword matches
- Agent makes ALL relevance decisions
- System provides metadata, agent decides

**No artificial caps:**
- If 87 docs match keywords, agent sees all 87
- Agent naturally prioritizes best matches
- Trust agent to handle any result set size

**Explicit decisions:**
- Agent must state which docs and why
- Agent must state depth and why
- No implicit "load everything" or "load nothing"

**ROI optimization:**
- Balance relevance vs token cost
- Progressive loading (summary → sections → full)
- Stop when sufficient information obtained
```

- [ ] **Step 2: Verify markdown formatting**

Read the file and check for proper markdown syntax.

- [ ] **Step 3: Commit**

```bash
git add references/kb-evaluation.md
git commit -m "docs: add kb-evaluation reference for agent decision framework"
```

---

### Task 3: Create neat-knowledge-search skill

**Files:**
- Create: `neat-knowledge-search/SKILL.md`

- [ ] **Step 1: Create directory**

```bash
mkdir -p neat-knowledge-search
```

- [ ] **Step 2: Write neat-knowledge-search/SKILL.md**

```markdown
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
```

- [ ] **Step 3: Verify frontmatter and markdown**

Read the file, verify `name` field matches directory name and markdown is valid.

- [ ] **Step 4: Commit**

```bash
git add neat-knowledge-search/
git commit -m "feat: add neat-knowledge-search skill"
```

---

### Task 4: Create neat-knowledge-ask skill

**Files:**
- Create: `neat-knowledge-ask/SKILL.md`

- [ ] **Step 1: Create directory**

```bash
mkdir -p neat-knowledge-ask
```

- [ ] **Step 2: Write neat-knowledge-ask/SKILL.md**

```markdown
---
name: neat-knowledge-ask
description: Use when researching questions in knowledge base - interactive multi-turn conversation with AI synthesis, follow-ups, and citations
---

# Knowledge Base Ask (Interactive Research)

**Role:** You are a research analyst who helps users find comprehensive answers through multi-turn knowledge base exploration.

## Overview

Interactive research with agent-driven progressive loading. Multi-turn conversation, synthesis with citations, follow-up questions.

**Usage:** `/neat-knowledge-ask <question>`

**Output:** Synthesized answer with source citations, supports follow-ups.

## KB Detection

Follow [KB Detection](../references/kb-detection.md). Store KB path.

**If KB missing:** Error "No KB found. Run /neat-knowledge-ingest"

**If index files missing/corrupt but KB exists:**
- Glob: `{KB_PATH}/**/*.md`, exclude `.index/`
- If found: Error "KB has {count} files but index files corrupt. Run /neat-knowledge-rebuild to regenerate."
- If none: Error "No KB found. Run /neat-knowledge-ingest"

## When to Use

- Answer complex questions requiring multiple sources
- Deep research with synthesis
- Exploratory investigation with follow-ups
- Need answers with citations

## Progressive Loop

Initialize conversation state:
- `turns: []` - Conversation history
- `all_sources: []` - Deduplicated sources across turns
- `contentCache: {}` - Loaded content cache

### Step 1: Search

Call `/neat-knowledge-search` in internal mode with the question.

Returns all keyword matches with metadata (summary, category, tags, tokens, sections, storage, file_path).

Store results for agent evaluation.

### Step 2: Agent Evaluation

Follow [KB Evaluation](../references/kb-evaluation.md) framework.

Present search results to agent with two-part evaluation prompt:

```
Found {N} matches for "{question}":

1. [{filename}] {title} - {category}
   Summary: {text}
   Sections: {names}
   Tokens: {summary} summary / {full} full / sections: {section: tokens}
   Tags: [{tags}]

[Continue for all N]

Question: "{question}"

Context: Research question requiring comprehensive answer with citations.

Two-part evaluation:
1. RELEVANCE: Which documents are relevant? Filter by summary, titles, sections, tags (semantic, not just keywords).
2. DEPTH: What loading depth? Overview → summaries, technical details → sections, deep context → full.

Your decision: Which docs + what depth for good ROI?
```

Agent responds with explicit decision. Examples:

- "Docs 1, 3, 5 relevant. Load summaries (600 tokens) - provides overview."
- "Docs 1, 2 relevant. Load 'JWT Flow' from doc 1, 'Authentication' from doc 2 (1.2K tokens)."
- "Doc 1 relevant, needs complete context. Load full (3.5K tokens)."

### Step 3: Load Content

Follow [KB Loading](../references/kb-loading.md) procedures.

Load based on agent decision:

**Summaries:**
- Already in category summary files from search
- No additional reads needed
- Extract from cached summaries

**Sections:**
- Check content cache first
- If not cached:
  - Load full document (embedded or referenced)
  - Extract requested sections by heading
  - Cache for future use
- Return section content

**Full:**
- Check content cache first
- If not cached:
  - Load full document (embedded or referenced)
  - Cache entire content
- Return full content

**Broken link handling:**
- Check `broken_link: true` in category summary
- Skip broken docs, log warning
- Track count of broken docs
- After loading: if any broken, warn user to run rebuild

### Step 4: Synthesize

Build synthesis prompt:

```
Conversation history:
{previous turns if any}

Current question: "{question}"

Loaded content:
[Doc 1: {filename}]
{loaded_content}

[Doc 2: {filename}]
{loaded_content}

Instructions:
- Answer the question using the provided content
- Cite sources by filename
- Note any conflicts or gaps
- Use clear, structured format
- Don't add information not in sources
```

Spawn subagent with prompt: "Synthesize answer from knowledge base"

Wait for subagent response.

### Step 5: Display

Show synthesized answer with citations:

```
{answer_text}

Sources:
- {filename} ({sections if loaded specific sections})
- {filename}
```

### Step 6: Track

Update state:

- Add turn to history: `{question, answer, sources}`
- Merge sources into `all_sources` (deduplicate)
- Keep content cache for follow-ups

### Step 7: Continue

Ask: "Continue? (y/n or ask follow-up question)"

**User responses:**

- `n` or `no`: 
  - If 3+ turns: "Save conversation? (y/n)"
    - If yes: Save to `docs/knowledge/conversations/{timestamp}.md`
  - Exit loop

- `y` or `yes`:
  - Ask: "What would you like to know next?"
  - Treat response as new question, go to Step 1

- Other text:
  - Treat as follow-up question
  - Go to Step 1 with new question

## References

- [KB Detection](../references/kb-detection.md) - Finding KB path
- [KB Schema](../references/kb-schema.md) - Index structure
- [KB Loading](../references/kb-loading.md) - Content loading procedures
- [KB Evaluation](../references/kb-evaluation.md) - Agent decision framework

## Common Mistakes

- Not initializing conversation state (turns, sources, cache)
- Not using internal mode for search (need structured JSON)
- Pre-filtering search results (let agent filter)
- Not caching loaded content (re-reads same docs)
- Not deduplicating sources across turns
- Forgetting to handle broken links
- Not offering to save long conversations (3+ turns)
- Loading content without checking cache first
```

- [ ] **Step 3: Verify frontmatter and markdown**

Read the file, verify `name` field matches directory name and markdown is valid.

- [ ] **Step 4: Commit**

```bash
git add neat-knowledge-ask/
git commit -m "feat: add neat-knowledge-ask skill"
```

---

### Task 5: Create neat-knowledge-extract skill

**Files:**
- Create: `neat-knowledge-extract/SKILL.md`

- [ ] **Step 1: Create directory**

```bash
mkdir -p neat-knowledge-extract
```

- [ ] **Step 2: Write neat-knowledge-extract/SKILL.md**

```markdown
---
name: neat-knowledge-extract
description: Use when extracting structured data from knowledge base for automation - returns predictable JSON with agent-optimized content loading
---

# Knowledge Base Extract (Structured Data)

**Role:** You are a data extraction specialist who retrieves structured information from knowledge bases for automation.

## Overview

Structured JSON extraction for skill-to-skill automation. Agent-driven loading optimizes content depth based on query and ROI.

**Usage:** `/neat-knowledge-extract <query>`

**Output:** Predictable JSON schema with loaded content.

## KB Detection

Follow [KB Detection](../references/kb-detection.md). Store KB path.

**If KB missing:** Error "No KB found. Run /neat-knowledge-ingest"

**If index files missing/corrupt but KB exists:**
- Glob: `{KB_PATH}/**/*.md`, exclude `.index/`
- If found: Error "KB has {count} files but index files corrupt. Run /neat-knowledge-rebuild to regenerate."
- If none: Error "No KB found. Run /neat-knowledge-ingest"

## When to Use

- Skill-to-skill data extraction
- Automated information retrieval
- Structured data needed with predictable format
- ROI-optimized content loading

## Algorithm

### Step 1: Search

Call `/neat-knowledge-search` in internal mode with the query.

Returns all keyword matches with metadata (summary, category, tags, tokens, sections, storage, file_path).

Store results for agent evaluation.

### Step 2: Agent Evaluation

Follow [KB Evaluation](../references/kb-evaluation.md) framework.

Present search results to agent with automation context:

```
Query: "{query}"

Found {N} matches:

1. [{filename}] {title} - {category}
   Summary: {text}
   Sections: {names}
   Tokens: {summary} / {full} / sections: {section: tokens}
   Tags: [{tags}]

[Continue for all N]

Context: Automation query requiring structured data extraction.

Two-part evaluation for automation:
1. RELEVANCE: Which documents relevant to skill's query? Filter by summary, sections, tags, context.
2. DEPTH: What loading depth? Summary sufficient → summaries, section data needed → sections, complete context → full.

Your decision: Which docs + depth for useful data with optimal ROI?
```

Agent responds with explicit decision. Examples:

- "Docs 1, 2, 4 relevant for tech stack overview. Load summaries (540 tokens)."
- "Docs 1, 3 relevant for authentication details. Load 'Implementation' sections (1.4K tokens)."
- "Doc 1 relevant, needs complete data. Load full (3.5K tokens)."

### Step 3: Load Content

Follow [KB Loading](../references/kb-loading.md) procedures.

Load based on agent decision:

**Summaries:**
- Already in category summary files from search
- No additional reads needed
- Extract from cached summaries

**Sections:**
- Load full document (embedded or referenced)
- Extract requested sections by heading
- Track loaded sections

**Full:**
- Load full document (embedded or referenced)
- Return complete content

**Broken link handling:**
- Check `broken_link: true` in category summary
- Skip broken docs, log warning
- Track count of broken docs
- Include warning in JSON output if any broken

### Step 4: Output JSON

Return structured JSON with predictable schema:

```json
{
  "documents": [
    {
      "filename": "example.md",
      "title": "Document Title",
      "summary": "Brief overview...",
      "category": "category-name",
      "tags": ["tag1", "tag2"],
      "storage": "embedded",
      "tokens": {
        "summary": 150,
        "full": 3500,
        "sections": {"Introduction": 200, "Details": 800}
      },
      "loaded": "summary",
      "content": "Summary text here..."
    }
  ],
  "total": 3,
  "loading_strategy": "summaries",
  "tokens_loaded": 450
}
```

**Fields:**

- `documents` - Array of document objects:
  - `filename` - Document filename
  - `title` - Document title
  - `summary` - Brief overview (always included)
  - `category` - Category name
  - `tags` - Array of tags
  - `storage` - "embedded" or "referenced"
  - `tokens` - Object with `summary`, `full`, and `sections` counts (for ROI tracking)
  - `loaded` - Depth loaded: "summary", "sections", or "full"
  - `content` - Loaded content based on depth
  - `source` - (Optional) Source path for referenced storage only
- `total` - Number of documents returned
- `loading_strategy` - Overall strategy: "summaries", "sections", "full", or "mixed"
- `tokens_loaded` - Total tokens loaded across all documents
- `warnings` - (Optional) Array of warning messages if broken links found

**Broken links warning:**

If any broken links encountered:

```json
{
  "documents": [...],
  "total": 2,
  "loading_strategy": "summaries",
  "tokens_loaded": 350,
  "warnings": [
    "2 broken source links found. Run /neat-knowledge-rebuild to repair."
  ]
}
```

## References

- [KB Detection](../references/kb-detection.md) - Finding KB path
- [KB Schema](../references/kb-schema.md) - Index structure
- [KB Loading](../references/kb-loading.md) - Content loading procedures
- [KB Evaluation](../references/kb-evaluation.md) - Agent decision framework

## Common Mistakes

- Not using internal mode for search (need structured JSON)
- Pre-filtering search results (let agent filter)
- Returning inconsistent JSON schema
- Not tracking token costs in output
- Forgetting to handle broken links
- Not specifying `loaded` depth field
- Omitting `warnings` field when broken links found
- Loading without agent evaluation (prescriptive instead of agent-driven)
```

- [ ] **Step 3: Verify frontmatter and markdown**

Read the file, verify `name` field matches directory name and markdown is valid.

- [ ] **Step 4: Commit**

```bash
git add neat-knowledge-extract/
git commit -m "feat: add neat-knowledge-extract skill"
```

---

### Task 6: Delete neat-knowledge-query

**Files:**
- Delete: `neat-knowledge-query/SKILL.md`
- Delete: `neat-knowledge-query/` (directory)

- [ ] **Step 1: Remove directory**

```bash
rm -rf neat-knowledge-query
```

- [ ] **Step 2: Commit**

```bash
git commit -m "refactor: remove monolithic neat-knowledge-query skill

BREAKING CHANGE: Split into three standalone skills:
- neat-knowledge-search
- neat-knowledge-ask  
- neat-knowledge-extract

Users must update invocations and re-run manage-skills.sh"
```

---

### Task 7: Update README.md

**Files:**
- Modify: `README.md:22-26` (Skills section)
- Modify: `README.md:51-54` (Query usage examples)

- [ ] **Step 1: Update Skills section**

Find the Skills section (lines 22-26) and replace with:

```markdown
## Skills

- **neat-knowledge-ingest** - Convert content to markdown with security checks, auto-index
- **neat-knowledge-search** - Fast keyword search with rich metadata and token costs
- **neat-knowledge-ask** - Interactive research with AI synthesis and follow-ups
- **neat-knowledge-extract** - Structured JSON extraction for automation
- **neat-knowledge-rebuild** - Optimize categories via AI analysis, regenerate index files, validate sources
```

- [ ] **Step 2: Update Query usage section**

Find the Query section (lines 51-54) and replace with:

```markdown
# Query knowledge base
/neat-knowledge-search "keyword"              # Fast search: shows docs, sections, token costs
/neat-knowledge-ask "research question"       # Interactive: agent loads progressively, synthesizes answer
/neat-knowledge-extract "auth patterns"       # Automation: returns structured JSON with optimized loading
```

- [ ] **Step 3: Verify changes**

Read README.md to verify both sections updated correctly.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: update README for split query skills"
```

---

### Task 8: Verify symlink management

**Files:**
- Read: `scripts/manage-skills.sh`

- [ ] **Step 1: Review manage-skills.sh logic**

Read `scripts/manage-skills.sh` and verify it:
1. Auto-discovers skills by finding directories with `SKILL.md`
2. Reads `name:` field from frontmatter
3. Creates symlinks based on `name:` field (not directory name)

Expected: No changes needed - script already auto-discovers.

- [ ] **Step 2: Test uninstall**

```bash
cd /Users/ji.li/Documents/Projects/neat-knowledge
./scripts/manage-skills.sh uninstall
```

Expected output:
```
INFO: neat-knowledge-query uninstalled
INFO: neat-knowledge-ingest already installed - skipping (or uninstalled)
INFO: neat-knowledge-rebuild already installed - skipping (or uninstalled)
```

- [ ] **Step 3: Test install**

```bash
./scripts/manage-skills.sh install
```

Expected output:
```
INFO: neat-knowledge-search installed
INFO: neat-knowledge-ask installed
INFO: neat-knowledge-extract installed
INFO: neat-knowledge-ingest already installed - skipping
INFO: neat-knowledge-rebuild already installed - skipping
```

- [ ] **Step 4: Verify symlinks created**

```bash
ls -la ~/.claude/skills/neat-knowledge-*
```

Expected: Five symlinks:
- neat-knowledge-search → /path/to/neat-knowledge/neat-knowledge-search
- neat-knowledge-ask → /path/to/neat-knowledge/neat-knowledge-ask
- neat-knowledge-extract → /path/to/neat-knowledge/neat-knowledge-extract
- neat-knowledge-ingest → /path/to/neat-knowledge/neat-knowledge-ingest
- neat-knowledge-rebuild → /path/to/neat-knowledge/neat-knowledge-rebuild

- [ ] **Step 5: Commit if any changes made**

If manage-skills.sh needed changes:

```bash
git add scripts/manage-skills.sh
git commit -m "fix: update manage-skills.sh for new skill names"
```

Otherwise: Skip (no changes needed).

---

### Task 9: Integration testing

**Files:**
- Test: All three new skills with actual KB

- [ ] **Step 1: Test neat-knowledge-search**

Run search and verify output:

```bash
# In Claude Code, invoke:
/neat-knowledge-search authentication
```

Expected:
- KB detected correctly
- Keyword matches returned
- User-friendly format with sections, tokens, tags
- Footer shows total count
- If 50+ results: warning displayed

- [ ] **Step 2: Test neat-knowledge-ask**

Run ask and verify flow:

```bash
/neat-knowledge-ask "What authentication methods are available?"
```

Expected:
- Search called in internal mode
- Agent evaluation prompt presented
- Agent makes relevance + depth decision
- Content loaded based on decision
- Synthesized answer with citations displayed
- "Continue?" prompt shown
- Test follow-up: answer "yes" and ask another question
- Test exit: answer "no", verify save offer if 3+ turns

- [ ] **Step 3: Test neat-knowledge-extract**

Run extract and verify JSON:

```bash
/neat-knowledge-extract "authentication patterns"
```

Expected:
- Search called in internal mode
- Agent evaluation for automation context
- Content loaded based on decision
- Valid JSON returned with schema:
  - `documents` array
  - `total` count
  - `loading_strategy` field
  - `tokens_loaded` field
  - Each document has: filename, title, summary, category, tags, storage, tokens, loaded, content

- [ ] **Step 4: Test missing KB handling**

Test with directory that has no KB:

```bash
cd /tmp
/neat-knowledge-search test
```

Expected: Error message "No KB found. Run /neat-knowledge-ingest"

- [ ] **Step 5: Test broken links (if any)**

If KB has referenced documents:
1. Temporarily move a source file
2. Run extract
3. Verify: warning in JSON `warnings` array
4. Restore source file

- [ ] **Step 6: Document test results**

Create test summary:

```bash
echo "# Integration Test Results

## neat-knowledge-search
- KB detection: PASS/FAIL
- Keyword matching: PASS/FAIL  
- User format: PASS/FAIL
- Warning (50+): PASS/FAIL/SKIPPED

## neat-knowledge-ask
- Search integration: PASS/FAIL
- Agent evaluation: PASS/FAIL
- Content loading: PASS/FAIL
- Synthesis: PASS/FAIL
- Follow-ups: PASS/FAIL
- Multi-turn: PASS/FAIL

## neat-knowledge-extract
- Search integration: PASS/FAIL
- Agent evaluation: PASS/FAIL
- JSON schema: PASS/FAIL
- Broken links: PASS/FAIL/SKIPPED

## Cross-cutting
- Missing KB: PASS/FAIL
- Symlinks: PASS/FAIL
" > test-results.txt
```

Fill in results and commit:

```bash
git add test-results.txt
git commit -m "test: add integration test results for split skills"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✓ Create kb-loading.md - Task 1
- ✓ Create kb-evaluation.md - Task 2
- ✓ Create neat-knowledge-search - Task 3
- ✓ Create neat-knowledge-ask - Task 4
- ✓ Create neat-knowledge-extract - Task 5
- ✓ Delete neat-knowledge-query - Task 6
- ✓ Update README - Task 7
- ✓ Verify symlink management - Task 8
- ✓ Integration testing - Task 9

**No placeholders:**
- ✓ All code blocks complete
- ✓ All file paths exact
- ✓ All commands with expected output
- ✓ No TBD/TODO/implement later

**Type consistency:**
- ✓ Field names consistent across skills (filename, title, summary, category, tags, tokens, sections, storage, file_path)
- ✓ JSON schema consistent in search/ask/extract
- ✓ Reference file names consistent (kb-loading.md, kb-evaluation.md)
