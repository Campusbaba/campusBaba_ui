"use client";
import { useState, useCallback } from "react";
import api from "@/lib/axios";
import type { Employee, Pagination } from "@/types/viewModels";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useEmployees(initialParams = {}, autoFetch = true) {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<Record<string, unknown>>(initialParams);
  const [employee, setEmployee] = useState<Employee | null>(null);

  const listQuery = useQuery({
    queryKey: ["employees", params],
    queryFn: async () => {
      const res = await api.get("/employees", {
        params: { page: 1, limit: 20, ...params },
      });
      return { data: res.data.data as Employee[], pagination: res.data.pagination ?? null };
    },
    enabled: autoFetch,
  });

  const fetchEmployees = useCallback(async (newParams?: Record<string, unknown>) => {
    if (newParams) {
      setParams(prev => ({ ...prev, ...newParams }));
    } else {
      await listQuery.refetch();
    }
  }, [listQuery]);

  const fetchEmployee = useCallback(async (id: string) => {
    const res = await api.get(`/employees/${id}`);
    setEmployee(res.data.data);
    return res.data.data as Employee;
  }, []);

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<Employee>) => {
      const res = await api.post("/employees", payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string, payload: Partial<Employee> }) => {
      const res = await api.put(`/employees/${id}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    }
  });

  const createEmployee = async (payload: Partial<Employee>) => {
    return await createMutation.mutateAsync(payload);
  };

  const updateEmployee = async (id: string, payload: Partial<Employee>) => {
    return await updateMutation.mutateAsync({ id, payload });
  };

  const deleteEmployee = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  return {
    employees: listQuery.data?.data || [],
    employee,
    pagination: listQuery.data?.pagination || null,
    loading: listQuery.isPending || listQuery.isFetching || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: listQuery.error ? listQuery.error.message : null,
    fetchEmployees,
    fetchEmployee,
    createEmployee,
    updateEmployee,
    deleteEmployee,
  };
}
