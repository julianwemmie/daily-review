import { CardStatus, type Card, type Rating } from "./types.js";

export async function fetchCounts(): Promise<{ new: number; due: number }> {
  const res = await fetch("/api/cards/counts");
  if (!res.ok) throw new Error(`Failed to fetch counts: ${res.statusText}`);
  return res.json();
}

export async function fetchCards(options?: { status?: CardStatus }): Promise<Card[]> {
  const params = new URLSearchParams();
  if (options?.status) params.set("status", options.status);
  const qs = params.toString();
  const url = qs ? `/api/cards?${qs}` : "/api/cards";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch cards: ${res.statusText}`);
  return res.json();
}

export interface DueCardsResponse {
  cards: Card[];
  upcoming_count: number;
  next_due: string | null;
}

export async function fetchDueCards(): Promise<DueCardsResponse> {
  const res = await fetch("/api/cards/due");
  if (!res.ok) throw new Error(`Failed to fetch due cards: ${res.statusText}`);
  return res.json();
}

export async function createCard(data: {
  front: string;
  context?: string;
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

export async function skipCard(id: string): Promise<Card> {
  const res = await fetch(`/api/cards/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: CardStatus.Suspended }),
  });
  if (!res.ok) throw new Error(`Failed to skip card: ${res.statusText}`);
  return res.json();
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
