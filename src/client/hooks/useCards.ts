import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  fetchCounts,
  fetchTriageCards,
  fetchDueCardsView,
  fetchListCards,
  acceptCard,
  deleteCard,
  batchAcceptCards,
  batchDeleteCards,
  updateCard,
  createCard,
  reviewCard,
  type DueCardsResponse,
} from "@/lib/api.js";
import { type Card, type CardStatus, type Rating } from "@/lib/types.js";

// ---- Query key factories ----

export const cardKeys = {
  all: ["cards"] as const,
  triage: () => [...cardKeys.all, "triage"] as const,
  due: () => [...cardKeys.all, "due"] as const,
  list: (filters?: { status?: string; q?: string }) =>
    [...cardKeys.all, "list", filters ?? {}] as const,
  counts: () => [...cardKeys.all, "counts"] as const,
};

// ---- Query hooks ----

export function useTriageCards() {
  return useQuery<Card[]>({
    queryKey: cardKeys.triage(),
    queryFn: fetchTriageCards,
  });
}

export function useDueCards() {
  return useQuery<DueCardsResponse>({
    queryKey: cardKeys.due(),
    queryFn: fetchDueCardsView,
  });
}

export function useListCards(filters?: { status?: CardStatus; q?: string }) {
  return useQuery<Card[]>({
    queryKey: cardKeys.list(filters),
    queryFn: () => fetchListCards(filters),
  });
}

export function useCounts() {
  return useQuery<{ new: number; due: number }>({
    queryKey: cardKeys.counts(),
    queryFn: fetchCounts,
  });
}

// ---- Prefetch hook ----

export function usePrefetchCards() {
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: cardKeys.triage(),
      queryFn: fetchTriageCards,
    });
    queryClient.prefetchQuery({
      queryKey: cardKeys.due(),
      queryFn: fetchDueCardsView,
    });
    queryClient.prefetchQuery({
      queryKey: cardKeys.list(),
      queryFn: () => fetchListCards(),
    });
    queryClient.prefetchQuery({
      queryKey: cardKeys.counts(),
      queryFn: fetchCounts,
    });
  }, [queryClient]);
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
  const invalidate = useInvalidateCards();
  return useMutation({
    mutationFn: (id: string) => acceptCard(id),
    onSuccess: invalidate,
  });
}

export function useDeleteCard() {
  const invalidate = useInvalidateCards();
  return useMutation({
    mutationFn: (id: string) => deleteCard(id),
    onSuccess: invalidate,
  });
}

export function useCreateCard() {
  const invalidate = useInvalidateCards();
  return useMutation({
    mutationFn: (data: { front: string; back?: string; tags?: string[] }) =>
      createCard(data),
    onSuccess: invalidate,
  });
}

export function useUpdateCard() {
  const invalidate = useInvalidateCards();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { front?: string; back?: string | null; tags?: string[] | null; status?: CardStatus };
    }) => updateCard(id, data),
    onSuccess: invalidate,
  });
}

export function useReviewCard() {
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
    }) => reviewCard(id, rating, answer, llmScore, llmFeedback),
    onSuccess: invalidate,
  });
}

export function useBatchAcceptCards() {
  const invalidate = useInvalidateCards();
  return useMutation({
    mutationFn: (ids: string[]) => batchAcceptCards(ids),
    onSuccess: invalidate,
  });
}

export function useBatchDeleteCards() {
  const invalidate = useInvalidateCards();
  return useMutation({
    mutationFn: (ids: string[]) => batchDeleteCards(ids),
    onSuccess: invalidate,
  });
}
