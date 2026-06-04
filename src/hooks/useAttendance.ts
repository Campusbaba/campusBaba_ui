"use client";
import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import type { Attendance, Pagination } from "@/types/viewModels";

export function useAttendance(initialParams = {}, autoFetch = true) {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendances = useCallback(
    async (params: Record<string, unknown> = initialParams) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/attendance", {
          params: { page: 1, limit: 20, ...params },
        });
        setAttendances(res.data.data);
        setPagination(res.data.pagination ?? null);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (autoFetch) fetchAttendances();
  }, [fetchAttendances, autoFetch]);

  const fetchTodayAttendance = useCallback(
    async (classRoomId?: string) => {
      const today = new Date().toISOString().slice(0, 10);
      const params: Record<string, unknown> = { startDate: today, endDate: today + "T23:59:59", limit: 500 };
      if (classRoomId) params.classRoomId = classRoomId;
      const res = await api.get("/attendance", { params });
      const map: Record<string, string> = {};
      for (const a of res.data.data as Attendance[]) {
        const sid = typeof a.studentId === "object" ? (a.studentId as { _id: string })._id : a.studentId;
        map[sid] = a.status;
      }
      return map;
    },
    [],
  );

  const createAttendance = async (payload: Partial<Attendance>) => {
    const res = await api.post("/attendance", payload);
    await fetchAttendances();
    return res.data.data;
  };

  const updateAttendance = async (id: string, payload: Partial<Attendance>) => {
    const res = await api.put(`/attendance/${id}`, payload);
    await fetchAttendances();
    return res.data.data;
  };

  const deleteAttendance = async (id: string) => {
    await api.delete(`/attendance/${id}`);
    await fetchAttendances();
  };

  return {
    attendances,
    pagination,
    loading,
    error,
    fetchAttendances,
    createAttendance,
    updateAttendance,
    deleteAttendance,
    fetchTodayAttendance,
  };
}
