import { CardStatus, type Card, type Rating, type UserStats, type ReviewLog } from "./types.js";

export async function fetchCounts(): Promise<{ new: number; due: number }> {
  const res = await fetch("/api/cards/counts");
  if (!res.ok) throw new Error(`Failed to fetch counts: ${res.statusText}`);
  return res.json();
}

export interface DueCardsResponse {
  cards: Card[];
  next_due: string | null;
}

export async function fetchTriageCards(): Promise<Card[]> {
  const res = await fetch("/api/cards?view=triage");
  if (!res.ok) throw new Error(`Failed to fetch triage cards: ${res.statusText}`);
  return res.json();
}

export async function fetchDueCardsView(): Promise<DueCardsResponse> {
  const res = await fetch("/api/cards?view=due");
  if (!res.ok) throw new Error(`Failed to fetch due cards: ${res.statusText}`);
  return res.json();
}

export async function fetchListCards(options?: { status?: CardStatus; q?: string }): Promise<Card[]> {
  const params = new URLSearchParams();
  params.set("view", "list");
  if (options?.status) params.set("status", options.status);
  if (options?.q) params.set("q", options.q);
  const res = await fetch(`/api/cards?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch cards: ${res.statusText}`);
  return res.json();
}

export async function updateCard(id: string, data: {
  front?: string;
  back?: string;
  tags?: string[] | null;
  status?: CardStatus;
}): Promise<Card> {
  const res = await fetch(`/api/cards/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update card: ${res.statusText}`);
  return res.json();
}

export async function createCard(data: {
  front: string;
  back: string;
  tags?: string[];
}): Promise<Card> {
  const res = await fetch("/api/cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create card: ${res.statusText}`);
  return res.json();
}

export async function deleteCard(id: string): Promise<void> {
  const res = await fetch(`/api/cards/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete card: ${res.statusText}`);
}

export async function acceptCard(id: string): Promise<Card> {
  const res = await fetch(`/api/cards/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: CardStatus.Active }),
  });
  if (!res.ok) throw new Error(`Failed to accept card: ${res.statusText}`);
  return res.json();
}

export async function batchAcceptCards(ids: string[]): Promise<{ accepted: number }> {
  const res = await fetch("/api/cards/batch-accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error(`Failed to accept cards: ${res.statusText}`);
  return res.json();
}

export async function batchDeleteCards(ids: string[]): Promise<{ deleted: number }> {
  const res = await fetch("/api/cards/batch-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error(`Failed to delete cards: ${res.statusText}`);
  return res.json();
}

export interface EvaluateResponse {
  score: number;
  feedback: string;
}

export async function evaluateCard(
  id: string,
  answer: string
): Promise<EvaluateResponse> {
  const res = await fetch(`/api/cards/${id}/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answer }),
  });
  if (!res.ok) throw new Error(`Failed to evaluate answer: ${res.statusText}`);
  return res.json();
}

export async function reviewCard(
  id: string,
  rating: Rating,
  answer?: string,
  llmScore?: number,
  llmFeedback?: string
): Promise<void> {
  const res = await fetch(`/api/cards/${id}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rating,
      answer,
      llm_score: llmScore,
      llm_feedback: llmFeedback,
    }),
  });
  if (!res.ok) throw new Error(`Failed to review card: ${res.statusText}`);
}

export async function batchCreateCards(
  cards: { front: string; back: string; tags?: string[] }[],
): Promise<{ created: number; cards: Card[] }> {
  const res = await fetch("/api/cards/batch-create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cards }),
  });
  if (!res.ok) throw new Error(`Failed to import cards: ${res.statusText}`);
  return res.json();
}

export async function exportCards(opts?: { includeScheduling?: boolean; includeReviewHistory?: boolean }): Promise<void> {
  const params = new URLSearchParams();
  if (opts?.includeScheduling) params.set("includeScheduling", "true");
  if (opts?.includeReviewHistory) params.set("includeReviewHistory", "true");
  const res = await fetch(`/api/cards/export?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to export cards: ${res.statusText}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "amber-cards-export.json";
  a.click();
  URL.revokeObjectURL(url);
}

export type { UserStats, ReviewLog } from "./types.js";

export async function fetchStats(): Promise<UserStats> {
  const res = await fetch("/api/stats");
  if (!res.ok) throw new Error(`Failed to fetch stats: ${res.statusText}`);
  return res.json();
}

export async function fetchCardReviewLogs(cardId: string): Promise<ReviewLog[]> {
  const res = await fetch(`/api/cards/${cardId}/review-logs`);
  if (!res.ok) throw new Error(`Failed to fetch review logs: ${res.statusText}`);
  return res.json();
}

export async function analyzeCard(cardId: string): Promise<{ analysis: string }> {
  const res = await fetch(`/api/cards/${cardId}/analyze`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to analyze card: ${res.statusText}`);
  return res.json();
}

export async function getNotificationPreference(): Promise<boolean> {
  const res = await fetch("/api/notifications");
  if (!res.ok) throw new Error(`Failed to get notification preference: ${res.statusText}`);
  const data = await res.json();
  return data.email_notifications_enabled;
}

export async function setNotificationPreference(enabled: boolean): Promise<void> {
  const res = await fetch("/api/notifications", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error(`Failed to update notification preference: ${res.statusText}`);
}

export async function transcribeAudio(audioBlob: Blob): Promise<{ text: string }> {
  const res = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "Content-Type": audioBlob.type || "audio/webm" },
    body: audioBlob,
  });
  if (!res.ok) throw new Error(`Failed to transcribe audio: ${res.statusText}`);
  return res.json();
}
