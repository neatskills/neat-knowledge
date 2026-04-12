---
name: neat-knowledge-query
description: Use when searching or researching in knowledge base - search mode for fast, AI ranking semantic search, ask mode for deep research with synthesis, extract mode for structured data extraction
---

# Knowledge Base Query

**Role:** You are a research analyst who helps users find and synthesize information from their accumulated knowledge.

## Overview

Search, research, extract from knowledge base.

**Commands:**

- `/neat-knowledge-query search <query>` - Search docs
- `/neat-knowledge-query ask <question>` - Research with synthesis
- `/neat-knowledge-query extract <source>` - Structured data

## KB Detection

Follow [KB Detection](../references/kb-detection.md). Store KB path.

**If KB missing:** Error "No KB found. Run /neat-knowledge-ingest"

**If index files missing/corrupt but KB exists:**

- Glob: `{KB_PATH}/**/*.md`, exclude `.index/`
- If found: Error "KB has {count} files but index files corrupt. Run /neat-knowledge-rebuild to regenerate."
- If none: Error "No KB found. Run /neat-knowledge-ingest"

**Storage:** Embedded (content in KB) or referenced (content at source). Check `storage` in `.index/summaries/{category}.json`.

**References:** Shared at `references/kb-*.md`

## When to Use

- Find docs by category, keyword, tag
- Multi-source research with synthesis
- Interactive exploration with follow-ups

## Quick Reference

| Command | Purpose | Best For |
| --- | --- | --- |
| `search <query>` | Semantic search | Find relevant docs with precision |
| `ask <question>` | Research + synthesis | Complex, multi-source answers |
| `extract <source>` | Structured JSON | Skill-to-skill (predictable, typed) |

**Details:**

- **Search:** Keyword filter → metadata → 20-30 matches (tokens, sections, summaries)
- **Ask:** Search + agent filters + agent loads + synthesis, history, follow-ups
- **Extract:** Search + agent filters + agent loads + JSON

**Token costs:** Summary ~2-3K (80% reduction), sections ~1-2K each, full ~6-8K  
**Agent:** Filters 20-30 keyword matches → 2-5 relevant, decides loading depth

## Prerequisites

If KB missing/empty: inform, suggest `/neat-knowledge-ingest`

## Command: Search

**Usage:** `/neat-knowledge-query search <query>`

If empty: show usage, return.

Detect KB. Load index.json (error if missing/corrupt/empty).

**Modes:**

- **User:** Formatted text
- **Internal (Ask/Extract):** Structured `{results: [{filename, title, summary, category, tags, score, tokens, sections}], total_returned: N}`

**Pipeline:**

### Stage 1: Keyword Filter + Load Metadata

1. Adaptive cap: `max(20, min(30, KB_size × 0.15))`
2. Filter by keyword (case-insensitive title/category/tags), support `category:name`
3. Sort by relevance (matching field count), take top N = min(cap, total_matches)
4. If none: "No matches for '{query}'. Try: broader keywords, check spelling, use category: filter"

### Stage 2: Load Rich Metadata

Per matched document:

