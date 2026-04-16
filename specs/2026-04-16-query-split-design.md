# Split neat-knowledge-query into Standalone Skills

**Date:** 2026-04-16  
**Status:** Approved  
**Breaking Change:** Yes

## Overview

Replace monolithic `neat-knowledge-query` skill (with 3 sub-commands) with three focused standalone skills. Each skill serves a distinct use case with clear boundaries.

## Motivation

The current `neat-knowledge-query` combines three different operations:
- **search** - Fast metadata discovery
- **ask** - Interactive research with synthesis
- **extract** - Automation JSON output

These serve different audiences (users browsing vs users researching vs skills automating) and have different complexity levels. Splitting them improves:
- **Discoverability** - Skill name = action
- **Maintainability** - Change one without touching others
- **Clarity** - Each skill does one thing well

## Architecture

### New Skills

#### 1. neat-knowledge-search
**Purpose:** Fast semantic search returning metadata only

**Invocation:** `/neat-knowledge-search <query>`

**Responsibilities:**
- Detect KB, load index.json
- Keyword filter (title/category/tags, support `category:name`)
- Load rich metadata from category summaries
- Return all matches sorted by relevance (no artificial cap)
- Show practical warning if result set is large (50+)
- Two output modes: user-friendly text or structured JSON (internal)

**Output (user mode):**
```
[auth-patterns.md] Authentication Patterns (security)
  Overview: Comprehensive guide to JWT, OAuth2...
  Sections: Introduction (150), JWT Flow (800), OAuth (650)
  Tokens: ~200 summary / ~3.5K full
  Tags: [jwt, oauth, authentication]
```

**Output (internal mode):**
```json
{
  "results": [{
    "filename": "auth-patterns.md",
    "title": "Authentication Patterns",
    "summary": "Brief overview...",
    "category": "security",
    "tags": ["jwt", "oauth"],
    "tokens": {"summary": 200, "full": 3500, "sections": {"Intro": 150, "JWT": 800}},
    "sections": ["Introduction", "JWT Flow"],
    "storage": "embedded",
    "file_path": "security/auth-patterns.md"
  }],
  "total_returned": 1
}
```

**References:** `kb-detection.md`, `kb-schema.md`

**Size:** ~80-100 lines

#### 2. neat-knowledge-ask
**Purpose:** Interactive research with multi-turn conversation

**Invocation:** `/neat-knowledge-ask <question>`

**Responsibilities:**
- Call search (internal mode) to get all keyword matches
- Agent evaluates: filter relevance + decide loading depth
- Load content based on agent decision (summary/sections/full)
- Spawn subagent to synthesize answer with citations
- Track conversation history, cache loaded content
- Support follow-up questions in loop
- Offer to save conversation at end (3+ turns)

**Flow:**
1. Search → Get all keyword matches with metadata (no cap)
2. Agent Evaluation → Filter relevance, decide depth (summary/sections/full)
3. Load Content → Load based on agent decision
4. Synthesize → Spawn subagent with question + content
5. Display → Answer with citations
6. Track → Add to history, cache content, dedupe sources
7. Continue → Ask "Continue? (y/n/question)"

**References:** `kb-detection.md`, `kb-schema.md`, `kb-evaluation.md`, `kb-loading.md`

**Size:** ~120-150 lines

#### 3. neat-knowledge-extract
**Purpose:** Structured JSON extraction for skill automation

**Invocation:** `/neat-knowledge-extract <query>`

**Responsibilities:**
- Call search (internal mode) to get all keyword matches
- Agent evaluates for automation context: filter relevance + decide depth
- Load content based on agent decision
- Return structured JSON with predictable schema

**Output:**
```json
{
  "documents": [{
    "filename": "example.md",
    "title": "Document Title",
    "summary": "Brief...",
    "category": "category-name",
    "tags": ["tag1", "tag2"],
    "storage": "embedded",
    "tokens": {"summary": 150, "full": 3500, "sections": {"Intro": 200}},
    "loaded": "summary",
    "content": "Summary/sections/full based on agent decision"
  }],
  "total": 3,
  "loading_strategy": "summaries",
  "tokens_loaded": 450
}
```

**References:** `kb-detection.md`, `kb-schema.md`, `kb-evaluation.md`, `kb-loading.md`

**Size:** ~100-120 lines

### Shared Reference Files

#### references/kb-loading.md (new)
**Purpose:** Content loading procedures

**Contents:**
- Loading embedded documents (read from KB markdown)
- Loading referenced documents (PDF/Word/Excel/Markdown from source)
- Section extraction (find by heading, extract content)
- Broken link handling (check `broken_link: true`, skip, warn)
- File type conversions (Office via `convert-office.js`)
- Caching strategy

**Size:** ~80-100 lines

#### references/kb-evaluation.md (new)
**Purpose:** Agent-driven evaluation logic

**Contents:**
- Two-part evaluation framework:
  1. **RELEVANCE:** Which docs relevant? (semantic filtering)
  2. **DEPTH:** What depth to load? (summary/sections/full)
