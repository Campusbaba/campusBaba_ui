"use client";
import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/datatable/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormDialog } from "@/components/reusable/FormDialog";
import { ConfirmDialog } from "@/components/reusable/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FormCombobox } from "@/components/reusable/FormCombobox";
import { useTranslation } from "react-i18next";
import { useTeacherNotices } from "@/hooks/useNotices";
import { useAuth } from "@/hooks/useAuth";
import { Notice } from "@/types/viewModels";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { formatDate } from "@/lib/utils";

type TF = {
    title: string;
    content: string;
    category: "general" | "academic" | "exam" | "event" | "holiday" | "urgent";
    targetAudience: ("student" | "parent")[];
    publishDate: string;
    expiryDate: string;
    priority: "low" | "medium" | "high";
    status: "draft" | "published" | "archived";
    createdBy: string;
    createdByModel: "Teacher" | "Employee";
};

const blank: TF = {
    title: "", content: "", category: "general",
    targetAudience: ["student", "parent"], publishDate: "", expiryDate: "",
    priority: "medium", status: "draft", createdBy: "", createdByModel: "Teacher",
};

const categoryOptions = [
    { value: "general", label: "General" },
    { value: "academic", label: "Academic" },
    { value: "exam", label: "Exam" },
    { value: "event", label: "Event" },
    { value: "holiday", label: "Holiday" },
    { value: "urgent", label: "Urgent" },
];
const priorityOptions = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
];
const statusOptions = [
    { value: "draft", label: "Draft" },
    { value: "published", label: "Published" },
    { value: "archived", label: "Archived" },
];
const targetAudienceOptions = [
    { value: "student", label: "Students" },
    { value: "parent", label: "Parents" },
];

