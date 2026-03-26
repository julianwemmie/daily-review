import type { Card, CardStatus, Rating, UserStats, ReviewLog } from "../types.js";
import type { DueCardsResponse, EvaluateResponse } from "../api.js";

export interface StorageProvider {
  // Queries
  fetchCounts(): Promise<{ new: number; due: number }>;
  fetchTriageCards(): Promise<Card[]>;
  fetchDueCards(): Promise<DueCardsResponse>;
  fetchListCards(options?: { status?: CardStatus; q?: string }): Promise<Card[]>;
  fetchStats(): Promise<UserStats>;
  fetchCardReviewLogs(cardId: string): Promise<ReviewLog[]>;

  // Card mutations
  createCard(data: { front: string; back: string; tags?: string[] }): Promise<Card>;
  updateCard(id: string, data: { front?: string; back?: string; tags?: string[] | null; status?: CardStatus }): Promise<Card>;
  deleteCard(id: string): Promise<void>;
  acceptCard(id: string): Promise<Card>;
  reviewCard(id: string, rating: Rating, answer?: string, llmScore?: number, llmFeedback?: string): Promise<void>;

  // Batch operations
  batchAcceptCards(ids: string[]): Promise<{ accepted: number }>;
  batchDeleteCards(ids: string[]): Promise<{ deleted: number }>;
  batchCreateCards(cards: { front: string; back: string; tags?: string[] }[]): Promise<{ created: number; cards: Card[] }>;

  // Export
  exportCards(opts?: { includeScheduling?: boolean; includeReviewHistory?: boolean }): Promise<void>;

  // AI (only available for authenticated providers)
  evaluateCard(id: string, answer: string): Promise<EvaluateResponse>;
  analyzeCard(cardId: string): Promise<{ analysis: string }>;

  // Audio
  transcribeAudio(audioBlob: Blob): Promise<{ text: string }>;

  // Notifications
  getNotificationPreference(): Promise<boolean>;
  setNotificationPreference(enabled: boolean): Promise<void>;
}
