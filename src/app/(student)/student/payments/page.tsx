"use client";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ColumnDef } from "@tanstack/react-table";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/datatable/DataTable";
import { Badge } from "@/components/ui/badge";
import { usePayments } from "@/hooks/usePayments";
import { useAuth } from "@/hooks/useAuth";
import { Payment } from "@/types/viewModels";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function StudentPaymentsPage() {
    const { t } = useTranslation();
    const { referenceId } = useAuth();
    const { payments, loading, fetchStudentPayments } = usePayments({}, false);

    useEffect(() => {
        if (!referenceId) return;
        fetchStudentPayments(referenceId);
    }, [referenceId, fetchStudentPayments]);

    const columns: ColumnDef<Payment, unknown>[] = [
        { id: "academicYear", header: t("studentPortal.payments.year"), accessorKey: "academicYear" },
        { id: "semester", header: t("studentPortal.payments.semester"), accessorKey: "semester" },
        {
            id: "paymentType", header: t("studentPortal.payments.type"),
            accessorFn: (r) => r.paymentType ? r.paymentType.charAt(0).toUpperCase() + r.paymentType.slice(1) : t("studentPortal.payments.unknown")
        },
        {
            id: "amount", header: t("studentPortal.payments.amount"),
            accessorFn: (r) => formatCurrency(r.amount)
        },
        { id: "dueDate", header: t("studentPortal.payments.dueDate"), accessorFn: (r) => formatDate(r.dueDate) },
        {
            id: "paidDate", header: t("studentPortal.payments.paidDate"),
            accessorFn: (r) => r.paidDate ? formatDate(r.paidDate) : "—"
        },
        {
            id: "paymentStatus", header: t("studentPortal.payments.status"), accessorKey: "paymentStatus",
            cell: ({ getValue }) => {
                const status = String(getValue());
                const variant = status === "paid" ? "default" : status === "pending" ? "secondary" : "destructive";
                return <Badge variant={variant as any} className="capitalize">{status}</Badge>;
            }
        },
    ];

    return (
        <>
            <Header title={t("studentPortal.payments.myPayments")} />
            <main className="p-5 space-y-4">
                <h2 className="text-base font-semibold text-[--foreground]">{t("studentPortal.payments.paymentHistory")}</h2>
                {loading ? (
                    <div className="card p-10 text-center text-[--muted-foreground] text-sm">{t("studentPortal.payments.loading")}</div>
                ) : (
                    <DataTable data={payments} columns={columns} title={t("studentPortal.payments.payments")} exportFilename="my-payments" />
                )}
            </main>
        </>
    );
}
