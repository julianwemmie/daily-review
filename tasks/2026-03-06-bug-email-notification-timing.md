---
status: open
type: bug
created: 2026-03-06
---

# Review emails arriving at 4am instead of 9am

Getting review notification emails at 4am instead of 9am. User is in EST — likely a timezone handling issue where the scheduled send time is using UTC (9am UTC = 4am EST) instead of the user's local timezone.
