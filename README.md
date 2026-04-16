# Neat Knowledge

Pure markdown knowledge base with agent-driven progressive disclosure. Intelligent agents see what's available (with costs), decide what to load, and optimize for ROI. Inspired by Claude-Mem principles.

Ingest web pages, PDFs, Office docs, images, and text into searchable markdown with AI-generated summaries and
two-layer security checks.

## Features

**Agent-Driven Progressive Disclosure** - Full agent autonomy through visible metadata. Agents see keyword matches with summaries, sections, token costs, then filter relevance AND decide loading depth. No system pre-filtering—agents control everything.

**Three Query Modes:**

- **Search** - Keyword matching with rich metadata (summaries, token costs, sections) for agent evaluation
- **Ask** - Deep research where agents filter relevant docs and progressively load content based on question depth
- **Extract** - Skill automation where agents filter relevance and optimize content loading for ROI

**Universal Ingest** - Web, PDF, Word, Excel, images, text with security scanning  
**Two Storage Modes** - Embedded (full content) or Referenced (on-demand loading)  
**Category Optimization** - AI analyzes all documents to optimize category structure, validates source links

## Skills

- **neat-knowledge-ingest** - Convert content to markdown with security checks, auto-index
- **neat-knowledge-search** - Fast keyword search with rich metadata and token costs
- **neat-knowledge-ask** - Interactive research with AI synthesis and follow-ups
- **neat-knowledge-extract** - Structured JSON extraction for automation
- **neat-knowledge-rebuild** - Optimize categories via AI analysis, regenerate index files, validate sources

## Install

```bash
git clone https://github.com/neatskills/neat-knowledge.git
cd neat-knowledge
npm install
./scripts/manage-skills.sh  # Defaults to install
```

To uninstall:

```bash
./scripts/manage-skills.sh uninstall
```

## Usage

```bash
# Ingest content (calculates token costs automatically)
/neat-knowledge-ingest https://example.com/article
/neat-knowledge-ingest ~/Downloads/document.pdf
/neat-knowledge-ingest ~/Downloads/documents/  # Batch processing (directory)

# Query knowledge base
/neat-knowledge-search "keyword"              # Fast search: shows docs, sections, token costs
/neat-knowledge-ask "research question"       # Interactive: agent loads progressively, synthesizes answer
/neat-knowledge-extract "auth patterns"       # Automation: returns structured JSON with optimized loading

# Optimize categories (periodic maintenance)
/neat-knowledge-rebuild
```

## Progressive Disclosure Architecture

Inspired by [Claude-Mem](https://docs.claude-mem.ai/progressive-disclosure), neat-knowledge enables **full agent autonomy through visible metadata**:

### Discovery → Filter Relevance → Decide Depth → Load

1. **Search shows keyword matches (20-30) with rich metadata:**

   ```
   [auth-patterns.md] Authentication Patterns (security)
     Overview: Comprehensive guide to JWT, OAuth2...
     Sections: Introduction (150), JWT Flow (800), OAuth (650)
     Tokens: ~200 summary / ~3.5K full
     Tags: [jwt, oauth, authentication]
   
   [api-design.md] REST API Design Guide (backend)
     Overview: REST API design principles...
     Sections: Design Principles (200), Versioning (400)
     Tokens: ~180 summary / ~4.2K full
     Tags: [rest, api, design]
   ```

2. **Agent filters relevance:**
   - "auth-patterns.md is relevant (JWT content matches query)"
   - "api-design.md is less relevant (API focus, not auth focus)"
   - Filters 20-30 matches → 2-5 relevant docs

3. **Agent evaluates ROI for relevant docs:**
   - "Need JWT details → load JWT Flow section (800 tokens)"
   - "Just need overview → load summary only (200 tokens)"
   - "Deep investigation → load full doc (3.5K tokens)"

4. **Load selectively based on relevance + task needs**

**Result:** 80-90% context savings through agent-driven filtering AND loading, not system prescription. Agent controls both relevance and depth.

## Storage Modes

Documents can use **embedded** (full content in KB) or **referenced** (content at source path, loaded on-demand) storage.

- **Embedded**: Web content, images, or user choice for local files - full content stored as markdown in KB
- **Referenced**: Local files only - summaries in KB, content loaded on-demand from source path
- **Automatic recovery** if source files are moved or renamed (referenced storage only)

All KBs use `.index/index.json` for fast search, `.index/summaries/{category}.json` for detailed metadata with token counts, and `metadata.json` for category organization.

See [references/kb-schema.md](references/kb-schema.md), [references/kb-detection.md](references/kb-detection.md),
and [references/kb-recovery.md](references/kb-recovery.md).

## Security & Limitations

**Two-layer security:** Filename patterns + content scanning for API keys, passwords, credentials  
**No known vulnerabilities** - See [SECURITY.md](SECURITY.md)

**Limits:** Static HTML only (no JS-heavy SPAs), .docx only (no legacy .doc), complex images may extract poorly

## License

MIT - [LICENSE](LICENSE) - Issues and PRs welcome
