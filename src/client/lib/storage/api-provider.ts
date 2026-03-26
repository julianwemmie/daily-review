import type { StorageProvider } from "./types.js";
import type { CardStatus, Rating } from "../types.js";
import * as api from "../api.js";

export class ApiStorageProvider implements StorageProvider {
  fetchCounts() {
    return api.fetchCounts();
  }
  fetchTriageCards() {
    return api.fetchTriageCards();
  }
  fetchDueCards() {
    return api.fetchDueCardsView();
  }
  fetchListCards(options?: { status?: CardStatus; q?: string }) {
    return api.fetchListCards(options);
  }
  fetchStats() {
    return api.fetchStats();
  }
  fetchCardReviewLogs(cardId: string) {
    return api.fetchCardReviewLogs(cardId);
  }
  createCard(data: { front: string; back: string; tags?: string[] }) {
    return api.createCard(data);
  }
  updateCard(id: string, data: { front?: string; back?: string; tags?: string[] | null; status?: CardStatus }) {
    return api.updateCard(id, data);
  }
  deleteCard(id: string) {
    return api.deleteCard(id);
  }
  acceptCard(id: string) {
    return api.acceptCard(id);
  }
  reviewCard(id: string, rating: Rating, answer?: string, llmScore?: number, llmFeedback?: string) {
    return api.reviewCard(id, rating, answer, llmScore, llmFeedback);
  }
  batchAcceptCards(ids: string[]) {
    return api.batchAcceptCards(ids);
  }
  batchDeleteCards(ids: string[]) {
    return api.batchDeleteCards(ids);
  }
  batchCreateCards(cards: { front: string; back: string; tags?: string[] }[]) {
    return api.batchCreateCards(cards);
  }
  exportCards(opts?: { includeScheduling?: boolean; includeReviewHistory?: boolean }) {
    return api.exportCards(opts);
  }
  evaluateCard(id: string, answer: string) {
    return api.evaluateCard(id, answer);
  }
  analyzeCard(cardId: string) {
    return api.analyzeCard(cardId);
  }
  transcribeAudio(audioBlob: Blob) {
    return api.transcribeAudio(audioBlob);
  }
  getNotificationPreference() {
    return api.getNotificationPreference();
  }
  setNotificationPreference(enabled: boolean) {
    return api.setNotificationPreference(enabled);
  }
}
