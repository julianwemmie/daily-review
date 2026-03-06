import type { Card, Rating } from "../shared/types.js";
import type { AuthCredentials } from "./config.js";

export interface ApiClientOptions {
  serverUrl: string;
  auth: AuthCredentials;
}

export interface DueCardsResponse {
  cards: Card[];
  next_due: string | null;
}

export class ApiClient {
  private baseUrl: string;
  private auth: AuthCredentials;

  constructor(opts: ApiClientOptions) {
    this.baseUrl = opts.serverUrl.replace(/\/$/, "");
    this.auth = opts.auth;
  }

  private authHeader(): Record<string, string> {
    if (this.auth.type === "bearer") {
      return { Authorization: `Bearer ${this.auth.token}` };
    }
    return { "x-api-key": this.auth.token };
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...this.authHeader(),
          ...init?.headers,
        },
      });
    } catch {
      throw new Error(`Could not reach server at ${this.baseUrl}. Is it running?`);
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as any).error || `HTTP ${res.status}: ${res.statusText}`);
    }

    return res.json() as Promise<T>;
  }

  async createCard(data: { front: string; back?: string; tags?: string[] }): Promise<Card> {
    return this.request<Card>("/api/cards", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async batchCreateCards(cards: { front: string; back?: string; tags?: string[] }[]): Promise<{ created: number; cards: Card[] }> {
    return this.request("/api/cards/batch-create", {
      method: "POST",
      body: JSON.stringify({ cards }),
    });
  }

  async listCards(opts?: { status?: string; q?: string }): Promise<Card[]> {
    const params = new URLSearchParams({ view: "list" });
    if (opts?.status) params.set("status", opts.status);
    if (opts?.q) params.set("q", opts.q);
    return this.request<Card[]>(`/api/cards?${params}`);
  }

  async getDueCards(): Promise<DueCardsResponse> {
    return this.request<DueCardsResponse>("/api/cards?view=due");
  }

  async getTriageCards(): Promise<Card[]> {
    return this.request<Card[]>("/api/cards?view=triage");
  }

  async getCounts(): Promise<{ new: number; due: number }> {
    return this.request("/api/cards/counts");
  }

  async deleteCard(id: string): Promise<void> {
    await this.request(`/api/cards/${id}`, { method: "DELETE" });
  }

  async batchDeleteCards(ids: string[]): Promise<{ deleted: number }> {
    return this.request("/api/cards/batch-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  }

  async updateCard(id: string, data: { front?: string; back?: string | null; tags?: string[] | null; status?: string }): Promise<Card> {
    return this.request(`/api/cards/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async evaluateCard(id: string, answer: string): Promise<{ score: number; feedback: string }> {
    return this.request(`/api/cards/${id}/evaluate`, {
      method: "POST",
      body: JSON.stringify({ answer }),
    });
  }

  async reviewCard(id: string, rating: Rating, opts?: { answer?: string; llm_score?: number; llm_feedback?: string }): Promise<void> {
    await this.request(`/api/cards/${id}/review`, {
      method: "POST",
      body: JSON.stringify({ rating, ...opts }),
    });
  }

  async exportCards(opts?: { includeScheduling?: boolean; includeReviewHistory?: boolean }): Promise<{ exportedAt: string; version: number; includesScheduling: boolean; cards: unknown[] }> {
    const params = new URLSearchParams();
    if (opts?.includeScheduling) params.set("includeScheduling", "true");
    if (opts?.includeReviewHistory) params.set("includeReviewHistory", "true");
    return this.request(`/api/cards/export?${params}`);
  }

  async batchAcceptCards(ids: string[]): Promise<{ accepted: number }> {
    return this.request("/api/cards/batch-accept", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  }
}
