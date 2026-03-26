import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useStorage } from "@/lib/storage/context.js";
import type { DueCardsResponse } from "@/lib/api.js";
import { type Card, type CardStatus, type Rating, type UserStats, type ReviewLog } from "@/lib/types.js";

// ---- Query key factories ----

export const cardKeys = {
  all: ["cards"] as const,
  triage: () => [...cardKeys.all, "triage"] as const,
  due: () => [...cardKeys.all, "due"] as const,
  list: (filters?: { status?: string; q?: string }) =>
    [...cardKeys.all, "list", filters ?? {}] as const,
  counts: () => [...cardKeys.all, "counts"] as const,
  stats: () => ["stats"] as const,
  reviewLogs: (cardId: string) => ["reviewLogs", cardId] as const,
};

// ---- Query hooks ----

export function useTriageCards() {
  const storage = useStorage();
  return useQuery<Card[]>({
    queryKey: cardKeys.triage(),
    queryFn: () => storage.fetchTriageCards(),
  });
}

export function useDueCards() {
  const storage = useStorage();
  return useQuery<DueCardsResponse>({
    queryKey: cardKeys.due(),
    queryFn: () => storage.fetchDueCards(),
  });
}

export function useListCards(filters?: { status?: CardStatus; q?: string }) {
  const storage = useStorage();
  return useQuery<Card[]>({
    queryKey: cardKeys.list(filters),
    queryFn: () => storage.fetchListCards(filters),
  });
}

export function useCounts() {
  const storage = useStorage();
  return useQuery<{ new: number; due: number }>({
    queryKey: cardKeys.counts(),
    queryFn: () => storage.fetchCounts(),
  });
}

export function useStats() {
  const storage = useStorage();
  return useQuery<UserStats>({
    queryKey: cardKeys.stats(),
    queryFn: () => storage.fetchStats(),
    staleTime: 60_000,
  });
}

export function useCardReviewLogs(cardId: string | null) {
  const storage = useStorage();
  return useQuery<ReviewLog[]>({
    queryKey: cardKeys.reviewLogs(cardId!),
    queryFn: () => storage.fetchCardReviewLogs(cardId!),
    enabled: !!cardId,
  });
}

// ---- Prefetch hook ----

export function usePrefetchCards() {
  const queryClient = useQueryClient();
  const storage = useStorage();

  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: cardKeys.triage(),
      queryFn: () => storage.fetchTriageCards(),
    });
    queryClient.prefetchQuery({
      queryKey: cardKeys.due(),
      queryFn: () => storage.fetchDueCards(),
    });
    queryClient.prefetchQuery({
      queryKey: cardKeys.list(),
      queryFn: () => storage.fetchListCards(),
    });
    queryClient.prefetchQuery({
      queryKey: cardKeys.counts(),
      queryFn: () => storage.fetchCounts(),
    });
  }, [queryClient, storage]);
}

// ---- Invalidation helper ----

export function useInvalidateCards() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: cardKeys.all });
  }, [queryClient]);
}

// ---- Mutation hooks ----

export function useAcceptCard() {
  const storage = useStorage();
  const invalidate = useInvalidateCards();
  return useMutation({
    mutationFn: (id: string) => storage.acceptCard(id),
    onSuccess: invalidate,
  });
}

export function useDeleteCard() {
  const storage = useStorage();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => storage.deleteCard(id),
    onMutate: async (id) => {
      // Cancel any in-flight fetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: cardKeys.all });
      const prev = queryClient.getQueryData<Card[]>(cardKeys.list());
      if (prev) {
        queryClient.setQueryData<Card[]>(
          cardKeys.list(),
          prev.filter((c) => c.id !== id),
        );
      }
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) {
        queryClient.setQueryData(cardKeys.list(), context.prev);
      }
    },
    onSuccess: () => {
      // Invalidate counts and other views, but not the list (already optimistically updated)
      queryClient.invalidateQueries({ queryKey: cardKeys.counts() });
      queryClient.invalidateQueries({ queryKey: cardKeys.triage() });
      queryClient.invalidateQueries({ queryKey: cardKeys.due() });
    },
  });
}

export function useCreateCard() {
  const storage = useStorage();
  const invalidate = useInvalidateCards();
  return useMutation({
    mutationFn: (data: { front: string; back: string; tags?: string[] }) =>
      storage.createCard(data),
    onSuccess: invalidate,
  });
}

export function useUpdateCard() {
  const storage = useStorage();
  const invalidate = useInvalidateCards();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { front?: string; back?: string; tags?: string[] | null; status?: CardStatus };
    }) => storage.updateCard(id, data),
    onSuccess: invalidate,
  });
}

export function useReviewCard() {
  const storage = useStorage();
  const invalidate = useInvalidateCards();
  return useMutation({
    mutationFn: ({
      id,
      rating,
      answer,
      llmScore,
      llmFeedback,
    }: {
      id: string;
      rating: Rating;
      answer?: string;
      llmScore?: number;
      llmFeedback?: string;
    }) => storage.reviewCard(id, rating, answer, llmScore, llmFeedback),
    onSuccess: invalidate,
  });
}

export function useBatchAcceptCards() {
  const storage = useStorage();
  const invalidate = useInvalidateCards();
  return useMutation({
    mutationFn: (ids: string[]) => storage.batchAcceptCards(ids),
    onSuccess: invalidate,
  });
}

export function useBatchCreateCards() {
  const storage = useStorage();
  const invalidate = useInvalidateCards();
  return useMutation({
    mutationFn: (cards: { front: string; back: string; tags?: string[] }[]) =>
      storage.batchCreateCards(cards),
    onSuccess: invalidate,
  });
}

export function useBatchDeleteCards() {
  const storage = useStorage();
  const invalidate = useInvalidateCards();
  return useMutation({
    mutationFn: (ids: string[]) => storage.batchDeleteCards(ids),
    onSuccess: invalidate,
  });
}