export default function TeacherNoticesPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { notices, loading, pagination, createNotice, updateNotice, deleteNotice } =
        useTeacherNotices(user?.referenceId);

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Notice | null>(null);
    const [form, setForm] = useState<TF>(blank);
    const [confirm, setConfirm] = useState<Notice | null>(null);
    const [busy, setBusy] = useState(false);

    const f = (k: keyof TF, v: string) => setForm(p => ({ ...p, [k]: v }));

    const toggleAudience = (value: "student" | "parent") => {
        setForm(p => {
            const current = p.targetAudience;
            if (current.includes(value)) {
                const filtered = current.filter(v => v !== value);
                return { ...p, targetAudience: filtered.length > 0 ? filtered : current };
            }
            return { ...p, targetAudience: [...current, value] };
        });
    };

    function openAdd() {
        setEditing(null);
        setForm({ ...blank, createdBy: user?.referenceId ?? "", createdByModel: "Teacher" });
        setOpen(true);
    }

    function openEdit(n: Notice) {
        setEditing(n);
        setForm({
            title: n.title,
            content: n.content,
            category: n.category,
            targetAudience: Array.isArray(n.targetAudience)
                ? (n.targetAudience.filter(a => a === "student" || a === "parent") as ("student" | "parent")[])
                : [],
            publishDate: n.publishDate?.slice(0, 10) ?? "",
            expiryDate: n.expiryDate?.slice(0, 10) ?? "",
            priority: n.priority,
            status: n.status,
            createdBy: typeof n.createdBy === "string"
                ? n.createdBy
                : (n.createdBy?._id || user?.referenceId || ""),
            createdByModel: (n as any).createdByModel ?? "Teacher",
        });
        setOpen(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        try {
            const payload = { ...form };
            if (editing) {
                await updateNotice(editing._id, {
                    ...payload,
                    modifiedBy: user?.referenceId,
                    modifiedByModel: "Teacher",
                });
                toast.success(t("teacherPortal.notices.noticeUpdated"));
            } else {
                await createNotice(payload);
                toast.success(t("teacherPortal.notices.noticePublished"));
            }
            setOpen(false);
        } catch (err: any) {
            const message =
                err?.response?.data?.message ?? err?.message ?? "Something went wrong";
            toast.error(message);
        } finally {
            setBusy(false);
        }
    }

    async function handleDelete() {
        if (!confirm) return;
        setBusy(true);
        try {
            await deleteNotice(confirm._id);
            toast.success(t("teacherPortal.notices.noticeDeleted"));
            setConfirm(null);
        } catch {
            toast.error(t("teacherPortal.notices.failedToDelete"));
        } finally {
            setBusy(false);
        }
    }

    const columns: ColumnDef<Notice, unknown>[] = [
        { id: "title", accessorKey: "title", header: t("teacherPortal.notices.titleHeader") },
        {
            id: "content", accessorKey: "content", header: t("teacherPortal.notices.contentHeader"),
            cell: ({ getValue }) => (
                <textarea
                    readOnly
                    rows={3}
                    className="w-full resize-none bg-transparent text-sm leading-snug focus:outline-none"
                    value={String(getValue())}
                />
            ),
        },
        { id: "category", accessorKey: "category", header: t("teacherPortal.notices.categoryHeader") },
        {
            id: "targetAudience", header: t("teacherPortal.notices.audienceHeader"),
            accessorFn: r => Array.isArray(r.targetAudience)
                ? r.targetAudience.join(", ")
                : String(r.targetAudience),
        },
        {
            id: "priority", header: t("teacherPortal.notices.priorityHeader"), accessorKey: "priority",
            cell: ({ getValue }) => (
                <Badge variant={String(getValue()) === "high" ? "destructive" : "default"}>
                    {String(getValue())}
                </Badge>
            ),
        },
        {
            id: "publishDate", header: t("teacherPortal.notices.publishedHeader"),
            accessorFn: r => r.publishDate ? formatDate(r.publishDate) : "—",
        },
        {
            id: "expiryDate", header: t("teacherPortal.notices.expiresHeader"),
            accessorFn: r => r.expiryDate ? formatDate(r.expiryDate) : "—",
        },
        {
            id: "createdBy", header: t("teacherPortal.notices.createdByHeader"),
            accessorFn: r => {
                const cb = r.createdBy;
                if (typeof cb === "object" && cb !== null)
                    return `${(cb as any).firstName ?? ""} ${(cb as any).lastName ?? ""}`.trim();
                return cb ?? "—";
            },
        },
        {
            id: "modifiedBy", header: t("teacherPortal.notices.modifiedByHeader"),
            accessorFn: r => {
                if (!r.modifiedBy) return "—";
                if (typeof r.modifiedBy === "object")
                    return `${(r.modifiedBy as any).firstName ?? ""} ${(r.modifiedBy as any).lastName ?? ""}`.trim() || "—";
                return r.modifiedBy;
            },
        },
        {
            id: "status", header: t("teacherPortal.notices.statusHeader"), accessorKey: "status",
            cell: ({ getValue }) => (
                <Badge variant={String(getValue()) === "published" ? "default" : "secondary"}>
                    {String(getValue())}
                </Badge>
            ),
        },
        {
            id: "actions", header: "",
            cell: ({ row: { original: r } }) => (
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                        <Pencil size={13} />
                    </Button>
                    <Button
                        variant="ghost" size="icon"
                        className="text-[--danger]"
                        onClick={() => setConfirm(r)}
                    >
                        <Trash2 size={13} />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <>
            <Header title={t("teacherPortal.notices.title")} />
            <main className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold">{t("teacherPortal.notices.title")}</h2>
                        <p className="text-sm text-[--muted-foreground]">
                            {t("teacherPortal.notices.total", { count: pagination?.totalItems ?? notices.length })}
                        </p>
                    </div>
                    <Button onClick={openAdd}>
                        <Plus size={15} className="mr-1" />
                        {t("teacherPortal.notices.postNotice")}
                    </Button>
                </div>

                {loading
                    ? <div className="card p-10 text-center text-sm text-[--muted-foreground]">{t("teacherPortal.notices.loading")}</div>
                    : <DataTable data={notices} columns={columns} title={t("teacherPortal.notices.notices")} exportFilename="teacher-notices" />
                }
            </main>

            <FormDialog
                open={open}
                onClose={() => setOpen(false)}
                title={editing ? t("teacherPortal.notices.editNotice") : t("teacherPortal.notices.postNotice")}
            >
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <Label>{t("teacherPortal.notices.titleLabel")}</Label>
                            <Input value={form.title} onChange={e => f("title", e.target.value)} required />
                        </div>

                        <div>
                            <Label>{t("teacherPortal.notices.category")}</Label>
                            <FormCombobox
                                items={categoryOptions}
                                value={form.category}
                                onValueChange={v => f("category", v)}
                                placeholder={t("teacherPortal.notices.selectCategory")}
                                renderItem={opt => opt.label}
                                getItemValue={opt => opt.value}
                            />
                        </div>

                        <div>
                            <Label>{t("teacherPortal.notices.priority")}</Label>
                            <FormCombobox
                                items={priorityOptions}
                                value={form.priority}
                                onValueChange={v => f("priority", v)}
                                placeholder={t("teacherPortal.notices.selectPriority")}
                                renderItem={opt => opt.label}
                                getItemValue={opt => opt.value}
                            />
                        </div>

                        <div className="col-span-2">
                            <Label>{t("teacherPortal.notices.targetAudience")}</Label>
                            <div className="flex flex-wrap gap-4 mt-2">
                                {targetAudienceOptions.map(opt => (
                                    <div key={opt.value} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`audience-${opt.value}`}
                                            checked={form.targetAudience.includes(
                                                opt.value as "student" | "parent"
                                            )}
                                            onCheckedChange={() =>
                                                toggleAudience(
                                                    opt.value as "student" | "parent"
                                                )
                                            }
                                        />
                                        <label
                                            htmlFor={`audience-${opt.value}`}
                                            className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            {opt.label}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <Label>{t("teacherPortal.notices.statusLabel")}</Label>
                            <FormCombobox
                                items={statusOptions}
                                value={form.status}
                                onValueChange={v => f("status", v)}
                                placeholder={t("teacherPortal.notices.selectStatus")}
                                renderItem={opt => opt.label}
                                getItemValue={opt => opt.value}
                            />
                        </div>

                        <div>
                            <Label>{t("teacherPortal.notices.publishDate")}</Label>
                            <Input
                                type="date"
                                value={form.publishDate}
                                onChange={e => f("publishDate", e.target.value)}
                            />
                        </div>

                        <div>
                            <Label>{t("teacherPortal.notices.expiryDate")}</Label>
                            <Input
                                type="date"
                                value={form.expiryDate}
                                onChange={e => f("expiryDate", e.target.value)}
                            />
                        </div>

                        <div className="col-span-2">
                            <Label>{t("teacherPortal.notices.contentLabel")}</Label>
                            <textarea
                                className="flex min-h-24 w-full rounded border border-[--border] bg-[--card] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--ring]"
                                value={form.content}
                                onChange={e => f("content", e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" size="sm" type="button" onClick={() => setOpen(false)}>
                            {t("teacherPortal.notices.cancel")}
                        </Button>
                        <Button size="sm" type="submit" disabled={busy}>
                            {busy ? t("teacherPortal.notices.saving") : editing ? t("teacherPortal.notices.update") : t("teacherPortal.notices.publish")}
                        </Button>
                    </div>
                </form>
            </FormDialog>

            <ConfirmDialog
                open={!!confirm}
                onClose={() => setConfirm(null)}
                onConfirm={handleDelete}
                loading={busy}
                message={t("teacherPortal.notices.deleteConfirm", { title: confirm?.title })}
            />
        </>
    );
}
