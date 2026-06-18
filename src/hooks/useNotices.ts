"use client";
import { useState, useCallback } from "react";
import api from "@/lib/axios";
import type { Notice, Pagination } from "@/types/viewModels";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useNotices(initialParams = {}, autoFetch = true) {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<Record<string, unknown>>(initialParams);
  const [isManualFetchEnabled, setIsManualFetchEnabled] = useState(false);

  const listQuery = useQuery({
    queryKey: ["notices", params],
    queryFn: async () => {
      const res = await api.get("/notices", {
        params: { page: 1, limit: 20, ...params },
      });
      return { data: res.data.data as Notice[], pagination: res.data.pagination ?? null };
    },
    enabled: autoFetch || isManualFetchEnabled,
  });

  const refetchNotices = listQuery.refetch;
  const fetchNotices = useCallback(async (newParams?: Record<string, unknown>) => {
    setIsManualFetchEnabled(true);
    if (newParams) {
      setParams(prev => ({ ...prev, ...newParams }));
    } else {
      await refetchNotices();
    }
  }, [refetchNotices]);

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<Notice>) => {
      const res = await api.post("/notices", payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices"] });
      queryClient.invalidateQueries({ queryKey: ["activeNotices"] });
      queryClient.invalidateQueries({ queryKey: ["teacherNotices"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string, payload: Partial<Notice> }) => {
      const res = await api.put(`/notices/${id}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices"] });
      queryClient.invalidateQueries({ queryKey: ["activeNotices"] });
      queryClient.invalidateQueries({ queryKey: ["teacherNotices"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices"] });
      queryClient.invalidateQueries({ queryKey: ["activeNotices"] });
      queryClient.invalidateQueries({ queryKey: ["teacherNotices"] });
    }
  });

  const createNotice = async (payload: Partial<Notice>) => {
    return await createMutation.mutateAsync(payload);
  };

  const updateNotice = async (id: string, payload: Partial<Notice>) => {
    return await updateMutation.mutateAsync({ id, payload });
  };

  const deleteNotice = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  return {
    notices: listQuery.data?.data || [],
    pagination: listQuery.data?.pagination || null,
    loading: ((autoFetch || isManualFetchEnabled) && listQuery.isPending) || listQuery.isFetching || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: listQuery.error ? listQuery.error.message : null,
    fetchNotices,
    createNotice,
    updateNotice,
    deleteNotice,
  };
}

export function useActiveNotices(targetAudience?: string) {
  const queryResult = useQuery({
    queryKey: ["activeNotices", targetAudience],
    queryFn: async () => {
      try {
        const res = await api.get("/notices/active", {
          params: targetAudience ? { targetAudience } : {},
        });
        return res.data.data as Notice[] ?? [];
      } catch {
        return [];
      }
    },
  });

  return { 
    notices: queryResult.data || [], 
    loading: queryResult.isPending || queryResult.isFetching, 
    refetch: queryResult.refetch 
  };
}

export function useTeacherNotices(teacherId: string | null | undefined) {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<Record<string, unknown>>({});

  const listQuery = useQuery({
    queryKey: ["teacherNotices", teacherId, params],
    queryFn: async () => {
      if (!teacherId) return { data: [], pagination: null };
      const res = await api.get(`/notices/teacher/${teacherId}`, {
        params: { page: 1, limit: 50, ...params },
      });
      return { data: res.data.data as Notice[], pagination: res.data.pagination ?? null };
    },
    enabled: !!teacherId,
  });

  const fetchNotices = useCallback(async (newParams: Record<string, unknown> = {}) => {
    setParams(newParams);
  }, []);

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<Notice>) => {
      const res = await api.post("/notices", payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacherNotices"] });
      queryClient.invalidateQueries({ queryKey: ["notices"] });
      queryClient.invalidateQueries({ queryKey: ["activeNotices"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string, payload: Partial<Notice> }) => {
      const res = await api.put(`/notices/${id}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacherNotices"] });
      queryClient.invalidateQueries({ queryKey: ["notices"] });
      queryClient.invalidateQueries({ queryKey: ["activeNotices"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacherNotices"] });
      queryClient.invalidateQueries({ queryKey: ["notices"] });
      queryClient.invalidateQueries({ queryKey: ["activeNotices"] });
    }
  });

  const createNotice = async (payload: Partial<Notice>) => {
    return await createMutation.mutateAsync(payload);
  };

  const updateNotice = async (id: string, payload: Partial<Notice>) => {
    return await updateMutation.mutateAsync({ id, payload });
  };

  const deleteNotice = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  return {
    notices: listQuery.data?.data || [],
    pagination: listQuery.data?.pagination || null,
    loading: listQuery.isPending || listQuery.isFetching || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: listQuery.error ? listQuery.error.message : null,
    fetchNotices,
    createNotice,
    updateNotice,
    deleteNotice,
  };
}
