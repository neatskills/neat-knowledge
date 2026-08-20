# Conversation Boundary Detection

Standard procedure for identifying context boundaries when scanning conversation history for capture operations.

## Scanning Algorithm

Scan backward from current message until you find a context boundary.

### Context Boundaries

Stop scanning when you encounter:

- **Topic change** - Different problem or discussion area
- **User focus shift** - User explicitly changed focus or direction
- **Previous capture** - Another capture operation in this session
- **Natural completion** - Unrelated work naturally completed

### Message Limits

- **Minimum:** 10 messages
- **Maximum:** 100 messages
- **Typical:** 20-50 messages

### Analysis Questions

When scanning, identify:

- What activity occurred?
- What was learned or achieved?
- When did this topic start?
- Is this reusable knowledge?

## Example

```
Messages 1-20: Fixed sass build error (DONE)
Messages 21-50: Database design discussion
Message 51: User triggers capture

→ Scan 21-51, stop at message 20 (topic changed)
→ Extract database design decision
```

## Multiple Captures in Session

### Sequential (different topics)

Scan backward until previous capture boundary, extract new topic only.

### Overlapping (multiple types)

If conversation contains multiple capture-worthy types (e.g., both a solution and a workflow), ask user:

"I see both [type A] and [type B]. Capture both separately (recommended), one type only, or cancel?"

### Refinement (recent capture)

If last capture occurred within 10 messages, ask:

"Create new capture, or edit previous in KB directly?"
