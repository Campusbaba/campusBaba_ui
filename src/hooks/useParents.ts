"use client";
import { useState, useCallback } from "react";
import api from "@/lib/axios";
import type { Parent, Student, Pagination } from "@/types/viewModels";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useParents(initialParams = {}, autoFetch = true) {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<Record<string, unknown>>(initialParams);
  const [isManualFetchEnabled, setIsManualFetchEnabled] = useState(false);
  const [children, setChildren] = useState<Student[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(false);

  const listQuery = useQuery({
    queryKey: ["parents", params],
    queryFn: async () => {
      const res = await api.get("/parents", {
        params: { page: 1, limit: 20, ...params },
      });
      return { data: res.data.data as Parent[], pagination: res.data.pagination ?? null };
    },
    enabled: autoFetch || isManualFetchEnabled,
  });

  const refetchParents = listQuery.refetch;
  const fetchParents = useCallback(async (newParams?: Record<string, unknown>) => {
    setIsManualFetchEnabled(true);
    if (newParams) {
      setParams(prev => ({ ...prev, ...newParams }));
    } else {
      await refetchParents();
    }
  }, [refetchParents]);

  const fetchChildren = useCallback(
    async (parentId: string): Promise<Student[]> => {
      setChildrenLoading(true);
      try {
        const res = await api.get(`/parents/${parentId}/children`);
        const data: Student[] = res.data.data ?? [];
        setChildren(data);
        return data;
      } finally {
        setChildrenLoading(false);
      }
    },
    [],
  );

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<Parent>) => {
      const res = await api.post("/parents", payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parents"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string, payload: Partial<Parent> }) => {
      const res = await api.put(`/parents/${id}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parents"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/parents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parents"] });
    }
  });

  const createParent = async (payload: Partial<Parent>) => {
    return await createMutation.mutateAsync(payload);
  };

  const updateParent = async (id: string, payload: Partial<Parent>) => {
    return await updateMutation.mutateAsync({ id, payload });
  };

  const deleteParent = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  return {
    parents: listQuery.data?.data || [],
    children,
    childrenLoading,
    pagination: listQuery.data?.pagination || null,
    loading: ((autoFetch || isManualFetchEnabled) && listQuery.isPending) || listQuery.isFetching || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: listQuery.error ? listQuery.error.message : null,
    fetchParents,
    fetchChildren,
    createParent,
    updateParent,
    deleteParent,
  };
}
