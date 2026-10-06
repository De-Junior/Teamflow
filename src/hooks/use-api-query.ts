"use client";

import { useQuery, type QueryKey } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

/**
 * GET an API route through React Query, so each panel gets caching, a
 * loading state, an error state and `refetch` without hand-rolled effects.
 */
export function useApiQuery<T>(key: QueryKey, url: string) {
  return useQuery({ queryKey: key, queryFn: () => api.get<T>(url) });
}
