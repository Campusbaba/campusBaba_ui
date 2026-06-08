"use client";
import { useState, useEffect } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/datatable/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormDialog } from "@/components/reusable/FormDialog";
import { ConfirmDialog } from "@/components/reusable/ConfirmDialog";
import { InvoiceDialog } from "@/components/reusable/InvoiceDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormCombobox } from "@/components/reusable/FormCombobox";
import { usePayments } from "@/hooks/usePayments";
import { useStudents } from "@/hooks/useStudents";
import { useCourses } from "@/hooks/useCourses";
import { Payment, Enrollment, Student, Course } from "@/types/viewModels";
import {
    Plus, Pencil, Trash2, UserCheck, CreditCard,
    TrendingUp, Clock, AlertCircle, CheckCircle2, Eye,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useTranslation } from "react-i18next";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "payments" | "enrollments";

type TF = {
    studentId: string; courseId: string; amount: string;
    paymentType: string; paymentMethod: string; transactionId: string;
    dueDate: string; paidDate: string; paymentStatus: string;
    academicYear: string; semester: string; remarks: string;
};
const blank: TF = {
    studentId: "", courseId: "", amount: "", paymentType: "tuition",
    paymentMethod: "cash", transactionId: "", dueDate: "", paidDate: "",
    paymentStatus: "pending", academicYear: "", semester: "", remarks: "",
};

