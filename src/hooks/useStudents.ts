"use client";
import { useState, useCallback } from "react";
import api from "@/lib/axios";
import type { Student, Pagination } from "@/types/viewModels";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useStudents(initialParams = {}, autoFetch = true) {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<Record<string, unknown>>(initialParams);
  const [isManualFetchEnabled, setIsManualFetchEnabled] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);

  const listQuery = useQuery({
    queryKey: ["students", params],
    queryFn: async () => {
      const res = await api.get("/students", {
        params: { page: 1, limit: 20, ...params },
      });
      return { data: res.data.data as Student[], pagination: res.data.pagination ?? null };
    },
    enabled: autoFetch || isManualFetchEnabled,
  });

  const refetchStudents = listQuery.refetch;
  const fetchStudents = useCallback(async (newParams?: Record<string, unknown>) => {
    setIsManualFetchEnabled(true);
    if (newParams) {
      setParams(prev => ({ ...prev, ...newParams }));
    } else {
      await refetchStudents();
    }
  }, [refetchStudents]);

  const fetchStudent = useCallback(async (id: string) => {
    const res = await api.get(`/students/${id}`);
    setStudent(res.data.data);
    return res.data.data as Student;
  }, []);

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<Student>) => {
      const res = await api.post("/students", payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string, payload: Partial<Student> }) => {
      const res = await api.put(`/students/${id}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/students/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    }
  });

  const createStudent = async (payload: Partial<Student>) => {
    return await createMutation.mutateAsync(payload);
  };

  const updateStudent = async (id: string, payload: Partial<Student>) => {
    return await updateMutation.mutateAsync({ id, payload });
  };

  const deleteStudent = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  return {
    students: listQuery.data?.data || [],
    student,
    pagination: listQuery.data?.pagination || null,
    loading: ((autoFetch || isManualFetchEnabled) && listQuery.isPending) || listQuery.isFetching || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: listQuery.error ? listQuery.error.message : null,
    fetchStudents,
    fetchStudent,
    createStudent,
    updateStudent,
    deleteStudent,
  };
}
