"use client";
import { useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/datatable/DataTable";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePayments } from "@/hooks/usePayments";
import { useParents } from "@/hooks/useParents";
import { useAuth } from "@/hooks/useAuth";
import { Payment } from "@/types/viewModels";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export default function ParentPaymentsPage() {
    const { t } = useTranslation();
    const { referenceId } = useAuth();
    const { children, fetchChildren } = useParents({}, false);
    const { payments, loading, fetchStudentPayments } = usePayments({}, false);
    const [selectedStudentId, setSelectedStudentId] = useState<string>("");

    useEffect(() => {
        if (!referenceId) return;
        fetchChildren(referenceId).then((kids) => {
            if (kids.length > 0) setSelectedStudentId(kids[0]._id);
        });
    }, [referenceId, fetchChildren]);

    useEffect(() => {
        if (!selectedStudentId) return;
        fetchStudentPayments(selectedStudentId);
    }, [selectedStudentId, fetchStudentPayments]);

    const columns: ColumnDef<Payment, unknown>[] = [
        { id: "paymentType", accessorKey: "paymentType", header: t("parentPortal.payments.typeHeader") },
        { id: "amount", header: t("parentPortal.payments.amountHeader"), accessorFn: (r) => formatCurrency(r.amount) },
        { id: "paymentMethod", accessorKey: "paymentMethod", header: t("parentPortal.payments.methodHeader") },
        { id: "dueDate", header: t("parentPortal.payments.dueDateHeader"), accessorFn: (r) => formatDate(r.dueDate) },
        { id: "paidDate", header: t("parentPortal.payments.paidDateHeader"), accessorFn: (r) => r.paidDate ? formatDate(r.paidDate) : "—" },
        { id: "academicYear", accessorKey: "academicYear", header: t("parentPortal.payments.academicYearHeader") },
        { id: "semester", accessorKey: "semester", header: t("parentPortal.payments.semesterHeader") },
        { id: "status", header: t("parentPortal.payments.statusHeader"), accessorKey: "paymentStatus", cell: ({ getValue }) => <Badge variant={String(getValue()) === "paid" ? "default" : "secondary"}>{String(getValue())}</Badge> },
    ];

    const selectedStudent = children.find((c) => c._id === selectedStudentId);

    return (
        <>
            <Header title={t("parentPortal.payments.title")} />
            <main className="p-5 space-y-4">
                {children.length > 1 && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-[--muted-foreground]">{t("parentPortal.payments.child")}</span>
                        <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                            <SelectTrigger className="w-52"><SelectValue placeholder={t("parentPortal.payments.selectChild")} /></SelectTrigger>
                            <SelectContent>
                                {children.map((c) => (
                                    <SelectItem key={c._id} value={c._id}>{c.firstName} {c.lastName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                <h2 className="text-base font-semibold text-[--foreground]">
                    {t("parentPortal.payments.paymentHistory")}{selectedStudent ? ` — ${selectedStudent.firstName} ${selectedStudent.lastName}` : ""}
                </h2>
                {loading ? (
                    <div className="card p-10 text-center text-[--muted-foreground] text-sm">{t("parentPortal.payments.loading")}</div>
                ) : (
                    <DataTable data={payments} columns={columns} title="Payments" exportFilename="parent-payments" />
                )}
            </main>
        </>
    );
}
