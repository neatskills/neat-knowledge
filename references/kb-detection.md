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

  ```json
  {
    "kb_type": "project" or "personal",
    "document_count": 0,
    "last_updated": "<ISO-8601 timestamp>",
    "categories": {},
    "tags": {}
  }
  ```

Store detected path as `KB_PATH` for all operations.

## metadata.json Recovery

**If metadata.json missing but summaries.json exists:**

This indicates an existing KB with corrupted or deleted metadata. Recover by:

1. Default `kb_type` to `"personal"` (backward compatibility)
2. Regenerate metadata.json by reading summaries.json:
   - Count documents in `documents` object
   - Extract categories from each document's `category` field
   - Extract tags from each document's `tags` array
   - Set `last_updated` to current timestamp
3. Write metadata.json with recovered data
4. Log: "Recovered metadata.json from summaries.json (kb_type: personal)"
5. Continue with operation

**If both metadata.json and summaries.json missing:**

No KB exists at this path. Error: "No knowledge base found. Run /neat-knowledge-ingest to create one."

## kb_type Field Fallback

**If metadata.json exists but `kb_type` field missing or invalid:**

1. Default to `"personal"` (backward compatibility)
2. Update metadata.json to include `kb_type: "personal"`
3. Log: "kb_type field missing, defaulting to personal KB"
4. Continue with operation

Valid values: `"personal"` or `"project"` (case-sensitive)