// ─── Options ──────────────────────────────────────────────────────────────────
const paymentTypeKeys = ["tuition", "exam", "library", "transport", "hostel", "other"] as const;
const paymentMethodKeys = ["cash", "card", "bank-transfer", "online"] as const;
const paymentStatusKeys = ["pending", "paid", "overdue", "cancelled"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function studentName(s: string | Student | undefined): string {
    if (!s) return "—";
    if (typeof s === "object") return `${s.firstName} ${s.lastName}`;
    return s;
}
function courseName(c: string | Course | undefined): string {
    if (!c) return "—";
    if (typeof c === "object") return `${c.name} (${c.code})`;
    return c;
}
function statusVariant(status: string) {
    switch (status) {
        case "paid": return "default";
        case "pending": return "secondary";
        case "overdue": return "destructive";
        case "cancelled": return "outline";
        default: return "secondary";
    }
}
function studentStatusVariant(status: string) {
    switch (status) {
        case "active": return "default";
        case "inactive": return "secondary";
        case "suspended": return "destructive";
        default: return "secondary";
    }
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: {
    label: string; value: string | number; icon: React.ElementType; color: string;
}) {
    return (
        <div className="card p-4 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${color}`}><Icon size={20} className="text-white" /></div>
            <div>
                <p className="text-xs text-[--muted-foreground]">{label}</p>
                <p className="text-lg font-bold">{value}</p>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PaymentsPage() {
    const { t } = useTranslation();
    const {
        payments, enrollments, stats, pagination, enrollmentPagination,
        loading, enrollmentsLoading,
        fetchEnrollments, fetchPayments,
        createPayment, updatePayment, deletePayment, activateStudent,
    } = usePayments();
    const { students } = useStudents();
    const { courses } = useCourses();

    const [tab, setTab] = useState<Tab>("payments");
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Payment | null>(null);
    const [form, setForm] = useState<TF>(blank);
    const [confirm, setConfirm] = useState<Payment | null>(null);
    const [invoice, setInvoice] = useState<Payment | null>(null);
    const [busy, setBusy] = useState(false);
    const [enrollmentFilter, setEnrollmentFilter] = useState("all");

    const paymentTypeOptions = paymentTypeKeys.map(v => ({ value: v, label: t(`payments.${v}`) }));
    const paymentMethodOptions = paymentMethodKeys.map(v => ({ value: v, label: t(`payments.${v}`) }));
    const paymentStatusOptions = paymentStatusKeys.map(v => ({ value: v, label: t(`payments.${v}`) }));

    const f = (k: keyof TF, v: string) => setForm(p => ({ ...p, [k]: v }));

    // Load enrollments when switching to that tab
    useEffect(() => {
        if (tab === "enrollments") fetchEnrollments();
    }, [tab, fetchEnrollments]);

    // Refetch enrollments when filter changes
    useEffect(() => {
        if (tab === "enrollments") {
            fetchEnrollments(enrollmentFilter !== "all" ? { paymentStatus: enrollmentFilter } : {});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enrollmentFilter]);

    function openAdd() { setEditing(null); setForm(blank); setOpen(true); }
    function openEdit(p: Payment) {
        setEditing(p);
        const sid = typeof p.studentId === "object" ? (p.studentId as Student)._id : p.studentId;
        const cid = typeof p.courseId === "object" ? (p.courseId as Course)._id : p.courseId;
        setForm({
            studentId: sid ?? "", courseId: cid ?? "",
            amount: String(p.amount), paymentType: p.paymentType,
            paymentMethod: p.paymentMethod ?? "cash",
            transactionId: p.transactionId ?? "",
            dueDate: p.dueDate?.slice(0, 10) ?? "",
            paidDate: p.paidDate?.slice(0, 10) ?? "",
            paymentStatus: p.paymentStatus,
            academicYear: p.academicYear, semester: p.semester,
            remarks: p.remarks ?? "",
        });
        setOpen(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault(); setBusy(true);
        try {
            const payload = {
                ...form,
                amount: Number(form.amount),
                paymentType: form.paymentType as Payment["paymentType"],
                paymentMethod: form.paymentMethod as Payment["paymentMethod"],
                paymentStatus: form.paymentStatus as Payment["paymentStatus"],
            };
            if (editing) {
                await updatePayment(editing._id, payload);
                toast.success(t("payments.updated"));
            } else {
                await createPayment(payload);
                toast.success(t("payments.created"));
            }
            setOpen(false);
        } catch { toast.error(t("payments.failedToSave")); } finally { setBusy(false); }
    }

    async function handleDelete() {
        if (!confirm) return; setBusy(true);
        try { await deletePayment(confirm._id); toast.success(t("payments.deleted")); setConfirm(null); }
        catch { toast.error(t("payments.failedToDelete")); } finally { setBusy(false); }
    }

    function openEditFromEnrollment(e: Enrollment) {
        setEditing({ _id: e._id } as Payment);
        setForm({
            studentId: e.student._id,
            courseId: e.course?._id ?? "",
            amount: String(e.amount),
            paymentType: e.paymentType,
            paymentMethod: "cash",
            transactionId: "",
            dueDate: e.dueDate?.slice(0, 10) ?? "",
            paidDate: e.paidDate?.slice(0, 10) ?? "",
            paymentStatus: e.paymentStatus,
            academicYear: e.academicYear,
            semester: e.semester,
            remarks: e.remarks ?? "",
        });
        setOpen(true);
    }

    async function handleActivate(enrollment: Enrollment) {
        setBusy(true);
        try {
            await activateStudent(enrollment._id);
            toast.success(`${enrollment.student.firstName} ${enrollment.student.lastName} ${t("payments.activated")}`);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg ?? t("payments.failedToActivate"));
        } finally { setBusy(false); }
    }

    // ─── Stats ───────────────────────────────────────────────────────────────
    const paidCount = stats?.byStatus.find(s => s._id === "paid")?.count ?? 0;
    const overdueCount = stats?.byStatus.find(s => s._id === "overdue")?.count ?? 0;

    // ─── Payment Columns ──────────────────────────────────────────────────────
    const paymentColumns: ColumnDef<Payment, unknown>[] = [
        { id: "paymentId", header: t("payments.paymentId"), accessorKey: "paymentId" },
        {
            id: "student", header: t("payments.student"),
            accessorFn: r => studentName(r.studentId as Student | string),
        },
        {
            id: "course", header: t("payments.course"),
            accessorFn: r => courseName(r.courseId as Course | string),
        },
        { id: "paymentType", accessorKey: "paymentType", header: t("payments.type") },
        { id: "amount", header: t("payments.amount"), accessorFn: r => formatCurrency(r.amount) },
        { id: "paymentMethod", accessorKey: "paymentMethod", header: t("payments.method") },
        { id: "academicYear", accessorKey: "academicYear", header: t("payments.year") },
        { id: "semester", accessorKey: "semester", header: t("payments.semester") },
        { id: "dueDate", header: t("payments.dueDate"), accessorFn: r => formatDate(r.dueDate) },
        { id: "paidDate", header: t("payments.paidDate"), accessorFn: r => formatDate(r.paidDate) },
        {
            id: "paymentStatus", header: t("payments.status"), accessorKey: "paymentStatus",
            cell: ({ getValue }) => {
                const v = String(getValue());
                return <Badge variant={statusVariant(v)}>{t(`payments.${v}`)}</Badge>;
            },
        },
        {
            id: "actions", header: "",
            cell: ({ row: { original: r } }) => (
                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="sm"
                        title={t("payments.viewInvoice")}
                        className="h-7 gap-1.5 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        onClick={() => setInvoice(r)}
                    >
                        <Eye size={12} />{t("payments.invoice")}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil size={13} /></Button>
                    <Button variant="ghost" size="icon" className="text-[--danger]" onClick={() => setConfirm(r)}><Trash2 size={13} /></Button>
                </div>
            ),
        },
    ];

    // ─── Enrollment Columns ───────────────────────────────────────────────────
    const enrollmentColumns: ColumnDef<Enrollment, unknown>[] = [
        {
            id: "studentId", header: t("payments.studentId"),
            accessorFn: r => r.student.studentId ?? "—",
        },
        {
            id: "studentName", header: t("payments.studentName"),
            accessorFn: r => `${r.student.firstName} ${r.student.lastName}`,
        },
        { id: "email", header: t("payments.email"), accessorFn: r => r.student.email },
        { id: "courseName", header: t("payments.course"), accessorFn: r => r.course?.name ?? "—" },
        { id: "courseCode", header: t("payments.code"), accessorFn: r => r.course?.code ?? "—" },
        { id: "paymentType", header: t("payments.feeType"), accessorFn: r => r.paymentType },
        { id: "amount", header: t("payments.amount"), accessorFn: r => formatCurrency(r.amount) },
        { id: "dueDate", header: t("payments.dueDate"), accessorFn: r => formatDate(r.dueDate) },
        { id: "paidDate", header: t("payments.paidDate"), accessorFn: r => formatDate(r.paidDate) },
        {
            id: "paymentStatus", header: t("payments.paymentStatus"),
            cell: ({ row: { original: r } }) => (
                <Badge variant={statusVariant(r.paymentStatus)}>{t(`payments.${r.paymentStatus}`)}</Badge>
            ),
        },
        {
            id: "studentStatus", header: t("payments.studentStatus"),
            cell: ({ row: { original: r } }) => (
                <Badge variant={studentStatusVariant(r.student.status)}>{r.student.status}</Badge>
            ),
        },
        {
            id: "actions", header: t("common.operations.actions"),
            cell: ({ row: { original: r } }) => {
                const canActivate = r.paymentStatus === "paid" && r.student.status !== "active";
                return (
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditFromEnrollment(r)}>
                            <Pencil size={13} />
                        </Button>
                        <Button
                            size="sm"
                            variant={canActivate ? "default" : "ghost"}
                            disabled={!canActivate || busy}
                            onClick={() => handleActivate(r)}
                            className="gap-1"
                        >
                            <UserCheck size={13} />
                            {r.student.status === "active" ? t("common.fields.active") : t("payments.activate")}
                        </Button>
                    </div>
                );
            },
        },
    ];

    return (
        <>
            <Header title={t("common.pages.payments")} />
            <main className="p-5 space-y-5">
                {/* ── Stats ─────────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label={t("payments.totalRevenue")} value={formatCurrency(stats?.totalRevenue ?? 0)} icon={TrendingUp} color="bg-green-500" />
                    <StatCard label={t("payments.pendingAmount")} value={formatCurrency(stats?.pendingAmount ?? 0)} icon={Clock} color="bg-yellow-500" />
                    <StatCard label={t("payments.paidPayments")} value={paidCount} icon={CheckCircle2} color="bg-blue-500" />
                    <StatCard label={t("payments.overdue")} value={overdueCount} icon={AlertCircle} color="bg-red-500" />
                </div>

                {/* ── Tabs ──────────────────────────────────────────── */}
                <div className="flex items-center gap-2 border-b border-[--border]">
                    <button
                        onClick={() => setTab("payments")}
                        className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${tab === "payments" ? "border-[--primary] text-[--primary]" : "border-transparent text-[--muted-foreground]"}`}
                    >
                        <CreditCard size={14} className="inline mr-1 mb-0.5" />{t("payments.allPaymentsTab")}
                    </button>
                    <button
                        onClick={() => setTab("enrollments")}
                        className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${tab === "enrollments" ? "border-[--primary] text-[--primary]" : "border-transparent text-[--muted-foreground]"}`}
                    >
                        <UserCheck size={14} className="inline mr-1 mb-0.5" />{t("payments.enrollments")}
                    </button>
                </div>

                {/* ── Payments Tab ──────────────────────────────────── */}
                {tab === "payments" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-semibold">{t("payments.allPayments")}</h2>
                                <p className="text-sm text-[--muted-foreground]">{pagination?.totalItems ?? 0} {t("payments.totalRecords")}</p>
                            </div>
                            <Button onClick={openAdd}><Plus size={15} className="mr-1" />{t("payments.addPayment")}</Button>
                        </div>
                        {loading
                            ? <div className="card p-10 text-center text-sm text-[--muted-foreground]">{t("payments.loading")}</div>
                            : <DataTable data={payments} columns={paymentColumns} title={t("common.pages.payments")} exportFilename="payments" />
                        }
                    </div>
                )}

                {/* ── Enrollments Tab ───────────────────────────────── */}
                {tab === "enrollments" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div>
                                <h2 className="text-base font-semibold">{t("payments.studentEnrollments")}</h2>
                                <p className="text-sm text-[--muted-foreground]">{enrollmentPagination?.totalItems ?? 0} {t("payments.totalRecords")}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Label className="text-sm whitespace-nowrap">{t("payments.filterByStatus")}</Label>
                                <FormCombobox
                                    items={paymentStatusOptions}
                                    value={enrollmentFilter}
                                    onValueChange={setEnrollmentFilter}
                                    placeholder={t("payments.selectStatus")}
                                    renderItem={opt => opt.label}
                                    getItemValue={opt => opt.value}
                                    getItemLabel={opt => opt.label}
                                />
                            </div>
                        </div>
                        {enrollmentsLoading
                            ? <div className="card p-10 text-center text-sm text-[--muted-foreground]">{t("payments.loading")}</div>
                            : <DataTable data={enrollments} columns={enrollmentColumns} title={t("payments.enrollments")} exportFilename="enrollments" />
                        }
                    </div>
                )}
            </main>

            {/* ── Add / Edit Payment Dialog ─────────────────────────── */}
            <FormDialog className="w-200" open={open} onClose={() => setOpen(false)} title={editing ? t("payments.editPayment") : t("payments.addPayment")}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        {/* Student */}
                        <div className="col-span-2 md:col-span-1">
                            <Label>{t("payments.student")} <span className="text-red-500">*</span></Label>
                            <FormCombobox
                                items={students}
                                value={form.studentId}
                                onValueChange={v => f("studentId", v)}
                                placeholder={t("payments.selectStudent")}
                                renderItem={s => `${s.firstName} ${s.lastName} ${s.studentId ? `(${s.studentId})` : ""}`}
                                getItemValue={s => s._id}
                                getItemLabel={s => `${s.firstName} ${s.lastName} ${s.studentId ? `(${s.studentId})` : ""}`}
                            />
                        </div>

                        {/* Course */}
                        <div className="col-span-2 md:col-span-1">
                            <Label>{t("payments.course")} <span className="text-red-500">*</span></Label>
                            <FormCombobox
                                items={courses}
                                value={form.courseId}
                                onValueChange={v => f("courseId", v)}
                                placeholder={t("payments.selectCourse")}
                                renderItem={c => `${c.name} (${c.code})`}
                                getItemValue={c => c._id}
                                getItemLabel={c => `${c.name} (${c.code})`}
                            />
                        </div>

                        {/* Amount */}
                        <div>
                            <Label>{t("payments.amount")} <span className="text-red-500">*</span></Label>
                            <Input type="number" value={form.amount} onChange={e => f("amount", e.target.value)} required min={0} />
                        </div>

                        {/* Payment Type */}
                        <div>
                            <Label>{t("payments.paymentType")}</Label>
                            <FormCombobox
                                items={paymentTypeOptions}
                                value={form.paymentType}
                                onValueChange={v => f("paymentType", v)}
                                placeholder={t("payments.selectPaymentType")}
                                renderItem={o => o.label}
                                getItemValue={o => o.value}
                                getItemLabel={o => o.label}

                            />
                        </div>

                        {/* Payment Method */}
                        <div>
                            <Label>{t("payments.paymentMethod")}</Label>
                            <FormCombobox
                                items={paymentMethodOptions}
                                value={form.paymentMethod}
                                onValueChange={v => f("paymentMethod", v)}
                                placeholder={t("payments.selectPaymentMethod")}
                                renderItem={o => o.label}
                                getItemValue={o => o.value}
                                getItemLabel={o => o.label}

                            />
                        </div>

                        {/* Status */}
                        <div>
                            <Label>{t("payments.paymentStatus")}</Label>
                            <FormCombobox
                                items={paymentStatusOptions}
                                value={form.paymentStatus}
                                onValueChange={v => f("paymentStatus", v)}
                                placeholder={t("payments.selectPaymentStatus")}
                                renderItem={o => o.label}
                                getItemValue={o => o.value}
                                getItemLabel={o => o.label}
                            />
                        </div>

                        {/* Transaction ID */}
                        <div>
                            <Label>{t("payments.transactionId")}</Label>
                            <Input value={form.transactionId} onChange={e => f("transactionId", e.target.value)} placeholder={t("payments.optional")} />
                        </div>

                        {/* Due Date */}
                        <div>
                            <Label>{t("payments.dueDate")} <span className="text-red-500">*</span></Label>
                            <Input type="date" value={form.dueDate} onChange={e => f("dueDate", e.target.value)} required />
                        </div>

                        {/* Paid Date */}
                        <div>
                            <Label>{t("payments.paidDate")}</Label>
                            <Input type="date" value={form.paidDate} onChange={e => f("paidDate", e.target.value)} />
                        </div>

                        {/* Academic Year */}
                        <div>
                            <Label>{t("payments.academicYear")} <span className="text-red-500">*</span></Label>
                            <Input value={form.academicYear} onChange={e => f("academicYear", e.target.value)} placeholder="e.g. 2024-2025" required />
                        </div>

                        {/* Semester */}
                        <div>
                            <Label>{t("payments.semester")} <span className="text-red-500">*</span></Label>
                            <Input value={form.semester} onChange={e => f("semester", e.target.value)} placeholder="e.g. Spring 2025" required />
                        </div>

                        {/* Remarks */}
                        <div className="col-span-2">
                            <Label>{t("payments.remarks")}</Label>
                            <Input value={form.remarks} onChange={e => f("remarks", e.target.value)} placeholder={t("payments.optionalNotes")} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                        <Button variant="outline" size="sm" type="button" onClick={() => setOpen(false)}>{t("common.operations.cancel")}</Button>
                        <Button size="sm" type="submit" disabled={busy || !form.studentId || !form.courseId}>
                            {busy ? t("common.operations.saving") : editing ? t("common.operations.update") : t("common.operations.create")}
                        </Button>
                    </div>
                </form>
            </FormDialog >

            <InvoiceDialog open={!!invoice} onClose={() => setInvoice(null)} payment={invoice} />

            {/* ── Delete Confirm ────────────────────────────────────── */}
            < ConfirmDialog
                open={!!confirm
                } onClose={() => setConfirm(null)}
                onConfirm={handleDelete} loading={busy}
                message={t("payments.deleteConfirmMessage")}
            />
        </>
    );
}