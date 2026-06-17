"use client";
import { useState, useCallback } from "react";
import api from "@/lib/axios";
import type { ExamMark } from "@/types/viewModels";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useExamMarks() {
  const queryClient = useQueryClient();
  const [examId, setExamId] = useState<string | null>(null);
  const [additionalLoading, setAdditionalLoading] = useState(false);

  const listQuery = useQuery({
    queryKey: ["examMarks", { examId }],
    queryFn: async () => {
      if (!examId) return [];
      const res = await api.get("/exams/marks", {
        params: { examId, limit: 200 },
      });
      return (res.data.data ?? []) as ExamMark[];
    },
    enabled: !!examId,
  });

  const fetchMarks = useCallback(async (id: string) => {
    setExamId(id);
  }, []);

  const createMark = async (payload: {
    examId: string;
    studentId: string;
    marksObtained: number;
    grade?: string;
    remarks?: string;
    status?: string;
  }) => {
    const res = await api.post("/exams/marks", payload);
    queryClient.invalidateQueries({ queryKey: ["examMarks"] });
    return res.data.data as ExamMark;
  };

  const updateMark = async (
    id: string,
    payload: Partial<{
      marksObtained: number;
      grade: string;
      remarks: string;
      status: string;
    }>,
  ) => {
    const res = await api.put(`/exams/marks/${id}`, payload);
    queryClient.invalidateQueries({ queryKey: ["examMarks"] });
    return res.data.data as ExamMark;
  };

  const deleteMark = async (id: string) => {
    await api.delete(`/exams/marks/${id}`);
    queryClient.invalidateQueries({ queryKey: ["examMarks"] });
  };

  const fetchMarksByClassRoom = useCallback(
    async (classRoomId: string, params: Record<string, unknown> = {}) => {
      setAdditionalLoading(true);
      try {
        const res = await api.get(`/exams/marks/classroom/${classRoomId}`, {
          params: { page: 1, limit: 200, ...params },
        });
        return res.data.data as ExamMark[];
      } catch {
        return [];
      } finally {
        setAdditionalLoading(false);
      }
    },
    [],
  );

  const fetchMarksByClassRooms = useCallback(
    async (classRoomIds: string[], params: Record<string, unknown> = {}) => {
      setAdditionalLoading(true);
      try {
        const promises = classRoomIds.map((id) =>
          api.get(`/exams/marks/classroom/${id}`, {
            params: { page: 1, limit: 200, ...params },
          }),
        );
        const results = await Promise.all(promises);
        const allMarks = results.flatMap((res) => res.data.data);
        return allMarks as ExamMark[];
      } catch {
        return [];
      } finally {
        setAdditionalLoading(false);
      }
    },
    [],
  );

  const fetchStudentExamResults = useCallback(async (studentId: string) => {
    setAdditionalLoading(true);
    try {
      const res = await api.get(`/exams/marks/student/${studentId}`);
      const data: ExamMark[] = res.data.data ?? [];
      return data;
    } catch {
      return [];
    } finally {
      setAdditionalLoading(false);
    }
  }, []);

  return {
    marks: listQuery.data || [],
    loading: listQuery.isPending || listQuery.isFetching || additionalLoading,
    fetchMarks,
    createMark,
    updateMark,
    deleteMark,
    fetchMarksByClassRoom,
    fetchMarksByClassRooms,
    fetchStudentExamResults,
  };
}
