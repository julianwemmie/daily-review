import cron from "node-cron";
import crypto from "crypto";
import type { Express } from "express";
import { Resend } from "resend";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DbProvider } from "./db/db-provider.js";

// ---------------------------------------------------------------------------
// Escalating gap levels (in days of inactivity)
// ---------------------------------------------------------------------------
const GAP_LEVELS = [
  { level: 1, daysInactive: 1 },
  { level: 2, daysInactive: 3 },
  { level: 3, daysInactive: 7 },
  { level: 4, daysInactive: 14 },
] as const;

const APP_URL = process.env.VITE_APP_URL || "http://localhost:3000";
const UNSUBSCRIBE_SECRET = process.env.RESEND_UNSUBSCRIBE_SECRET || "change-me-in-production";
const RESEND_FROM = process.env.RESEND_FROM || "Daily Review <notifications@dailyreview.app>";

// ---------------------------------------------------------------------------
// Unsubscribe token helpers (HMAC-signed)
// ---------------------------------------------------------------------------
export function createUnsubscribeToken(userId: string): string {
  const hmac = crypto.createHmac("sha256", UNSUBSCRIBE_SECRET);
  hmac.update(userId);
  const signature = hmac.digest("hex");
  // base64url-encode "userId:signature"
  return Buffer.from(`${userId}:${signature}`).toString("base64url");
}

export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const colonIdx = decoded.indexOf(":");
    if (colonIdx === -1) return null;

    const userId = decoded.slice(0, colonIdx);
    const signature = decoded.slice(colonIdx + 1);

    const hmac = crypto.createHmac("sha256", UNSUBSCRIBE_SECRET);
    hmac.update(userId);
    const expected = hmac.digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }

    return userId;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Email HTML builder
// ---------------------------------------------------------------------------
function buildEmailHtml(dueCount: number, unsubscribeUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;padding:32px;">
        <tr><td>
          <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#111827;">Daily Review</h2>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;">
            You have <strong>${dueCount}</strong> card${dueCount !== 1 ? "s" : ""} waiting for review.
          </p>
          <a href="${APP_URL}/review"
             style="display:inline-block;padding:10px 20px;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">
            Open Daily Review
          </a>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">
        <a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a> from these notifications.
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Core cron logic
// ---------------------------------------------------------------------------
async function processEmailNudges(supabase: SupabaseClient, resend: Resend) {
  const now = new Date();

  // 1. Fetch all users with notifications enabled who have been inactive ≥ 1 day
  const minThreshold = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const { data: users, error: usersErr } = await supabase
    .from("user")
    .select("id, email, last_review_at")
    .eq("email_notifications_enabled", true)
    .or(`last_review_at.is.null,last_review_at.lt.${minThreshold.toISOString()}`);

  if (usersErr) {
    console.error("[email-nudges] Error querying users:", usersErr);
    return;
  }
  if (!users?.length) return;

  const userIds = users.map(u => u.id);

  // 2. Batch-fetch all existing nudge records for these users
  const { data: allNudges, error: nudgesErr } = await supabase
    .from("email_nudges_sent")
    .select("user_id, gap_level")
    .in("user_id", userIds);

  if (nudgesErr) {
    console.error("[email-nudges] Error fetching nudge history:", nudgesErr);
    return;
  }

  // Build map: userId → highest gap_level already sent
  const nudgeMap = new Map<string, number>();
  for (const nudge of allNudges ?? []) {
    const current = nudgeMap.get(nudge.user_id) ?? 0;
    nudgeMap.set(nudge.user_id, Math.max(current, nudge.gap_level));
  }

  // 3. Determine the single next nudge for each user
  for (const user of users) {
    const highestSentLevel = nudgeMap.get(user.id) ?? 0;
    const nextLevel = highestSentLevel + 1;

    const gapConfig = GAP_LEVELS.find(g => g.level === nextLevel);
    if (!gapConfig) continue; // All levels exhausted

    // Check if user has been inactive long enough for this level
    const threshold = new Date(now.getTime() - gapConfig.daysInactive * 24 * 60 * 60 * 1000);
    const lastReview = user.last_review_at ? new Date(user.last_review_at) : null;
    if (lastReview && lastReview >= threshold) continue;

    // Count due cards (only for users passing all filters)
    const { count: dueCount, error: countErr } = await supabase
      .from("cards")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "active")
      .lte("due", now.toISOString());

    if (countErr) {
      console.error(`[email-nudges] Error counting due cards for user ${user.id}:`, countErr);
      continue;
    }
    if (!dueCount || dueCount === 0) continue;

    const unsubToken = createUnsubscribeToken(user.id);
    const unsubscribeUrl = `${APP_URL}/api/unsubscribe?token=${unsubToken}`;

    try {
      await resend.emails.send({
        from: RESEND_FROM,
        to: user.email,
        subject: `You have ${dueCount} card${dueCount !== 1 ? "s" : ""} for review`,
        html: buildEmailHtml(dueCount, unsubscribeUrl),
      });

      const { error: insertErr } = await supabase.from("email_nudges_sent").insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        gap_level: nextLevel,
      });

      if (insertErr) {
        console.error(`[email-nudges] Error recording nudge for user ${user.id}:`, insertErr);
      } else {
        console.log(`[email-nudges] Sent level-${nextLevel} nudge to ${user.email} (${dueCount} due cards)`);
      }
    } catch (err) {
      console.error(`[email-nudges] Failed to send email to ${user.email}:`, err);
    }
  }
}

// ---------------------------------------------------------------------------
// Public API: mount unauthenticated unsubscribe route
// ---------------------------------------------------------------------------
export function mountUnsubscribeRoute(app: Express, db: DbProvider): void {
  app.get("/api/unsubscribe", async (req, res) => {
    const token = req.query.token;
    if (typeof token !== "string" || !token) {
      res.status(400).send("Missing or invalid token.");
      return;
    }

    const userId = verifyUnsubscribeToken(token);
    if (!userId) {
      res.status(400).send("Invalid or expired unsubscribe link.");
      return;
    }

    try {
      await db.setEmailNotificationsEnabled(userId, false);
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Unsubscribed</title></head>
        <body style="margin:0;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;text-align:center;">
          <h2 style="color:#111827;">Unsubscribed</h2>
          <p style="color:#374151;">You have been unsubscribed from Daily Review email notifications.</p>
          <p style="color:#6b7280;font-size:14px;">You can re-enable notifications from your profile settings at any time.</p>
        </body>
        </html>
      `);
    } catch (err) {
      console.error("Unsubscribe error:", err);
      res.status(500).send("Something went wrong. Please try again.");
    }
  });
}

// ---------------------------------------------------------------------------
// Public API: start the daily cron
// ---------------------------------------------------------------------------
export function startEmailNotificationCron(): void {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.log("[email-nudges] RESEND_API_KEY not set — skipping email notification cron");
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.log("[email-nudges] Supabase env vars not set — skipping email notification cron");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const resend = new Resend(resendApiKey);

  // Run daily at 9:00 AM UTC
  cron.schedule("0 9 * * *", async () => {
    console.log("[email-nudges] Running daily email nudge check...");
    try {
      await processEmailNudges(supabase, resend);
      console.log("[email-nudges] Daily check complete.");
    } catch (err) {
      console.error("[email-nudges] Unexpected error in cron job:", err);
    }
  });

  console.log("[email-nudges] Cron job scheduled (daily at 09:00 UTC)");
}
