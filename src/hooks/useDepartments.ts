"use client";
import { useState, useCallback } from "react";
import api from "@/lib/axios";
import type { Department, Pagination } from "@/types/viewModels";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useDepartments(initialParams = {}, autoFetch = true) {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<Record<string, unknown>>(initialParams);
  const [department, setDepartment] = useState<Department | null>(null);

  const listQuery = useQuery({
    queryKey: ["departments", params],
    queryFn: async () => {
      const res = await api.get("/departments", {
        params: { page: 1, limit: 20, ...params },
      });
      return { data: res.data.data as Department[], pagination: res.data.pagination ?? null };
    },
    enabled: autoFetch,
  });

  const fetchDepartments = useCallback(async (newParams?: Record<string, unknown>) => {
    if (newParams) {
      setParams(prev => ({ ...prev, ...newParams }));
    } else {
      await listQuery.refetch();
    }
  }, [listQuery]);

  const fetchDepartment = useCallback(async (id: string) => {
    const res = await api.get(`/departments/${id}`);
    setDepartment(res.data.data);
    return res.data.data as Department;
  }, []);

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<Department>) => {
      const res = await api.post("/departments", payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string, payload: Partial<Department> }) => {
      const res = await api.put(`/departments/${id}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/departments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    }
  });

  const createDepartment = async (payload: Partial<Department>) => {
    return await createMutation.mutateAsync(payload);
  };

  const updateDepartment = async (id: string, payload: Partial<Department>) => {
    return await updateMutation.mutateAsync({ id, payload });
  };

  const deleteDepartment = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  return {
    departments: listQuery.data?.data || [],
    department,
    pagination: listQuery.data?.pagination || null,
    loading: listQuery.isPending || listQuery.isFetching || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: listQuery.error ? listQuery.error.message : null,
    fetchDepartments,
    fetchDepartment,
    createDepartment,
    updateDepartment,
    deleteDepartment,
  };
}
