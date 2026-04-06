# Neat Knowledge

Pure markdown knowledge base for any agent. 80-90% context savings through progressive disclosure: load summaries
first, extract sections on demand.

Ingest web pages, PDFs, Office docs, ZIP archives, images, and text into searchable markdown with AI-generated
summaries and two-layer security checks.

## Features

**Progressive Disclosure** - Summaries first (~1-3K tokens), sections on demand, source references  
**Three Query Modes** - Search (AI-ranked), Ask (deep research), Extract (structured JSON)  
**Universal Ingest** - Web, PDF, Word, Excel, ZIP, images, text with security scanning  
**Two KB Types** - Personal (full content) or Project (source references)  
**AI Clustering** - Group related docs by theme (10+ documents)

## Skills

- **neat-knowledge-ingest** - Convert content to markdown with security checks, auto-index
- **neat-knowledge-query** - Search, ask questions, or extract structured data
- **neat-knowledge-rebuild** - Cluster documents by shared themes (run after 10+ docs)

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
# Ingest content
/neat-knowledge-ingest https://example.com/article
/neat-knowledge-ingest ~/Downloads/document.pdf
/neat-knowledge-ingest ~/Downloads/files.zip  # Batch processing

# Query
/neat-knowledge-query search "keyword"                          # Fast AI-ranked search
/neat-knowledge-query ask "research question"                   # Deep research mode
/neat-knowledge-query extract "auth" --sections Introduction    # Structured JSON
/neat-knowledge-query extract "security" --summary-only         # Summaries only

# Cluster (after 10+ docs)
/neat-knowledge-rebuild
```

## KB Types

**Personal KB** (`./knowledge/`) - Full content stored in KB  
**Project KB** (`./docs/*/`) - Summaries in `.index/`, content at source paths. Automatic recovery if source files
are moved or renamed. Efficient caching for non-markdown sources (PDF, Word, Excel).

Both use `.index/summaries.json` for search and `.index/clusters/` for thematic grouping.

See [references/kb-structure.md](references/kb-structure.md), [references/kb-schema.md](references/kb-schema.md),
[references/kb-caching.md](references/kb-caching.md), and [references/kb-recovery.md](references/kb-recovery.md).

## Security & Limitations

**Two-layer security:** Filename patterns + content scanning for API keys, passwords, credentials  
**No known vulnerabilities** - See [SECURITY.md](SECURITY.md)

**Limits:** Static HTML only (no JS-heavy SPAs), .docx only (no legacy .doc), nested ZIP skipped, complex images may
extract poorly

## License

MIT - [LICENSE](LICENSE) - Issues and PRs welcome
