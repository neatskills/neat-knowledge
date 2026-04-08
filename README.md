# Neat Knowledge

Pure markdown knowledge base for any agent. 80-90% context savings through progressive disclosure: load summaries
first, extract sections on demand.

Ingest web pages, PDFs, Office docs, images, and text into searchable markdown with AI-generated summaries and
two-layer security checks.

## Features

**Progressive Disclosure** - Summaries first (~1-3K tokens), sections on demand, source references  
**Three Query Modes** - Search (AI-ranked), Ask (deep research), Extract (structured JSON for automation)  
**Universal Ingest** - Web, PDF, Word, Excel, images, text with security scanning  
**Two Storage Modes** - Embedded (full content) or Referenced (on-demand loading)  
**Category Optimization** - AI analyzes all documents to optimize category structure, validates source links

## Skills

- **neat-knowledge-ingest** - Convert content to markdown with security checks, auto-index
- **neat-knowledge-query** - Search, ask questions, extract data, or browse categories
- **neat-knowledge-rebuild** - Optimize categories via AI analysis, regenerate indexes, validate sources

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
/neat-knowledge-ingest ~/Downloads/documents/  # Batch processing (directory)

# Query
/neat-knowledge-query search "keyword"                          # Fast AI-ranked search
/neat-knowledge-query ask "research question"                   # Deep research mode
/neat-knowledge-query extract "auth" --sections Introduction    # Structured JSON (automation)
/neat-knowledge-query extract "security" --summary-only         # Summaries only (automation)

# Optimize categories (periodic maintenance)
/neat-knowledge-rebuild
```

## Storage Modes

Documents can use **embedded** (full content in KB) or **referenced** (content at source path, loaded on-demand) storage.

- **Embedded**: Web content, images, or user choice for local files - full content stored as markdown in KB
- **Referenced**: Local files only - summaries in KB, content loaded on-demand from source path
- **Automatic recovery** if source files are moved or renamed (referenced storage only)

All KBs use `.index/index.json` for fast search, `.index/summaries/{category}.json` for detailed metadata, and `metadata.json` for category organization.

See [references/kb-schema.md](references/kb-schema.md), [references/kb-detection.md](references/kb-detection.md),
and [references/kb-recovery.md](references/kb-recovery.md).

## Security & Limitations

**Two-layer security:** Filename patterns + content scanning for API keys, passwords, credentials  
**No known vulnerabilities** - See [SECURITY.md](SECURITY.md)

**Limits:** Static HTML only (no JS-heavy SPAs), .docx only (no legacy .doc), complex images may extract poorly

## License

MIT - [LICENSE](LICENSE) - Issues and PRs welcome
