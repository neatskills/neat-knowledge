# KB Agent Evaluation

Agent-driven evaluation framework for filtering relevance and deciding loading depth.

Powers ask (research) and extract (automation) skills. Agent decides which documents are relevant and how deeply to load them.

## Quick Reference: Ask vs Extract

- **Ask:** Research queries. Bias toward deeper loading for quality.
- **Extract:** Automation queries. Bias toward summaries for efficiency.

## Two-Part Evaluation

Agent sees all matches, makes explicit decisions:

**RELEVANCE:** Semantic filtering (summary/sections/tags/context) narrows N matches → 2-5 docs

**DEPTH:** Choose loading level:

- Summary: ~200 tokens (overview)
- Sections: ~500-1000 tokens/section (specific details)
- Full: ~3000-8000 tokens (complete context)

Token estimates from category metadata.

## Evaluation Prompt Template

```
Found {N} matches for "{query}":

1. [{filename}] {title} - {category}
   Summary: {text}
   Sections: {names}
   Tokens: {summary} / {full} / sections: {...}
   Tags: [{tags}]

Context: {ask or extract}

Two-part evaluation:
1. RELEVANCE: Which docs relevant? Semantic filter.
2. DEPTH: What depth? Consider token costs vs info needs.

Decision: Which docs + depth for ROI?
```

## Context Differences

**Ask:** Comprehensive answers with citations. Bias toward deeper loading.

**Extract:** Structured data. Bias toward summaries.

## Example Decisions

**Ask - Overview:** "What auth methods?" → Docs 1,3,5 summaries (600 tokens)

**Ask - Technical:** "How JWT validation works?" → Load 'JWT Flow', 'Validation' sections (1.2K)

**Extract - High-level:** "auth methods" → Docs 1,2,4 summaries (540 tokens)

## Token Cost ROI Considerations

**ROI:** (Relevance × Info Density) / Token Cost. Higher = better.

**High ROI:** Relevant + need section → load section; need overview → summary; multiple similar → summaries

**Low ROI:** Marginally relevant → skip; need 1 fact from 8K → try section; have answer → stop

**Progressive:** Summaries (in memory) → sections (targeted) → full (complete). Stop when sufficient.

## Key Principles

**No pre-filtering:** Agent sees all keyword matches, makes all decisions

**No caps:** Agent handles any result size naturally

**Explicit decisions:** State which docs + depth + reasoning

**ROI optimization:** Balance relevance vs cost, progressive loading, stop when sufficient
