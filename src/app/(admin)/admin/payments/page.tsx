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
const paymentTypeOptions = [
    { value: "tuition", label: "Tuition" }, { value: "exam", label: "Exam" },
    { value: "library", label: "Library" }, { value: "transport", label: "Transport" },
    { value: "hostel", label: "Hostel" }, { value: "other", label: "Other" },
];
const paymentMethodOptions = [
    { value: "cash", label: "Cash" }, { value: "card", label: "Card" },
    { value: "bank-transfer", label: "Bank Transfer" }, { value: "online", label: "Online" },
];
const paymentStatusOptions = [
    { value: "pending", label: "Pending" }, { value: "paid", label: "Paid" },
    { value: "overdue", label: "Overdue" }, { value: "cancelled", label: "Cancelled" },
];

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
                toast.success("Payment updated");
            } else {
                await createPayment(payload);
                toast.success("Payment created");
            }
            setOpen(false);
        } catch { toast.error("Failed to save payment"); } finally { setBusy(false); }
    }

    async function handleDelete() {
        if (!confirm) return; setBusy(true);
        try { await deletePayment(confirm._id); toast.success("Payment deleted"); setConfirm(null); }
        catch { toast.error("Failed to delete"); } finally { setBusy(false); }
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
            toast.success(`${enrollment.student.firstName} ${enrollment.student.lastName} activated`);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg ?? "Failed to activate student");
        } finally { setBusy(false); }
    }

    // ─── Stats ───────────────────────────────────────────────────────────────
    const paidCount = stats?.byStatus.find(s => s._id === "paid")?.count ?? 0;
    const overdueCount = stats?.byStatus.find(s => s._id === "overdue")?.count ?? 0;

    // ─── Payment Columns ──────────────────────────────────────────────────────
    const paymentColumns: ColumnDef<Payment, unknown>[] = [
        { id: "paymentId", header: "Payment ID", accessorKey: "paymentId" },
        {
            id: "student", header: "Student",
            accessorFn: r => studentName(r.studentId as Student | string),
        },
        {
            id: "course", header: "Course",
            accessorFn: r => courseName(r.courseId as Course | string),
        },
        { id: "paymentType", accessorKey: "paymentType", header: "Type" },
        { id: "amount", header: "Amount", accessorFn: r => formatCurrency(r.amount) },
        { id: "paymentMethod", accessorKey: "paymentMethod", header: "Method" },
        { id: "academicYear", accessorKey: "academicYear", header: "Year" },
        { id: "semester", accessorKey: "semester", header: "Semester" },
        { id: "dueDate", header: "Due Date", accessorFn: r => formatDate(r.dueDate) },
        { id: "paidDate", header: "Paid Date", accessorFn: r => formatDate(r.paidDate) },
        {
            id: "paymentStatus", header: "Status", accessorKey: "paymentStatus",
            cell: ({ getValue }) => {
                const v = String(getValue());
                return <Badge variant={statusVariant(v)}>{v}</Badge>;
            },
        },
        {
            id: "actions", header: "",
            cell: ({ row: { original: r } }) => (
                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="sm"
                        title="View Invoice"
                        className="h-7 gap-1.5 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        onClick={() => setInvoice(r)}
                    >
                        <Eye size={12} />Invoice
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
            id: "studentId", header: "Student ID",
            accessorFn: r => r.student.studentId ?? "—",
        },
        {
            id: "studentName", header: "Student Name",
            accessorFn: r => `${r.student.firstName} ${r.student.lastName}`,
        },
        { id: "email", header: "Email", accessorFn: r => r.student.email },
        { id: "courseName", header: "Course", accessorFn: r => r.course?.name ?? "—" },
        { id: "courseCode", header: "Code", accessorFn: r => r.course?.code ?? "—" },
        { id: "paymentType", header: "Fee Type", accessorFn: r => r.paymentType },
        { id: "amount", header: "Amount", accessorFn: r => formatCurrency(r.amount) },
        { id: "dueDate", header: "Due Date", accessorFn: r => formatDate(r.dueDate) },
        { id: "paidDate", header: "Paid Date", accessorFn: r => formatDate(r.paidDate) },
        {
            id: "paymentStatus", header: "Payment Status",
            cell: ({ row: { original: r } }) => (
                <Badge variant={statusVariant(r.paymentStatus)}>{r.paymentStatus}</Badge>
            ),
        },
        {
            id: "studentStatus", header: "Student Status",
            cell: ({ row: { original: r } }) => (
                <Badge variant={studentStatusVariant(r.student.status)}>{r.student.status}</Badge>
            ),
        },
        {
            id: "actions", header: "Actions",
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
                            {r.student.status === "active" ? "Active" : "Activate"}
                        </Button>
                    </div>
                );
            },
        },
    ];

    return (
        <>
            <Header title="Payments" />
            <main className="p-5 space-y-5">
                {/* ── Stats ─────────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Total Revenue" value={formatCurrency(stats?.totalRevenue ?? 0)} icon={TrendingUp} color="bg-green-500" />
                    <StatCard label="Pending Amount" value={formatCurrency(stats?.pendingAmount ?? 0)} icon={Clock} color="bg-yellow-500" />
                    <StatCard label="Paid Payments" value={paidCount} icon={CheckCircle2} color="bg-blue-500" />
                    <StatCard label="Overdue" value={overdueCount} icon={AlertCircle} color="bg-red-500" />
                </div>

                {/* ── Tabs ──────────────────────────────────────────── */}
                <div className="flex items-center gap-2 border-b border-[--border]">
                    <button
                        onClick={() => setTab("payments")}
                        className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${tab === "payments" ? "border-[--primary] text-[--primary]" : "border-transparent text-[--muted-foreground]"}`}
                    >
                        <CreditCard size={14} className="inline mr-1 mb-0.5" />All Payments
                    </button>
                    <button
                        onClick={() => setTab("enrollments")}
                        className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${tab === "enrollments" ? "border-[--primary] text-[--primary]" : "border-transparent text-[--muted-foreground]"}`}
                    >
                        <UserCheck size={14} className="inline mr-1 mb-0.5" />Enrollments
                    </button>
                </div>

                {/* ── Payments Tab ──────────────────────────────────── */}
                {tab === "payments" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-semibold">All Payments</h2>
                                <p className="text-sm text-[--muted-foreground]">{pagination?.totalItems ?? 0} total records</p>
                            </div>
                            <Button onClick={openAdd}><Plus size={15} className="mr-1" />Add Payment</Button>
                        </div>
                        {loading
                            ? <div className="card p-10 text-center text-sm text-[--muted-foreground]">Loading…</div>
                            : <DataTable data={payments} columns={paymentColumns} title="Payments" exportFilename="payments" />
                        }
                    </div>
                )}

                {/* ── Enrollments Tab ───────────────────────────────── */}
                {tab === "enrollments" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div>
                                <h2 className="text-base font-semibold">Student Enrollments</h2>
                                <p className="text-sm text-[--muted-foreground]">{enrollmentPagination?.totalItems ?? 0} total records</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Label className="text-sm whitespace-nowrap">Filter by status:</Label>
                                <FormCombobox
                                    items={paymentStatusOptions}
                                    value={enrollmentFilter}
                                    onValueChange={setEnrollmentFilter}
                                    placeholder="Select status"
                                    renderItem={opt => opt.label}
                                    getItemValue={opt => opt.value}
                                    getItemLabel={opt => opt.label}
                                />
                            </div>
                        </div>
                        {enrollmentsLoading
                            ? <div className="card p-10 text-center text-sm text-[--muted-foreground]">Loading…</div>
                            : <DataTable data={enrollments} columns={enrollmentColumns} title="Enrollments" exportFilename="enrollments" />
                        }
                    </div>
                )}
            </main>

            {/* ── Add / Edit Payment Dialog ─────────────────────────── */}
            <FormDialog className="w-200" open={open} onClose={() => setOpen(false)} title={editing ? "Edit Payment" : "Add Payment"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        {/* Student */}
                        <div className="col-span-2 md:col-span-1">
                            <Label>Student <span className="text-red-500">*</span></Label>
                            <FormCombobox
                                items={students}
                                value={form.studentId}
                                onValueChange={v => f("studentId", v)}
                                placeholder="Select student"
                                renderItem={s => `${s.firstName} ${s.lastName} ${s.studentId ? `(${s.studentId})` : ""}`}
                                getItemValue={s => s._id}
                                getItemLabel={s => `${s.firstName} ${s.lastName} ${s.studentId ? `(${s.studentId})` : ""}`}
                            />
                        </div>

                        {/* Course */}
                        <div className="col-span-2 md:col-span-1">
                            <Label>Course <span className="text-red-500">*</span></Label>
                            <FormCombobox
                                items={courses}
                                value={form.courseId}
                                onValueChange={v => f("courseId", v)}
                                placeholder="Select course"
                                renderItem={c => `${c.name} (${c.code})`}
                                getItemValue={c => c._id}
                                getItemLabel={c => `${c.name} (${c.code})`}
                            />
                        </div>

                        {/* Amount */}
                        <div>
                            <Label>Amount <span className="text-red-500">*</span></Label>
                            <Input type="number" value={form.amount} onChange={e => f("amount", e.target.value)} required min={0} />
                        </div>

                        {/* Payment Type */}
                        <div>
                            <Label>Payment Type</Label>
                            <FormCombobox
                                items={paymentTypeOptions}
                                value={form.paymentType}
                                onValueChange={v => f("paymentType", v)}
                                placeholder="Select payment type"
                                renderItem={o => o.label}
                                getItemValue={o => o.value}
                                getItemLabel={o => o.label}

                            />
                        </div>

                        {/* Payment Method */}
                        <div>
                            <Label>Payment Method</Label>
                            <FormCombobox
                                items={paymentMethodOptions}
                                value={form.paymentMethod}
                                onValueChange={v => f("paymentMethod", v)}
                                placeholder="Select payment method"
                                renderItem={o => o.label}
                                getItemValue={o => o.value}
                                getItemLabel={o => o.label}

                            />
                        </div>

                        {/* Status */}
                        <div>
                            <Label>Payment Status</Label>
                            <FormCombobox
                                items={paymentStatusOptions}
                                value={form.paymentStatus}
                                onValueChange={v => f("paymentStatus", v)}
                                placeholder="Select payment status"
                                renderItem={o => o.label}
                                getItemValue={o => o.value}
                                getItemLabel={o => o.label}
                            />
                        </div>

                        {/* Transaction ID */}
                        <div>
                            <Label>Transaction ID</Label>
                            <Input value={form.transactionId} onChange={e => f("transactionId", e.target.value)} placeholder="Optional" />
                        </div>

                        {/* Due Date */}
                        <div>
                            <Label>Due Date <span className="text-red-500">*</span></Label>
                            <Input type="date" value={form.dueDate} onChange={e => f("dueDate", e.target.value)} required />
                        </div>

                        {/* Paid Date */}
                        <div>
                            <Label>Paid Date</Label>
                            <Input type="date" value={form.paidDate} onChange={e => f("paidDate", e.target.value)} />
                        </div>

                        {/* Academic Year */}
                        <div>
                            <Label>Academic Year <span className="text-red-500">*</span></Label>
                            <Input value={form.academicYear} onChange={e => f("academicYear", e.target.value)} placeholder="e.g. 2024-2025" required />
                        </div>

                        {/* Semester */}
                        <div>
                            <Label>Semester <span className="text-red-500">*</span></Label>
                            <Input value={form.semester} onChange={e => f("semester", e.target.value)} placeholder="e.g. Spring 2025" required />
                        </div>

                        {/* Remarks */}
                        <div className="col-span-2">
                            <Label>Remarks</Label>
                            <Input value={form.remarks} onChange={e => f("remarks", e.target.value)} placeholder="Optional notes" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                        <Button variant="outline" size="sm" type="button" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button size="sm" type="submit" disabled={busy || !form.studentId || !form.courseId}>
                            {busy ? "Saving…" : editing ? "Update" : "Create"}
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
                message="Delete this payment record? This action cannot be undone."
            />
        </>
    );
}