- Prompt templates for agent evaluation
- Context differences: ask (research) vs extract (automation)
- Examples with reasoning
- Token cost ROI considerations

**Key principle:** Agent sees all keyword matches with full metadata (summary, sections, token costs), makes explicit two-part decision. No system pre-filtering or artificial caps.

**Size:** ~60-80 lines

#### Existing references (unchanged)
- `references/kb-detection.md` - KB path detection
- `references/kb-schema.md` - Index structure, loading procedures
- `references/kb-recovery.md` - Broken link recovery

## Directory Structure

### Before
```
neat-knowledge/
  neat-knowledge-query/
    SKILL.md (400+ lines with 3 sub-commands)
  neat-knowledge-ingest/
  neat-knowledge-rebuild/
  references/
    kb-detection.md
    kb-schema.md
    kb-recovery.md
```

### After
```
neat-knowledge/
  neat-knowledge-search/
    SKILL.md (~80-100 lines)
  neat-knowledge-ask/
    SKILL.md (~120-150 lines)
  neat-knowledge-extract/
    SKILL.md (~100-120 lines)
  neat-knowledge-ingest/
  neat-knowledge-rebuild/
  references/
    kb-detection.md
    kb-schema.md
    kb-recovery.md
    kb-loading.md (new, ~80-100 lines)
    kb-evaluation.md (new, ~60-80 lines)
```

## Implementation Plan

### Files to Create
1. `neat-knowledge-search/SKILL.md` - Search skill
2. `neat-knowledge-ask/SKILL.md` - Ask skill
3. `neat-knowledge-extract/SKILL.md` - Extract skill
4. `references/kb-loading.md` - Loading procedures
5. `references/kb-evaluation.md` - Agent evaluation logic

### Files to Delete
1. `neat-knowledge-query/SKILL.md`
2. `neat-knowledge-query/` directory (entire)

### Files to Update
1. `README.md` - Replace query references with three new skills
2. `scripts/manage-skills.sh` - Update symlink management for new skill names

### Symlink Changes
**Delete:**
- `~/.claude/skills/neat-knowledge-query`

**Create:**
- `~/.claude/skills/neat-knowledge-search`
- `~/.claude/skills/neat-knowledge-ask`
- `~/.claude/skills/neat-knowledge-extract`

## Testing Checklist

1. **neat-knowledge-search**
   - KB detection works
   - Keyword matching returns all matches (no cap)
   - Shows warning for large result sets (50+)
   - User mode displays readable format with token costs
   - Internal mode returns structured JSON
   - Handles missing KB gracefully

2. **neat-knowledge-ask**
   - Search integration works (internal mode)
   - Agent evaluation filters relevance correctly
   - Agent decides appropriate loading depth
   - Content loads correctly (embedded/referenced/sections)
   - Synthesis produces answer with citations
   - Follow-up questions work
   - History tracking and caching work

3. **neat-knowledge-extract**
   - Search integration works (internal mode)
   - Agent evaluation for automation context works
   - Returns valid JSON with correct schema
   - Handles broken links with warnings

4. **Cross-cutting**
   - All skills handle missing KB gracefully
   - All skills handle broken referenced links properly
   - Reference files are properly used by all skills
   - Symlinks install/uninstall correctly via manage-skills.sh

## Breaking Changes

### User Impact
- `/neat-knowledge-query search X` → `/neat-knowledge-search X`
- `/neat-knowledge-query ask X` → `/neat-knowledge-ask X`
- `/neat-knowledge-query extract X` → `/neat-knowledge-extract X`

### Migration Path
None provided. Users must:
1. Run `./scripts/manage-skills.sh uninstall` (removes old symlink)
2. Pull latest changes
3. Run `./scripts/manage-skills.sh install` (creates new symlinks)

Early-stage project, breaking changes acceptable.

## Design Decisions

### Why no result cap?
Trust the agent to handle any result set size. Keyword matching already narrows results. If 87 docs match, the agent should see all 87 and decide which are relevant. Artificial caps risk cutting off relevant docs. A practical warning for large sets (50+) helps users refine searches if needed.

### Why no "score" field in extract output?
Results are already sorted by relevance. Agent filters based on semantic understanding, not numeric thresholds. Score adds complexity without clear value.

### Why split instead of keeping query as dispatcher?
The three operations serve genuinely different use cases:
- Search: Users exploring/browsing
- Ask: Users needing answers
- Extract: Skills needing data

Different audiences, different output formats, different complexity. Splitting improves clarity and discoverability.

### Why agent-driven evaluation instead of system filtering?
Progressive disclosure principle: show agents what's available (with costs), let them decide. No pre-filtering, no artificial caps. Agent controls both relevance and depth for optimal ROI.

## Success Criteria

1. Each skill has single, clear responsibility
2. Shared logic properly extracted to references
3. Skills are 60-75% shorter than original monolithic version
4. All tests pass
5. README accurately reflects new structure
6. Symlink management works correctly
