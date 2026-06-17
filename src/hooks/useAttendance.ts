"use client";
import { useState, useCallback } from "react";
import api from "@/lib/axios";
import type { Attendance, Pagination } from "@/types/viewModels";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useAttendance(initialParams = {}, autoFetch = true) {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<Record<string, unknown>>(initialParams);

  const listQuery = useQuery({
    queryKey: ["attendances", params],
    queryFn: async () => {
      const res = await api.get("/attendance", {
        params: { page: 1, limit: 20, ...params },
      });
      return { data: res.data.data as Attendance[], pagination: res.data.pagination ?? null };
    },
    enabled: autoFetch,
  });

  const fetchAttendances = useCallback(async (newParams?: Record<string, unknown>) => {
    if (newParams) {
      setParams(prev => ({ ...prev, ...newParams }));
    } else {
      await listQuery.refetch();
    }
  }, [listQuery]);

  const fetchTodayAttendance = useCallback(
    async (classRoomId?: string) => {
      const today = new Date().toISOString().slice(0, 10);
      const queryParams: Record<string, unknown> = { startDate: today, endDate: today + "T23:59:59", limit: 500 };
      if (classRoomId) queryParams.classRoomId = classRoomId;
      const res = await api.get("/attendance", { params: queryParams });
      const map: Record<string, string> = {};
      for (const a of res.data.data as Attendance[]) {
        const sid = typeof a.studentId === "object" ? (a.studentId as { _id: string })._id : a.studentId;
        map[sid] = a.status;
      }
      return map;
    },
    [],
  );

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<Attendance>) => {
      const res = await api.post("/attendance", payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendances"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string, payload: Partial<Attendance> }) => {
      const res = await api.put(`/attendance/${id}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendances"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/attendance/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendances"] });
    }
  });

  const createAttendance = async (payload: Partial<Attendance>) => {
    return await createMutation.mutateAsync(payload);
  };

  const updateAttendance = async (id: string, payload: Partial<Attendance>) => {
    return await updateMutation.mutateAsync({ id, payload });
  };

  const deleteAttendance = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  return {
    attendances: listQuery.data?.data || [],
    pagination: listQuery.data?.pagination || null,
    loading: listQuery.isPending || listQuery.isFetching || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: listQuery.error ? listQuery.error.message : null,
    fetchAttendances,
    fetchTodayAttendance,
    createAttendance,
    updateAttendance,
    deleteAttendance,
  };
}
