"use client";
import { useState, useCallback } from "react";
import api from "@/lib/axios";
import type { Expense, Pagination } from "@/types/viewModels";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useExpenses(initialParams = {}, autoFetch = true) {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<Record<string, unknown>>(initialParams);
  const [expense, setExpense] = useState<Expense | null>(null);

  const listQuery = useQuery({
    queryKey: ["expenses", params],
    queryFn: async () => {
      const res = await api.get("/expenses", {
        params: { page: 1, limit: 20, ...params },
      });
      return { data: res.data.data as Expense[], pagination: res.data.pagination ?? null };
    },
    enabled: autoFetch,
  });

  const fetchExpenses = useCallback(async (newParams?: Record<string, unknown>) => {
    if (newParams) {
      setParams(prev => ({ ...prev, ...newParams }));
    } else {
      await listQuery.refetch();
    }
  }, [listQuery]);

  const fetchExpense = useCallback(async (id: string) => {
    const res = await api.get(`/expenses/${id}`);
    setExpense(res.data.data);
    return res.data.data as Expense;
  }, []);

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<Expense>) => {
      const res = await api.post("/expenses", payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string, payload: Partial<Expense> }) => {
      const res = await api.put(`/expenses/${id}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    }
  });

  const createExpense = async (payload: Partial<Expense>) => {
    return await createMutation.mutateAsync(payload);
  };

  const updateExpense = async (id: string, payload: Partial<Expense>) => {
    return await updateMutation.mutateAsync({ id, payload });
  };

  const deleteExpense = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  return {
    expenses: listQuery.data?.data || [],
    expense,
    pagination: listQuery.data?.pagination || null,
    loading: listQuery.isPending || listQuery.isFetching || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: listQuery.error ? listQuery.error.message : null,
    fetchExpenses,
    fetchExpense,
    createExpense,
    updateExpense,
    deleteExpense,
  };
}
