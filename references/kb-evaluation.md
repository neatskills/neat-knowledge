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
