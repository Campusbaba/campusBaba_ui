"use client";
import { useState, useCallback } from "react";
import api from "@/lib/axios";
import type { Exam, Pagination } from "@/types/viewModels";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useExams(initialParams = {}, autoFetch = true) {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<Record<string, unknown>>(initialParams);
  const [exam, setExam] = useState<Exam | null>(null);
  const [additionalLoading, setAdditionalLoading] = useState(false);
  const [additionalExams, setAdditionalExams] = useState<Exam[] | null>(null);

  const listQuery = useQuery({
    queryKey: ["exams", params],
    queryFn: async () => {
      const res = await api.get("/exams", {
        params: { page: 1, limit: 20, ...params },
      });
      return { data: res.data.data as Exam[], pagination: res.data.pagination ?? null };
    },
    enabled: autoFetch,
  });

  const fetchExams = useCallback(async (newParams?: Record<string, unknown>) => {
    if (newParams) {
      setParams(prev => ({ ...prev, ...newParams }));
    } else {
      await listQuery.refetch();
    }
  }, [listQuery]);

  const fetchExam = useCallback(async (id: string) => {
    const res = await api.get(`/exams/${id}`);
    setExam(res.data.data);
    return res.data.data as Exam;
  }, []);

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<Exam>) => {
      const res = await api.post("/exams", payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string, payload: Partial<Exam> }) => {
      const res = await api.put(`/exams/${id}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/exams/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
    }
  });

  const createExam = async (payload: Partial<Exam>) => {
    return await createMutation.mutateAsync(payload);
  };

  const updateExam = async (id: string, payload: Partial<Exam>) => {
    return await updateMutation.mutateAsync({ id, payload });
  };

  const deleteExam = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  const fetchExamsByClassRooms = useCallback(
    async (classRoomIds: string[], params: Record<string, unknown> = {}) => {
      setAdditionalLoading(true);
      try {
        const promises = classRoomIds.map((id) =>
          api.get(`/exams/classroom/${id}`, {
            params: { page: 1, limit: 50, ...params },
          }),
        );
        const results = await Promise.all(promises);
        const allExams = results.flatMap((res) => res.data.data);
        setAdditionalExams(allExams);
        return allExams;
      } catch (err) {
        setAdditionalExams([]);
        return [];
      } finally {
        setAdditionalLoading(false);
      }
    },
    [],
  );

  return {
    exams: additionalExams !== null ? additionalExams : (listQuery.data?.data || []),
    exam,
    pagination: listQuery.data?.pagination || null,
    loading: listQuery.isPending || listQuery.isFetching || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || additionalLoading,
    error: listQuery.error ? listQuery.error.message : null,
    fetchExams,
    fetchExam,
    createExam,
    updateExam,
    deleteExam,
    fetchExamsByClassRooms,
  };
}
