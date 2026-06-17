"use client";
import { useState, useCallback } from "react";
import api from "@/lib/axios";
import type { Payment, Enrollment, Pagination } from "@/types/viewModels";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface PaymentStats {
  byStatus: { _id: string; count: number; totalAmount: number }[];
  totalRevenue: number;
  pendingAmount: number;
}

export function usePayments(initialParams = {}, autoFetch = true) {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<Record<string, unknown>>(initialParams);
  const [enrollmentParams, setEnrollmentParams] = useState<Record<string, unknown>>({});
  const [additionalLoading, setAdditionalLoading] = useState(false);
  const [studentPayments, setStudentPayments] = useState<Payment[] | null>(null);

  const paymentsQuery = useQuery({
    queryKey: ["payments", params],
    queryFn: async () => {
      const res = await api.get("/payments", {
        params: { page: 1, limit: 20, ...params },
      });
      return { data: res.data.data as Payment[], pagination: res.data.pagination ?? null };
    },
    enabled: autoFetch,
  });

  const enrollmentsQuery = useQuery({
    queryKey: ["enrollments", enrollmentParams],
    queryFn: async () => {
      const res = await api.get("/payments/enrollments", {
        params: { page: 1, limit: 50, ...enrollmentParams },
      });
      return { data: res.data.data as Enrollment[], pagination: res.data.pagination ?? null };
    },
    enabled: false, // Must be called imperatively based on original hook
  });

  const statsQuery = useQuery({
    queryKey: ["paymentStats", params],
    queryFn: async () => {
      const res = await api.get("/payments/stats", { params });
      return res.data.data as PaymentStats;
    },
    enabled: autoFetch,
  });

  const fetchPayments = useCallback(async (newParams?: Record<string, unknown>) => {
    if (newParams) {
      setParams(prev => ({ ...prev, ...newParams }));
    } else {
      await paymentsQuery.refetch();
    }
  }, [paymentsQuery]);

  const fetchEnrollments = useCallback(async (newParams: Record<string, unknown> = {}) => {
    setEnrollmentParams(newParams);
    await enrollmentsQuery.refetch();
  }, [enrollmentsQuery]);

  const fetchStats = useCallback(async () => {
    await statsQuery.refetch();
  }, [statsQuery]);

  const fetchStudentPayments = useCallback(async (studentId: string) => {
    setAdditionalLoading(true);
    try {
      const res = await api.get(`/payments/student/${studentId}`);
      setStudentPayments(res.data.data.payments);
    } catch {
      setStudentPayments([]);
    } finally {
      setAdditionalLoading(false);
    }
  }, []);

  const fetchAllChildrenPayments = useCallback(async (studentIds: string[]) => {
    setAdditionalLoading(true);
    try {
      const results = await Promise.all(
        studentIds.map((id) => api.get(`/payments/student/${id}`)),
      );
      const allPayments = results.flatMap(
        (res) => res.data.data.payments ?? [],
      );
      allPayments.sort(
        (a: Payment, b: Payment) =>
          new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime(),
      );
      setStudentPayments(allPayments);
    } catch {
      setStudentPayments([]);
    } finally {
      setAdditionalLoading(false);
    }
  }, []);

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<Payment>) => {
      const res = await api.post("/payments", payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["paymentStats"] });
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string, payload: Partial<Payment> }) => {
      const res = await api.put(`/payments/${id}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["paymentStats"] });
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["paymentStats"] });
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
    }
  });

  const activateMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const res = await api.patch(`/payments/${paymentId}/activate-student`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
    }
  });

  const createPayment = async (payload: Partial<Payment>) => {
    return await createMutation.mutateAsync(payload);
  };

  const updatePayment = async (id: string, payload: Partial<Payment>) => {
    return await updateMutation.mutateAsync({ id, payload });
  };

  const deletePayment = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  const activateStudent = async (paymentId: string) => {
    return await activateMutation.mutateAsync(paymentId);
  };

  return {
    payments: studentPayments !== null ? studentPayments : (paymentsQuery.data?.data || []),
    enrollments: enrollmentsQuery.data?.data || [],
    stats: statsQuery.data || null,
    pagination: paymentsQuery.data?.pagination || null,
    enrollmentPagination: enrollmentsQuery.data?.pagination || null,
    loading: paymentsQuery.isPending || paymentsQuery.isFetching || additionalLoading || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || activateMutation.isPending,
    enrollmentsLoading: enrollmentsQuery.isPending || enrollmentsQuery.isFetching,
    error: paymentsQuery.error ? paymentsQuery.error.message : null,
    fetchPayments,
    fetchStudentPayments,
    fetchAllChildrenPayments,
    fetchEnrollments,
    fetchStats,
    createPayment,
    updatePayment,
    deletePayment,
    activateStudent,
  };
}
