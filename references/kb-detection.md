# KB Detection

Check convention paths in order for `.index/index.json`:

1. `./docs/knowledge/`
2. `./knowledge/`
3. `./`

**If multiple found:**

Show list with document counts from each `metadata.json`:

```
Multiple KBs found. Choose:
[1] ./docs/knowledge/ (45 documents)
[2] ./knowledge/ (12 documents)
[1-2]:
```

Use selected KB path.

**If none found:**

Prompt to create new KB:

```
Create KB at:
[1] ./docs/knowledge/
[2] ./knowledge/
[1-2]:
```

At chosen location, create:

- `.index/` directory
- `.index/summaries/` directory (stores per-category summary files)
- `.index/metadata.json` (see [KB Schema](kb-schema.md) for structure)

Initialize metadata.json:

```json
{
  "source_root": "<absolute path to project root>",
  "document_count": 0,
  "categories": {},
  "tags": {}
}
```

`source_root`: Absolute path where source documents are located (usually project root). Used for source link recovery when documents use referenced storage. Example: `/Users/ji/project/`

Store detected path as `KB_PATH` for all operations.
