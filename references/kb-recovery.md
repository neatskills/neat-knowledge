# KB Recovery

KB regeneration and source link recovery.

## KB Regeneration

Regenerates index files when corrupted/missing or after manual document changes.

### Regeneration Process

**If index.json exists:**

1. Use index for document locations
2. Read docs (embedded from KB, referenced from source)
3. AI extracts metadata
4. Write summaries, index, metadata

**If index.json missing:**

1. Glob `{KB_PATH}/**/*.md` (exclude `.index/`)
2. Read, AI extract, write
3. Warning: Referenced docs lost

### Auto-Recovery: metadata.json Only

**When:** Only metadata.json missing, index/summaries valid

**Behavior:** Silent auto-recovery (derivative data, no loss risk)

**Process:** Regenerate from index, set source_root to cwd, log, continue

**Note:** Full regeneration requires user confirmation via rebuild

## Source Link Recovery

Finds moved/renamed files for referenced documents.

**Triggers:** Read fails (ask/extract) or batch validation (rebuild)

### Algorithm

**Step 1:** Load `source_root` from metadata.json

**Step 2:** Glob supported files from source_root (\*.md, \*.pdf, \*.docx, \*.xlsx; exclude node_modules/, .git/, dist/, build/, .next/, out/)

**Step 3:** Compare against index to identify un-ingested files

**Step 4:** AI matches broken links using filename similarity, folder structure, title hints, un-ingested status

Results: `{found: true, path, status}`, `{ambiguous: true, candidates}`, or `{not_found: true}`

### Handling Results

| Result       | Action                                              |
|--------------|-----------------------------------------------------|
| **found**    | Update source, remove broken_link, log auto-fix     |
| **ambiguous**| Prompt user to choose from candidates or skip       |
| **not_found**| Prompt: mark broken, provide path, or remove        |

### Document Loading After Recovery

.md/.pdf via Read tool, .docx/.xlsx via `convert-office.js`
