# Neat Knowledge

Build and query your personal knowledge base with Claude Code. Convert web pages, PDFs, Office documents,
ZIP archives, images, and text into searchable markdown with automatic analysis and categorization.

## Skills

**neat-knowledge-ingest** - Converts content (web/PDF/Word/Excel/ZIP/images/text) to structured markdown
with security warnings and automatic indexing. Generates generic summaries with automatic SDD optimization when patterns detected.

**neat-knowledge-query** - Three modes: **search** for fast keyword lookups, **ask** for deep research with synthesis, **extract** for structured JSON data extraction (skill-to-skill calls with progressive disclosure)

**neat-knowledge-rebuild** - Groups related documents by shared themes (both personal and project KBs, run after adding 10+ documents)

## Features

**Ingest:** Web pages, PDF, Word (.docx), Excel, ZIP archives (batch), images, text  
**Security:** Two-layer content warnings (filename + analysis)  
**Analysis:** Auto-generated summaries with generic structure, SDD-optimized when patterns detected  
**Search:** Fast keyword lookups across all metadata  
**Research:** Interactive Q&A with progressive source loading and synthesis  
**Extract:** Structured JSON extraction with section-level caching (80-90% context savings)  
**Project KB:** Progressive disclosure with source references, auto-detects SDD patterns (L0-L6 layers, investigations, features, ADRs)  
**Clustering:** AI-grouped related documents with theme overviews (both personal and project KBs)

## Quick Start

**Install:**

```bash
git clone https://github.com/neatskills/neat-knowledge.git
cd neat-knowledge
npm install
./scripts/install.sh
```

**Setup Chrome MCP (for web import):**

```bash
npm install -g @modelcontextprotocol/server-puppeteer
```

Add to `~/.claude/config.json`:

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    }
  }
}
```

Restart Claude Code after adding.

**Usage:**

```bash
# Ingest content
/neat-knowledge-ingest https://example.com/article
/neat-knowledge-ingest ~/Downloads/document.pdf
/neat-knowledge-ingest ~/Downloads/files.zip

# Query knowledge (human interaction)
/neat-knowledge-query search "keyword"
/neat-knowledge-query ask "research question"

# Extract structured data (skill-to-skill calls)
/neat-knowledge-query extract "authentication" --sections Introduction,Architecture --format json
/neat-knowledge-query extract "security" --summary-only --limit 5
/neat-knowledge-query extract "analysis" --filter sdd_type=analysis

# Rebuild clusters (after 10+ documents)
/neat-knowledge-rebuild
```

All skills work with natural language commands.

## Progressive Disclosure (Extract Mode)

**Context savings: 80-90%** through summaries, section extraction, and conversation caching.

**How it works:**

1. Summaries loaded first (~1-3K tokens, cached by Claude)
2. Specific sections extracted on demand (L1, L3 from analysis)
3. Sections cached in conversation memory
4. Future queries reuse cached sections (instant, 0 tokens)

**Example:**

```text
Query 1: extract analysis --sections L1,L3
  → Load summaries + extract L1, L3 = 2K tokens

Query 2: extract analysis --sections L6  
  → L6 from summary cache = instant, 200 tokens

Query 3: extract analysis --sections L4,L5
  → Extract L4, L5 = 1.8K tokens

Total: 4K tokens vs 30K (3x full file loads) = 87% savings
```

## Knowledge Base Structure

Documents are organized in `./knowledge/` by category with metadata and cluster analysis:

```text
./knowledge/
  web-development/
    react-hooks-guide.md          # Content with frontmatter
  .index/
    summaries.json                # Search index and metadata
    clusters/                     # Thematic groupings (personal KB)
```

Each document includes title, tags, category, AI-generated summary, key concepts, and related topics.

See [references/knowledge-structure.md](references/knowledge-structure.md) and
[references/knowledge-schema.md](references/knowledge-schema.md) for details.

## Project Structure

```text
neat-knowledge/
├── neat-knowledge-ingest/        # Ingest skill
├── neat-knowledge-query/         # Query skill
├── neat-knowledge-rebuild/       # Rebuild skill
├── references/                   # Documentation
└── scripts/                      # Install/uninstall
```

## Dependencies

**Required:** Node.js, mammoth, xlsx, sharp  
**Optional:** Chrome MCP (web pages only)

```bash
npm install                       # Install dependencies
npm test                          # Run tests
./scripts/install.sh              # Install skills
./scripts/uninstall.sh            # Remove skills
```

**Security Note:** The xlsx package has known vulnerabilities. Only process Excel files from trusted sources.
See [SECURITY.md](SECURITY.md) for details.

## Limitations

- **Web pages:** Requires Chrome MCP; authenticated content may fail
- **Office files:** Legacy .doc not supported (use .docx)
- **ZIP archives:** Nested archives skipped
- **Images:** Complex/low-quality images may extract poorly

## License

MIT - see [LICENSE](LICENSE)

## Contributing

Issues and pull requests welcome!
