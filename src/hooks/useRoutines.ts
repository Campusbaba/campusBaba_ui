"use client";
import { useState, useCallback } from "react";
import api from "@/lib/axios";
import type { Routine, Pagination } from "@/types/viewModels";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useRoutines(initialParams = {}, autoFetch = true) {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<Record<string, unknown>>(initialParams);
  const [isManualFetchEnabled, setIsManualFetchEnabled] = useState(false);
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [additionalLoading, setAdditionalLoading] = useState(false);
  const [additionalRoutines, setAdditionalRoutines] = useState<Routine[] | null>(null);

  const listQuery = useQuery({
    queryKey: ["routines", params],
    queryFn: async () => {
      const res = await api.get("/routines", {
        params: { page: 1, limit: 20, ...params },
      });
      return { data: res.data.data as Routine[], pagination: res.data.pagination ?? null };
    },
    enabled: autoFetch || isManualFetchEnabled,
  });

  const refetchRoutines = listQuery.refetch;
  const fetchRoutines = useCallback(async (newParams?: Record<string, unknown>) => {
    setIsManualFetchEnabled(true);
    if (newParams) {
      setParams(prev => ({ ...prev, ...newParams }));
    } else {
      await refetchRoutines();
    }
  }, [refetchRoutines]);

  const fetchRoutine = useCallback(async (id: string) => {
    const res = await api.get(`/routines/${id}`);
    setRoutine(res.data.data);
    return res.data.data as Routine;
  }, []);

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<Routine>) => {
      const res = await api.post("/routines", payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routines"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string, payload: Partial<Routine> }) => {
      const res = await api.put(`/routines/${id}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routines"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/routines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routines"] });
    }
  });

  const createRoutine = async (payload: Partial<Routine>) => {
    return await createMutation.mutateAsync(payload);
  };

  const updateRoutine = async (id: string, payload: Partial<Routine>) => {
    return await updateMutation.mutateAsync({ id, payload });
  };

  const deleteRoutine = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  const fetchRoutinesByClassRoom = useCallback(
    async (classRoomId: string): Promise<Record<string, Routine[]>> => {
      setIsManualFetchEnabled(true);
      setAdditionalLoading(true);
      try {
        const res = await api.get(`/routines/classroom/${classRoomId}`);
        const grouped = res.data.data as Record<string, Routine[]>;
        setAdditionalRoutines(Object.values(grouped).flat());
        return grouped;
      } catch (err) {
        setAdditionalRoutines([]);
        return {};
      } finally {
        setAdditionalLoading(false);
      }
    },
    [],
  );

  const fetchRoutinesByTeacher = useCallback(
    async (teacherId: string): Promise<Record<string, Routine[]>> => {
      const res = await api.get(`/routines/teacher/${teacherId}`);
      return res.data.data as Record<string, Routine[]>;
    },
    [],
  );

  return {
    routines: additionalRoutines !== null ? additionalRoutines : (listQuery.data?.data || []),
    routine,
    pagination: listQuery.data?.pagination || null,
    loading: ((autoFetch || isManualFetchEnabled) && listQuery.isPending) || listQuery.isFetching || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || additionalLoading,
    error: listQuery.error ? listQuery.error.message : null,
    fetchRoutines,
    fetchRoutine,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    fetchRoutinesByClassRoom,
    fetchRoutinesByTeacher,
  };
}
