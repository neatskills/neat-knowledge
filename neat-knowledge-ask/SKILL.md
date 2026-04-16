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

Internal mode: return structured JSON instead of formatted text.

Returns all keyword matches with metadata (summary, category, tags, tokens, sections, storage, file_path).

Store results for agent evaluation.

### Step 2: Agent Evaluation

Follow [KB Evaluation](../references/kb-evaluation.md) framework.

Note: You (the executing agent) perform this evaluation.

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

Spawn subagent using Agent tool: "Synthesize answer from knowledge base"

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
    - If yes: Create directory if needed, save to `docs/knowledge/conversations/{timestamp}.md` (format: YYYY-MM-DD-HHmmss)
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
