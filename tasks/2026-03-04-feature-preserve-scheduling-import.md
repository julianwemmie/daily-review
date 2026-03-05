---
status: open
type: feature
created: 2026-03-04
---

# Implement preserve scheduling on import

Make the "Preserve scheduling data" toggle in the import modal actually work. Currently the checkbox is disabled with a "coming soon" label. When enabled, imported cards should have their source scheduling data (interval, ease factor, reps, lapses) mapped to FSRS parameters instead of starting fresh as new cards. This requires:

- A new API endpoint or extension to batch-create that accepts scheduling overrides
- Mapping Anki's SM-2 parameters (interval, ease factor, reps, lapses) to FSRS (stability, difficulty, state, due)
- Mapping Mochi's review history (interval, remembered?) to approximate FSRS parameters
- Imported cards with preserved scheduling should skip triaging and go straight to active status
