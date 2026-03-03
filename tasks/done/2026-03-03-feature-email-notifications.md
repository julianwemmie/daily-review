---
status: done
type: feature
created: 2026-03-03
---

# Email notifications

Re-engagement email nudges for inactive users, sent via Resend and scheduled with node-cron on the Express server.

## Decisions

- **Purpose**: Re-engagement nudge (not daily reminders). Only email users who haven't reviewed recently.
- **Trigger**: 1 day of inactivity
- **Cadence**: Escalating gaps — nudge at 1 day, then 3 days, then 7 days, then 14 days, then stop
- **Tone**: Minimal & informational. "You have X cards for review" with a link. No commands like "Review now."
- **Email provider**: Resend (3,000 emails/mo free tier, React-friendly, easy setup)
- **Scheduling**: `node-cron` in the Express server — daily job queries for inactive users and sends via Resend API
- **User preferences**: Simple on/off toggle in the profile dropdown menu
- **Unsubscribe**: One-click unsubscribe link in the email footer (CAN-SPAM compliant, no login required)

## Implementation notes

- Add `email_notifications_enabled` (default true) and `last_review_at` columns to users table
- Add `email_nudges_sent` table to track escalating gap logic (user_id, sent_at, gap_level)
- node-cron job runs once daily, queries users where `last_review_at` < threshold and notifications enabled
- Resend SDK sends from a verified domain
- Profile dropdown gets a "Notifications" toggle
- Unsubscribe link hits an API endpoint with a signed token to opt out without login
