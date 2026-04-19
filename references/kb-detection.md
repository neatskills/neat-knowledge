# KB Detection

Ask user for KB location:

```
Enter knowledge base path (e.g., ./knowledge/ or ./docs/kb/):
```

**If path exists and contains `.index/index.json`:**

Load existing KB. Show confirmation:

```
Using existing KB at {path} ({count} documents)
```

Store path as `KB_PATH`.

**If path does not exist or missing `.index/` structure:**

Confirm KB creation:

```
No KB found at {path}. Create new KB here? [y/n]:
```

If yes, create:

- Directory if missing
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

`source_root`: Absolute path where source documents are located (usually project root). Used for source link recovery when documents use referenced storage. Example: `/Users/username/my-project/`

Store path as `KB_PATH` for all operations.
