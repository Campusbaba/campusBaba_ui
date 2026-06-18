"use client";
import { useState, useCallback } from "react";
import api from "@/lib/axios";
import type { Teacher, Pagination } from "@/types/viewModels";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useTeachers(initialParams = {}, autoFetch = true) {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<Record<string, unknown>>(initialParams);
  const [isManualFetchEnabled, setIsManualFetchEnabled] = useState(false);
  const [teacher, setTeacher] = useState<Teacher | null>(null);

  const listQuery = useQuery({
    queryKey: ["teachers", params],
    queryFn: async () => {
      const res = await api.get("/teachers", {
        params: { page: 1, limit: 20, ...params },
      });
      return { data: res.data.data as Teacher[], pagination: res.data.pagination ?? null };
    },
    enabled: autoFetch || isManualFetchEnabled,
  });

  const refetchTeachers = listQuery.refetch;
  const fetchTeachers = useCallback(async (newParams?: Record<string, unknown>) => {
    setIsManualFetchEnabled(true);
    if (newParams) {
      setParams(prev => ({ ...prev, ...newParams }));
    } else {
      await refetchTeachers();
    }
  }, [refetchTeachers]);

  const fetchTeacher = useCallback(async (id: string) => {
    const res = await api.get(`/teachers/${id}`);
    setTeacher(res.data.data);
    return res.data.data as Teacher;
  }, []);

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<Teacher>) => {
      const res = await api.post("/teachers", payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string, payload: Partial<Teacher> }) => {
      const res = await api.put(`/teachers/${id}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/teachers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
    }
  });

  const createTeacher = async (payload: Partial<Teacher>) => {
    return await createMutation.mutateAsync(payload);
  };

  const updateTeacher = async (id: string, payload: Partial<Teacher>) => {
    return await updateMutation.mutateAsync({ id, payload });
  };

  const deleteTeacher = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  return {
    teachers: listQuery.data?.data || [],
    teacher,
    pagination: listQuery.data?.pagination || null,
    loading: ((autoFetch || isManualFetchEnabled) && listQuery.isPending) || listQuery.isFetching || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: listQuery.error ? listQuery.error.message : null,
    fetchTeachers,
    fetchTeacher,
    createTeacher,
    updateTeacher,
    deleteTeacher,
  };
}
