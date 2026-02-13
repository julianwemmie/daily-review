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
import type { Card } from "../../shared/types.js";

function rowToCard(row: Record<string, unknown>): Card {
  return {
    ...row,
    tags: row.tags ?? null,
  } as Card;
}

function makeProvider(client: SupabaseClient): DbProvider {
  return {
    async createCards(cards: Card[]): Promise<Card[]> {
      const { error } = await client.from("cards").insert(cards);
      if (error) throw error;
      return cards;
    },

    async getCardById(id: string): Promise<Card | undefined> {
      const { data, error } = await client
        .from("cards")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? rowToCard(data) : undefined;
    },

    async listCards(filters?: CardListFilters): Promise<Card[]> {
      let query = client
        .from("cards")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(rowToCard);
    },

    async getDueCards(now: string): Promise<DueCardsResult> {
      const { data: dueRows, error: dueErr } = await client
        .from("cards")
        .select("*")
        .eq("status", "active")
        .lte("due", now)
        .order("due", { ascending: true });
      if (dueErr) throw dueErr;

      const { data: upcoming, error: upErr } = await client
        .from("cards")
        .select("due")
        .eq("status", "active")
        .gt("due", now)
        .order("due", { ascending: true });
      if (upErr) throw upErr;

      return {
        cards: (dueRows ?? []).map(rowToCard),
        upcoming_count: upcoming?.length ?? 0,
        next_due: upcoming?.[0]?.due ?? null,
      };
    },

    async getCounts(now: string): Promise<CardCounts> {
      const { count: newCount, error: newErr } = await client
        .from("cards")
        .select("*", { count: "exact", head: true })
        .eq("status", "triaging");
      if (newErr) throw newErr;

      const { count: dueCount, error: dueErr } = await client
        .from("cards")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .lte("due", now);
      if (dueErr) throw dueErr;

      return { new: newCount ?? 0, due: dueCount ?? 0 };
    },

    async editCard(id: string, fields: CardEdit): Promise<Card | undefined> {
      const { data, error } = await client
        .from("cards")
        .update(fields)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data ? rowToCard(data) : undefined;
    },

    async updateSchedule(
      id: string,
      fields: SchedulingUpdate
    ): Promise<Card | undefined> {
      const { data, error } = await client
        .from("cards")
        .update(fields)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data ? rowToCard(data) : undefined;
    },

    async deleteCard(id: string): Promise<boolean> {
      const { error, count } = await client
        .from("cards")
        .delete({ count: "exact" })
        .eq("id", id);
      if (error) throw error;
      return (count ?? 0) > 0;
    },

    async createReviewLog(log: ReviewLogInsert): Promise<void> {
      const { error } = await client.from("review_logs").insert(log);
      if (error) throw error;
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