1. Group by category
2. Load summaries (follow [Common Procedures](../references/kb-schema.md#loading-category-summary-files))
3. Extract: summary text, token counts (summary, full, sections), section headings, metadata (title, tags, category, file_path, storage)
4. If missing from summary: log "Skipping {filename}, not in summary", remove

### Stage 3: Format + Return

1. Sort by relevance (descending)
2. Return matched (up to cap: 20-30)
3. **User mode:** Progressive disclosure format:

   ```
   [{filename}] {title} (category)
     Overview: {first 150 chars}...
     Sections: {section1} ({tokens}), {section2} ({tokens})
     Tokens: ~{summary} summary / ~{full} full
     Tags: [{tags}]
   ```

   Example:

   ```
   [auth-patterns.md] Authentication Patterns (security)
     Overview: Comprehensive guide to JWT, OAuth2...
     Sections: Introduction (150), JWT Flow (800), OAuth (650)
     Tokens: ~200 summary / ~3.5K full
     Tags: [jwt, oauth, authentication]
   ```

   Footer: "Found {total_returned} matches (keyword-sorted, top {cap})"

   **Token format:** <1000: exact ("150"), ≥1000: K suffix ("3.5K"), round 1 decimal

4. **Internal mode:** Structured data for agent:

   ```json
   {
     "results": [
       {
         "filename": "auth-patterns.md",
         "title": "Authentication Patterns",
         "summary": "Brief overview...",
         "category": "security",
         "tags": ["jwt", "oauth"],
         "tokens": {"summary": 200, "full": 3500, "sections": {"Intro": 150, "JWT": 800}},
         "sections": ["Introduction", "JWT Flow"],
         "storage": "embedded",
         "file_path": "security/auth-patterns.md"
       }
     ],
     "total_returned": 1
   }
   ```

**Agent:** Evaluates results (summary, tokens, sections) to determine:

- Which docs relevant
- Depth to load (summary/sections/full)
- ROI (relevance vs cost)

## Command: Ask (Interactive Research)

**Usage:** `/neat-knowledge-query ask <question>`

Detect KB. Load index.json (error if missing/corrupt/empty). Init: `turns: []`, `all_sources: []`

**Progressive loop:**

### Step 1: Search

Call Search (internal mode) with question. Returns 20-30 keyword-sorted docs: summary, category, tags, tokens (summary, full, sections), section headings, storage, file_path

Store for agent eval.

### Step 2: Agent Evaluation (Filter + Decide)

Present results to agent for two decisions:

```
Found {N} matches for "{question}":

1. [{filename}] {title} - {category}
   Summary: {text}
   Sections: {names}
   Tokens: {summary} summary / {full} full / sections: {section: tokens}
   Tags: [{tags}]

[Continue for all 20-30]

Question: "{question}"

Two-part:
1. RELEVANCE: Which relevant? Filter by summary, titles, sections, tags (semantic, not just keywords)
2. DEPTH: What depth? Overview → summaries, technical → sections, deep → full

Decision: Which docs + what depth for good ROI?
```

Agent makes explicit two-part decision. Examples:

- "Docs 1,3,5 relevant. Load summaries (600 tokens) - overview"
- "Docs 1,2 relevant. Load 'JWT Flow' from 1, 'Auth' from 2 (1.2K)"
- "Doc 1 relevant, needs deep context. Load full (3.5K)"

### Step 3: Load Content

Load based on agent decision:

**Summaries:** Extract from category summaries (already loaded)

**Sections:** Per requested:

1. Load summary if not cached
2. Extract from full doc:
   - Embedded: Read `{KB_PATH}/{category}/{filename}`
   - Referenced: Read source, handle broken links
3. Find by heading, extract, cache

**Full:**

- Embedded: Read `{KB_PATH}/{category}/{filename}`
- Referenced: Read source, convert if needed (PDF/Office)

**Referenced handling:**

- Check `broken_link: true`, skip if broken
- Attempt load from source
- On ENOENT: log, skip, track for rebuild

### Step 4: Synthesize

Build prompt: conversation turns (if any), question, loaded content (summaries/sections/full), instructions (cite, note conflicts, clear format)

Spawn subagent: "Synthesize answer from knowledge base"

### Step 5: Display

Show answer with citations:

```
{Answer}

Sources:
- {filename} ({sections})
```

### Step 6: Track

- Add turn to history
- Merge sources (dedupe)
- Cache loaded content

### Step 7: Continue

Ask "Continue? (y/n/question)"

- `n`: If 3+ turns, offer save, exit
- `y`: Ask "Next:", go Step 1
- Other: Treat as follow-up, go Step 1

**Key:** Agent decides loading based on visible costs and question nature. System provides info for ROI, doesn't prescribe.

## Command: Extract (Structured Data Extraction)

**Usage:** `/neat-knowledge-query extract <query>`

Skill automation. Returns JSON. Agent-driven loading based on query and metadata.

### Extract Algorithm

**Step 1: Detect KB**

Detect KB, load index.json (error if missing/corrupt/empty).

**Step 2: Search**

Call Search (internal). Returns 20-30 keyword-sorted: summary, category, tags, tokens (summary, full, sections), section headings, storage, file_path

Store for eval.

**Step 3: Agent Evaluation (Filter + Decide)**

Present results to agent for two-part eval:

```
Query: "{query}"

Found {N} matches:

1. [{filename}] {title} - {category}
   Summary: {text}
   Sections: {names}
   Tokens: {summary} / {full} / sections: {section: tokens}
   Tags: [{tags}]

[Continue for all 20-30]

Two-part for automation:
1. RELEVANCE: Which relevant to skill's query? Filter by summary, sections, tags, context
2. DEPTH: What depth? Summary sufficient → summaries, section data → sections, complete context → full

Decision: Which docs + depth for useful data with ROI?
```

Agent makes explicit decision. Examples:

- "Docs 1,2,4 relevant for tech stack. Load summaries (540)"
- "Docs 1,3 relevant for auth. Load auth sections (1.4K)"
- "Doc 1 relevant, needs complete. Load full (3.5K)"

**Step 4: Load Content**

Load based on agent:

**Summaries:** Extract from category summaries (already loaded)

**Sections:** Per doc/section:

1. Load summary if not cached
2. Read full:
   - Embedded: `{KB_PATH}/{category}/{filename}`
   - Referenced: Source path
3. Extract by heading, track

**Full:**

- Embedded: Read `{KB_PATH}/{category}/{filename}`
- Referenced: Read source, convert if needed (PDF/Office)

**File types:**

- `.md`: Read tool
- PDF: Read tool
- Office (.docx, .xlsx): `node scripts/convert-office.js <path>`

**Referenced handling:**

1. Check `broken_link: true`, skip if broken
2. Attempt source load
3. ENOENT: log, skip, track for rebuild

If broken found:

```
Warning: {N} broken source links.
Run /neat-knowledge-rebuild to repair.
```

**Step 5: Output JSON**

Return structured with content:

```json
{
  "documents": [
    {
      "filename": "example.md",
      "title": "Document Title",
      "summary": "Brief...",
      "category": "category-name",
      "tags": ["tag1", "tag2"],
      "score": 0.85,
      "storage": "embedded",
      "tokens": {"summary": 150, "full": 3500, "sections": {"Intro": 200}},
      "loaded": "summary",
      "content": "Summary/full/sections based on agent"
    }
  ],
  "total": 3,
  "loading_strategy": "summaries",
  "tokens_loaded": 450
}
```

**Fields:**

- `filename`, `title`, `summary` (always), `category`, `tags`, `score` (0.0-1.0), `storage` (embedded/referenced), `tokens` (ROI tracking), `loaded` (summary/sections/full), `content` (agent-based), `source` (referenced only), `loading_strategy`, `tokens_loaded`, `total`

**Key:** Agent evaluates query and metadata for intelligent loading. Skills get structured, predictable JSON with ROI-optimized content.

## Common Mistakes

- Not checking KB exists before queries
- Not handling empty results
- Pre-filtering results (show all matches, let agent filter)
- Not letting agent evaluate ROI before loading
- Loading without considering token costs
- Forgetting to dedupe sources (Ask mode)
- Ignoring adaptive cap (too many/few matches)
- Prescriptive loading (use agent-driven)
- Using user-mode Search for Ask/Extract (need internal)
- Not checking `broken_link: true` before load
- Ignoring tokens metadata in loading decisions
- Not trusting agent to filter relevance from keywords
