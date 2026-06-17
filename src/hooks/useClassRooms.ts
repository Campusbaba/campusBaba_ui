"use client";
import { useState, useCallback } from "react";
import api from "@/lib/axios";
import type { ClassRoom, Pagination } from "@/types/viewModels";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useClassRooms(initialParams = {}, autoFetch = true) {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<Record<string, unknown>>(initialParams);
  const [classRoom, setClassRoom] = useState<ClassRoom | null>(null);

  const listQuery = useQuery({
    queryKey: ["classRooms", params],
    queryFn: async () => {
      const res = await api.get("/classrooms", {
        params: { page: 1, limit: 20, ...params },
      });
      return { data: res.data.data as ClassRoom[], pagination: res.data.pagination ?? null };
    },
    enabled: autoFetch,
  });

  const fetchClassRooms = useCallback(async (newParams?: Record<string, unknown>) => {
    if (newParams) {
      setParams(prev => ({ ...prev, ...newParams }));
    } else {
      await listQuery.refetch();
    }
  }, [listQuery]);

  const fetchClassRoom = useCallback(async (id: string) => {
    const res = await api.get(`/classrooms/${id}`);
    setClassRoom(res.data.data);
    return res.data.data as ClassRoom;
  }, []);

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<ClassRoom>) => {
      const res = await api.post("/classrooms", payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classRooms"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string, payload: Partial<ClassRoom> }) => {
      const res = await api.put(`/classrooms/${id}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classRooms"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/classrooms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classRooms"] });
    }
  });

  const createClassRoom = async (payload: Partial<ClassRoom>) => {
    return await createMutation.mutateAsync(payload);
  };

  const updateClassRoom = async (id: string, payload: Partial<ClassRoom>) => {
    return await updateMutation.mutateAsync({ id, payload });
  };

  const deleteClassRoom = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  return {
    classRooms: listQuery.data?.data || [],
    classRoom,
    pagination: listQuery.data?.pagination || null,
    loading: listQuery.isPending || listQuery.isFetching || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: listQuery.error ? listQuery.error.message : null,
    fetchClassRooms,
    fetchClassRoom,
    createClassRoom,
    updateClassRoom,
    deleteClassRoom,
  };
}
