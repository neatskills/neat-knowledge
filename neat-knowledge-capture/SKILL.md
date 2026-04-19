---
name: neat-knowledge-capture
description: Use after solving problems or developing workflows - extracts knowledge from conversation and saves to captures/ (consolidates when 3+ similar exist)
---

# Knowledge Capture

**Role:** You are a technical writer who identifies and extracts reusable knowledge from conversations.

## Prerequisites

- Knowledge base exists (KB Detection prompts if needed)
- `/neat-knowledge-ingest` skill available

## When to Use

After solving problems, fixing bugs, or developing workflows.

**Do NOT use for:**

- Trivial fixes or obvious solutions
- Well-documented information
- One-off environmental issues
- Temporary notes or task progress

## Process

### Step 1: Analyze Conversation

Scan backward from current message until you find a context boundary.

**Context boundaries:**

- Topic change (different problem or discussion)
- User explicitly changed focus
- Previous capture in this session
- Natural completion of unrelated work

**Limits:**

- **Minimum:** 10 messages
- **Maximum:** 100 messages
- **Typical:** 20-50 messages

**Identify:**

- What activity occurred?
- What was learned or achieved?
- When did this topic start?
- Is this reusable knowledge?

**Example:**

```
Messages 1-20: Fixed sass build error (DONE)
Messages 21-50: Database design discussion
Message 51: User triggers capture

→ Scan 21-51, stop at message 20 (topic changed)
→ Extract database design decision
```

**Multiple captures in session:**

**Sequential (different topics):** Scan backward until previous capture boundary, extract new topic.

**Overlapping (multiple types):** Ask user: "I see both a problem-solution and pattern. Capture both separately (recommended), one type only, or cancel?"

**Refinement (recent capture):** If last capture within 10 messages, ask: "Create new capture, or edit previous in KB directly?"

### Step 2: Detect Knowledge Type

**Solution (solutions/):**

- Error fixed, bug solved, issue resolved

**Workflow (workflows/):**

- Effective process identified, efficient approach found

### Step 3: Extract Content

#### For Solution

- **Problem:** What went wrong (one-line + details)
- **Symptoms:** Error messages, unexpected behavior
- **Context:** Tech stack, environment, files
- **Root Cause:** Why it happened
- **Solution:** Steps taken to fix
- **Prevention:** How to avoid in future

#### For Workflow

- **Workflow:** Name/description
- **Steps:** Sequence/process
- **Context:** When to use
- **Benefits:** Why this works well
- **Variations:** Alternative approaches

### Step 4: Format Content

Use templates from `references/` folder:

- `references/solution-template.md`
- `references/workflow-template.md`

Keep content self-contained - readable without conversation context.

### Step 5: Confirm with User

Present preview:

```
I detected: [knowledge-type]

[Show key sections or first 500 chars]

Would you like to save this to your knowledge base?

Options:
  y - Save as-is
  c - Change (modify content)
  n - Cancel
```

**If "y":** Proceed to save

**If "c":** Ask what to change, modify, show updated preview, re-prompt until approved

**If "n":** Cancel and exit

### Step 6: Write to Temp File

Write formatted markdown to `/tmp/kb-capture-{timestamp}.md`.

**Frontmatter fields:**

- `category: captures` - Routes to captures/ category
- `type` - "solutions" or "workflows"
- `date` - YYYY-MM-DD format
- Plus template fields (title, tags, etc.)

### Step 7: Invoke Ingest

Run `/neat-knowledge-ingest /tmp/kb-capture-{timestamp}.md`

Ingest will:

- Detect `category: captures` flag
- Route to captures/{type}/
- Use exact type from frontmatter
- Generate metadata (title, summary, tags)
- Save to captures/{type}/{filename}

### Step 8: Clean Up

Delete temp file after ingest completes.

### Step 9: Confirm to User

```
✓ Knowledge captured!

Type: {type}
Location: captures/{type}/{filename}

Reuse: /neat-knowledge-ask {keywords}
Consolidate: /neat-knowledge-rebuild (when 3+ similar)
```

## Tips for Good Captures

**Be specific:** Include exact error messages, real examples, copy-paste ready commands.

**Explain WHY:** Why it worked, underlying principles, not just what worked.

**Make it self-contained:** Readable later without conversation context, include necessary background.

**Keep it focused:** One piece of knowledge per capture. Multiple topics need separate captures.

## Edge Cases

**Multiple knowledge types:** Ask to capture both separately (recommended) or choose primary type.

**Partial knowledge:** Ask user: "Capture what we have or wait until more is known?" Capture as-is (no validation required).

**User unsure:** Ask "Will this help if you encounter this again?" When in doubt, capture.

## Common Mistakes

**Scanning too few messages** - Always scan minimum 10, typically 20-50.

**Not detecting context boundaries** - Stop at topic changes, time gaps, previous captures.

**Skipping user confirmation** - Always show preview and get approval.

**Missing type validation** - Ingest expects "solutions" or "workflows" exactly.

**Not cleaning temp files** - Delete `/tmp/kb-capture-*` after completion.

**Offering for trivial fixes** - Don't capture obvious solutions or well-documented information.
