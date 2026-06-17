"use client";
import { useCallback } from "react";
import api from "@/lib/axios";
import { useQuery, useMutation as useRQMutation } from "@tanstack/react-query";

interface UseApiOptions {
  immediate?: boolean;
}

export function useApi<T>(
  url: string,
  options: UseApiOptions = { immediate: true },
) {
  const queryResult = useQuery({
    queryKey: [url],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: T }>(url);
      return res.data.data ?? (res.data as unknown as T);
    },
    enabled: options.immediate !== false,
  });

  return {
    data: queryResult.data ?? null,
    loading: queryResult.isPending || queryResult.isFetching,
    error: queryResult.error ? queryResult.error.message : null,
    refetch: queryResult.refetch,
  };
}

export function useMutation<TData, TPayload>(
  url: string,
  method: "post" | "put" | "delete" = "post",
) {
  const mutationResult = useRQMutation({
    mutationFn: async ({ payload, id }: { payload?: TPayload; id?: string }) => {
      const endpoint = id ? `${url}/${id}` : url;
      const res =
        method === "delete"
          ? await api.delete<{ data: TData }>(endpoint)
          : method === "put"
            ? await api.put<{ data: TData }>(endpoint, payload)
            : await api.post<{ data: TData }>(endpoint, payload);
      return res.data.data;
    },
  });

  const mutate = useCallback(
    async (payload?: TPayload, id?: string): Promise<TData | null> => {
      try {
        const data = await mutationResult.mutateAsync({ payload, id });
        return data as TData;
      } catch (err) {
        return null;
      }
    },
    [mutationResult]
  );

  return {
    mutate,
    loading: mutationResult.isPending,
    error: mutationResult.error ? mutationResult.error.message : null,
  };
}
