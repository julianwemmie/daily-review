import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  DbProvider,
  CardEdit,
  SchedulingUpdate,
  ReviewLogInsert,
  CardListFilters,
  DueCardsResult,
  CardCounts,
} from "./db-provider.js";
import type { Card, UserStats, ReviewLog } from "../../shared/types.js";

function rowToCard(row: Record<string, unknown>): Card {
  return {
    ...row,
    tags: row.tags ?? null,
  } as Card;
}

function makeProvider(client: SupabaseClient): DbProvider {
  return {
    async createCards(cards: Card[]): Promise<Card[]> {
      const { data, error } = await client.from("cards").insert(cards).select();
      if (error) throw error;
      return (data ?? []).map(rowToCard);
    },

    async getCardById(id: string, userId: string): Promise<Card | undefined> {
      const { data, error } = await client
        .from("cards")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data ? rowToCard(data) : undefined;
    },

    async listCards(userId: string, filters?: CardListFilters): Promise<Card[]> {
      let query = client
        .from("cards")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.q) {
        // Escape characters that have special meaning in PostgREST filter syntax
        const escaped = filters.q.replace(/[,%()\\]/g, (ch) => `\\${ch}`);
        const pattern = `%${escaped}%`;
        query = query.or(`front.ilike.${pattern},back.ilike.${pattern}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(rowToCard);
    },

    async getDueCards(userId: string, now: string): Promise<DueCardsResult> {
      const { data: dueRows, error: dueErr } = await client
        .from("cards")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .lte("due", now)
        .order("due", { ascending: true });
      if (dueErr) throw dueErr;

      const { data: nextDueRow, error: nextErr } = await client
        .from("cards")
        .select("due")
        .eq("user_id", userId)
        .eq("status", "active")
        .gt("due", now)
        .order("due", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (nextErr) throw nextErr;

      return {
        cards: (dueRows ?? []).map(rowToCard),
        next_due: nextDueRow?.due ?? null,
      };
    },

    async getCounts(userId: string, now: string): Promise<CardCounts> {
      const { count: newCount, error: newErr } = await client
        .from("cards")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "triaging");
      if (newErr) throw newErr;

      const { count: dueCount, error: dueErr } = await client
        .from("cards")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "active")
        .lte("due", now);
      if (dueErr) throw dueErr;

      return { new: newCount ?? 0, due: dueCount ?? 0 };
    },

    async editCard(id: string, userId: string, fields: CardEdit): Promise<Card | undefined> {
      const { data, error } = await client
        .from("cards")
        .update(fields)
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data ? rowToCard(data) : undefined;
    },

    async updateSchedule(
      id: string,
      userId: string,
      fields: SchedulingUpdate
    ): Promise<Card | undefined> {
      const { data, error } = await client
        .from("cards")
        .update(fields)
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data ? rowToCard(data) : undefined;
    },

    async deleteCard(id: string, userId: string): Promise<boolean> {
      const { error, count } = await client
        .from("cards")
        .delete({ count: "exact" })
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
      return (count ?? 0) > 0;
    },

    async batchAcceptCards(ids: string[], userId: string): Promise<number> {
      if (ids.length === 0) return 0;
      const { error, count } = await client
        .from("cards")
        .update({ status: "active" }, { count: "exact" })
        .in("id", ids)
        .eq("user_id", userId)
        .eq("status", "triaging");
      if (error) throw error;
      return count ?? 0;
    },

    async batchDeleteCards(ids: string[], userId: string): Promise<number> {
      if (ids.length === 0) return 0;
      const { error, count } = await client
        .from("cards")
        .delete({ count: "exact" })
        .in("id", ids)
        .eq("user_id", userId);
      if (error) throw error;
      return count ?? 0;
    },

    async createReviewLog(log: ReviewLogInsert): Promise<void> {
      const { error } = await client.from("review_logs").insert(log);
      if (error) throw error;
    },

    async updateLastReviewAt(userId: string, now: string): Promise<void> {
      const { error } = await client
        .from("user")
        .update({ last_review_at: now })
        .eq("id", userId);
      if (error) throw error;

      // Reset nudge history so escalation starts fresh next time user goes inactive
      const { error: deleteErr } = await client
        .from("email_nudges_sent")
        .delete()
        .eq("user_id", userId);
      if (deleteErr) {
        console.error("Failed to reset email nudges for user:", deleteErr);
      }
    },

    async getEmailNotificationsEnabled(userId: string): Promise<boolean> {
      const { data, error } = await client
        .from("user")
        .select("email_notifications_enabled")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data?.email_notifications_enabled ?? true;
    },

    async setEmailNotificationsEnabled(userId: string, enabled: boolean): Promise<void> {
      const { error } = await client
        .from("user")
        .update({ email_notifications_enabled: enabled })
        .eq("id", userId);
      if (error) throw error;
    },

    async getOnboardingCompleted(userId: string): Promise<boolean> {
      const { data, error } = await client
        .from("user")
        .select("onboarding_completed")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data?.onboarding_completed ?? false;
    },

    async setOnboardingCompleted(userId: string): Promise<void> {
      const { error } = await client
        .from("user")
        .update({ onboarding_completed: true })
        .eq("id", userId);
      if (error) throw error;
    },

    async getReviewLogsForCards(cardIds: string[]): Promise<ReviewLogInsert[]> {
      if (cardIds.length === 0) return [];
      const { data, error } = await client
        .from("review_logs")
        .select("*")
        .in("card_id", cardIds)
        .order("reviewed_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ReviewLogInsert[];
    },

    async getStats(userId: string): Promise<UserStats> {
      // Run independent queries in parallel
      const gridCutoff = new Date();
      gridCutoff.setUTCDate(gridCutoff.getUTCDate() - 365);
      const cutoffStr = gridCutoff.toISOString();

      const cardIdsPromise = client
        .from("cards")
        .select("id")
        .eq("user_id", userId);

      const activeCountPromise = client
        .from("cards")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "active");

      const [cardIdsResult, activeCountResult] = await Promise.all([cardIdsPromise, activeCountPromise]);

      if (cardIdsResult.error) throw cardIdsResult.error;
      if (activeCountResult.error) throw activeCountResult.error;

      const cardIds = (cardIdsResult.data ?? []).map((r) => r.id);

      if (cardIds.length === 0) {
        return {
          totalActiveCards: 0,
          totalReviews: 0,
          averageLlmScore: null,
          currentStreak: 0,
          longestStreak: 0,
          contributionGrid: [],
        };
      }

      // Fetch total count (head-only) and recent logs for grid/streaks in parallel
      const totalCountPromise = client
        .from("review_logs")
        .select("*", { count: "exact", head: true })
        .in("card_id", cardIds);

      const recentLogsPromise = client
        .from("review_logs")
        .select("reviewed_at, llm_score")
        .in("card_id", cardIds)
        .gte("reviewed_at", cutoffStr)
        .order("reviewed_at", { ascending: true });

      const [totalCountResult, recentLogsResult] = await Promise.all([totalCountPromise, recentLogsPromise]);

      if (totalCountResult.error) throw totalCountResult.error;
      if (recentLogsResult.error) throw recentLogsResult.error;

      const totalReviews = totalCountResult.count ?? 0;
      const recentLogs = recentLogsResult.data ?? [];

      // Average llm_score (only scored reviews within recent window)
      const scored = recentLogs.filter((l) => l.llm_score != null);
      const averageLlmScore =
        scored.length > 0
          ? scored.reduce((sum, l) => sum + l.llm_score!, 0) / scored.length
          : null;

      // Group by UTC date for contribution grid and streak calculation
      const dateCounts = new Map<string, number>();
      for (const log of recentLogs) {
        const day = log.reviewed_at.slice(0, 10); // YYYY-MM-DD (already UTC from DB)
        dateCounts.set(day, (dateCounts.get(day) ?? 0) + 1);
      }

      const contributionGrid = Array.from(dateCounts.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Streak calculation using UTC dates
      const reviewDates = new Set(dateCounts.keys());
      const todayUTC = new Date().toISOString().slice(0, 10);

      // Helper: get previous UTC date string
      function prevDay(dateStr: string): string {
        const d = new Date(dateStr + "T00:00:00Z");
        d.setUTCDate(d.getUTCDate() - 1);
        return d.toISOString().slice(0, 10);
      }

      // Current streak: walk backwards from today (or yesterday if no reviews today)
      let currentStreak = 0;
      let cursor = reviewDates.has(todayUTC) ? todayUTC : prevDay(todayUTC);
      while (reviewDates.has(cursor)) {
        currentStreak++;
        cursor = prevDay(cursor);
      }

      // Longest streak: walk through sorted dates
      let longestStreak = 0;
      let streak = 0;
      const sortedDates = Array.from(reviewDates).sort();
      for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0) {
          streak = 1;
        } else {
          streak = prevDay(sortedDates[i]) === sortedDates[i - 1] ? streak + 1 : 1;
        }
        if (streak > longestStreak) longestStreak = streak;
      }

      return {
        totalActiveCards: activeCountResult.count ?? 0,
        totalReviews,
        averageLlmScore,
        currentStreak,
        longestStreak,
        contributionGrid,
      };
    },

    async getReviewLogsForCard(cardId: string, userId: string): Promise<ReviewLog[]> {
      // Verify card belongs to user
      const { data: card, error: cardErr } = await client
        .from("cards")
        .select("id")
        .eq("id", cardId)
        .eq("user_id", userId)
        .maybeSingle();
      if (cardErr) throw cardErr;
      if (!card) return [];

      const { data, error } = await client
        .from("review_logs")
        .select("*")
        .eq("card_id", cardId)
        .order("reviewed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReviewLog[];
    },
  };
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
  );
}

export const supabaseProvider: DbProvider = makeProvider(
  createClient(supabaseUrl, supabaseKey)
);
