---
name: neat-knowledge-rebuild
description: Use when optimizing KB - redesigns categories, detects patterns in captures for consolidation, archives stale captures, validates source links
---

# Knowledge Base Rebuild

**Role:** You are a data architect who optimizes category structures, identifies patterns across team captures, and maintains KB health — producing an optimized category structure and consolidated captures.

## Overview

Comprehensive KB maintenance: optimizes categories via AI analysis, detects capture patterns for consolidation, archives stale captures, validates source links.

**Usage:** `/neat-knowledge-rebuild`

## When to Use

**Run when:** Categories messy, KB grown significantly, 10+ related captures, captures 6+mo old, periodic maintenance, validate sources needed.

**Skip when:** Categories organized, KB <20 docs, just added 1-2 docs, captures <5 per topic, all captures recent (<3mo).

## Configuration

### Workspace

- **`<self-path>`:** — canonical, symlink-free path of this skill's own directory; use for `references/` lookups.

## Prerequisites

KB with documents (regenerates .index/ if needed)

## Phase 1: Rebuild

**Step 1 — Detect KB:** Follow [KB Detection](../references/kb-detection.md). If none: error "No KB found. Run /neat-knowledge-ingest"

**If KB exists but index files missing/corrupt:**

Glob `{KB_PATH}/**/*.md` (exclude `.index/`), check integrity of index.json, metadata.json, summaries/.

If markdown exists and index missing/corrupt:

- Show: "KB at {KB_PATH} has {count} files but index files missing/corrupt."
- Ask: "Regenerate all index files? [y/n] (default: y)"
- `y`: Continue to Step 2 (auto-regenerate)
- `n`: Error "Cannot proceed without valid index. Run /neat-knowledge-ingest"

If no markdown: Error "KB empty. Run /neat-knowledge-ingest"

**Step 2 — Regenerate Index Files (Optional):** User controls regeneration. **If auto-triggered from Step 1:** Skip prompts, regenerate both.

Follow [KB Schema](../references/kb-schema.md).

**Index/metadata:**

```
Regenerate index.json and metadata.json? [y/n] (default: n)
```

If `y`: Scan markdown, parse frontmatter, build and write index.json/metadata.json. Log: "Regenerated index.json ({count} docs) and metadata.json"

**Summaries:**

```
Regenerate all category summaries? [y/n] (default: n)
```

If `y`: Scan KB, group by category, extract sections, write `.index/summaries/{category}.json`, delete orphaned. Log: "Regenerated {category_count} summaries covering {document_count} docs"

**Errors:** No markdown, invalid KB_PATH, or write failures exit without partial updates.

**Step 3 — Analyze KB Content:** Load index/summaries, log "Analyzing {count} documents across {cat_count} categories..."

**Step 4 — Design Category Structure:** AI designs structure targeting 5-15 categories. JSON: `{proposed_categories, reasoning, major_changes, document_assignments}`. Show "Analyzing...", proceed to Step 5.

**Step 5 — Show Optimization Plan:** Present per [rebuild-templates.md](references/rebuild-templates.md#step-5--optimization-plan) — current/proposed category counts, new structure with reasoning and reassignment counts, examples. Ask to apply.

If `n`: Skip to Step 7

**Step 6 — Execute Optimization:** Per document: Move file if embedded (update frontmatter), update summaries/index.json (batch, atomic). After all: Update metadata.json, delete empty folders.

Log: "Optimization complete: Categories {old}→{new}, Reassigned {count}/{total}"

**Step 7 — Validate Sources (Referenced Only):** Follow [KB Recovery](../references/kb-recovery.md). Skip if no referenced docs or `broken_link: true`.

Validate with Read, recover via glob/AI match, auto-fix found, prompt for ambiguous/not_found, recompute metadata. Show summary.

**Step 8 — Capture Pattern Detection (Optional):** Only if captures/ category exists.

```
Analyze captures for patterns and consolidation? [y/n] (default: n)
```

If `y`:

**Cluster:** Group by type/tech tags, calculate Jaccard similarity, cluster if ≥3 captures with >50% overlap.

**Analyze:** Read cluster content, identify themes, skip if too different or too recent (<1 month).

**Present:** Per [rebuild-templates.md](references/rebuild-templates.md#step-8--pattern-detection-results) — list each consolidation opportunity (capture count, type, destination), offer consolidate-all/review-each/skip.

**If r:** Show each cluster with options: v=View, y=Consolidate, n=Skip

**Step 9 — Execute Consolidation:** For each cluster:

**Generate:** Spawn subagent to create consolidated capture. Determine procedural (workflows=true, solutions=false). Synthesize patterns, preserve approaches, add examples, include team recommendation. For workflows: add steps/code/variations, note "/writing-skills automation candidate".

**Save:** `{KB_PATH}/captures/{type}/{filename}.md`. Frontmatter per [rebuild-templates.md](references/rebuild-templates.md#step-9--consolidated-capture-frontmatter) (category, type, title, tags, summary, date, `synthesized_from` list, contributors, procedural flag). Include History section. Create dir if needed.

**Review:** Per [rebuild-templates.md](references/rebuild-templates.md#step-9--consolidation-review) — show the created file and first 500 chars, offer view/approve-delete-sources/keep-specific/cancel.

**If k:** List captures, prompt for numbers, confirm deletion subset.

**Delete:** Remove files, update index/summaries/metadata (decrement by deleted-1), log.

**Log:** "Created captures/{type}/{filename}.md from {count} captures ({kept} kept)"

**After all:**

```
Consolidation complete!
Created: 2 guides from 9 captures
Net: 7 fewer captures
Workflow automations: Use /writing-skills
```

**Step 10 — Capture Cleanup (Optional):** Only if captures/ exists.

```
Review stale captures for cleanup? [y/n] (default: n)
```

If `y`:

Categorize: Active (<6mo), Aging (6-12mo), Stale (12+mo). Report per [rebuild-templates.md](references/rebuild-templates.md#step-10--capture-cleanup-report) — totals by category, list of stale captures with age and reason, offer delete-all/review-each/keep-all/view-details.

**If r:** Show each with d/k/v options, execute after review.

**Execute:** Remove files, update indexes/metadata, log.

```
Cleanup complete!
Deleted: 5 stale captures (in git history)
Active: 40 remaining
```

**Step 11 — Complete:** "Rebuild complete! Categories {old}→{new} ({reassigned} docs), Sources: {validated}/{fixed}/{broken}, Captures: {consolidated} patterns ({deleted} deleted, {kept} kept), {stale_deleted} stale deleted"

Done.

## Category Design Principles

Content-driven, 5-15 categories, clear boundaries, user discoverability.

## Common Mistakes

Running when categories good, too frequently, on tiny KBs, manually moving files.
