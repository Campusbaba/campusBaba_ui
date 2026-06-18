"use client";
import { useState, useCallback } from "react";
import api from "@/lib/axios";
import type { Course, Pagination } from "@/types/viewModels";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useCourses(initialParams = {}, autoFetch = true) {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<Record<string, unknown>>(initialParams);
  const [isManualFetchEnabled, setIsManualFetchEnabled] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);

  const listQuery = useQuery({
    queryKey: ["courses", params],
    queryFn: async () => {
      const res = await api.get("/courses", {
        params: { page: 1, limit: 20, ...params },
      });
      return { data: res.data.data as Course[], pagination: res.data.pagination ?? null };
    },
    enabled: autoFetch || isManualFetchEnabled,
  });

  const refetchCourses = listQuery.refetch;
  const fetchCourses = useCallback(async (newParams?: Record<string, unknown>) => {
    setIsManualFetchEnabled(true);
    if (newParams) {
      setParams(prev => ({ ...prev, ...newParams }));
    } else {
      await refetchCourses();
    }
  }, [refetchCourses]);

  const fetchCourse = useCallback(async (id: string) => {
    const res = await api.get(`/courses/${id}`);
    setCourse(res.data.data);
    return res.data.data as Course;
  }, []);

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<Course>) => {
      const res = await api.post("/courses", payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string, payload: Partial<Course> }) => {
      const res = await api.put(`/courses/${id}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/courses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    }
  });

  const createCourse = async (payload: Partial<Course>) => {
    return await createMutation.mutateAsync(payload);
  };

  const updateCourse = async (id: string, payload: Partial<Course>) => {
    return await updateMutation.mutateAsync({ id, payload });
  };

  const deleteCourse = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  return {
    courses: listQuery.data?.data || [],
    course,
    pagination: listQuery.data?.pagination || null,
    loading: ((autoFetch || isManualFetchEnabled) && listQuery.isPending) || listQuery.isFetching || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: listQuery.error ? listQuery.error.message : null,
    fetchCourses,
    fetchCourse,
    createCourse,
    updateCourse,
    deleteCourse,
  };
}
