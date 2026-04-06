# KB Detection Logic

Check convention paths in order for `.index/summaries.json`:

1. Check `./docs/knowledge/`
2. Check `./knowledge/`
3. Check `./`

**If multiple found:**

- Show list: `[1] ./docs/knowledge/ (45 documents)`, `[2] ./knowledge/ (12 documents)`
- Prompt: "Multiple KBs found. Choose [1-N]:"
- Use selected KB

**If none found:**

- Prompt: "Create KB at [1] ./docs/knowledge/ or [2] ./knowledge/? [1-2]:"
- Create at chosen location
- Prompt: "Is this a project KB (fixed structure) or personal KB? [project/personal]:"
- Create `.index/` directory
- Create `metadata.json` with initial structure:

  **Personal KB:**

  ```json
  {
    "kb_type": "personal",
    "document_count": 0,
    "last_updated": "<ISO-8601 timestamp>",
    "categories": {},
    "tags": {}
  }
  ```

  **Project KB:**

  ```json
  {
    "kb_type": "project",
    "source_root": "<absolute path to project root>",
    "document_count": 0,
    "last_updated": "<ISO-8601 timestamp>",
    "categories": {},
    "tags": {}
  }
  ```

  `source_root` for Project KB: absolute path where source documents are located (usually project root). Used for
  source link recovery. Example: `/Users/ji/project/`

Store detected path as `KB_PATH` for all operations.

## metadata.json Recovery

**If metadata.json missing but summaries.json exists:**

This indicates an existing KB with corrupted or deleted metadata. Recover by:

1. Detect KB type:
   - Check first document for `source` field
   - If has source → Project KB, else → Personal KB
2. Regenerate metadata.json by reading summaries.json:
   - Count documents in `documents` object
   - Extract categories from each document's `category` field
   - Extract tags from each document's `tags` array
   - Set `last_updated` to current timestamp
   - **Project KB only:** Set `source_root` to current working directory (can be updated later)
3. Write metadata.json with recovered data
4. Log: "Recovered metadata.json from summaries.json (kb_type: {type})"
5. Continue with operation

**If both metadata.json and summaries.json missing:**

No KB exists at this path. Error: "No knowledge base found. Run /neat-knowledge-ingest to create one."

## Field Fallbacks

**If metadata.json exists but `kb_type` field missing or invalid:**

1. Default to `"personal"` (backward compatibility)
2. Update metadata.json to include `kb_type: "personal"`
3. Log: "kb_type field missing, defaulting to personal KB"
4. Continue with operation

Valid values: `"personal"` or `"project"` (case-sensitive)

**If metadata.json has `kb_type: "project"` but `source_root` field missing:**

1. Default to current working directory
2. Update metadata.json to include `source_root: process.cwd()`
3. Log: "source_root field missing, defaulting to: {cwd}"
4. Continue with operation

User can manually update source_root in metadata.json if needed.
