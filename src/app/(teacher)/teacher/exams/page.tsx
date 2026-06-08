"use client";
import { useState, useEffect, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/datatable/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormDialog } from "@/components/reusable/FormDialog";
import { ConfirmDialog } from "@/components/reusable/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormCombobox } from "@/components/reusable/FormCombobox";
import { useExams } from "@/hooks/useExams";
import { useClassRooms } from "@/hooks/useClassRooms";
import { useAuth } from "@/hooks/useAuth";
import { Exam, ClassRoom } from "@/types/viewModels";
import { formatDate } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

type TF = {
    examId: string;
    name: string;
    examType: string;
    classRoomId: string;
    date: string;
    startTime: string;
    endTime: string;
    totalMarks: string;
    passingMarks: string;
    instructions: string;
    status: string;
};
const blank: TF = {
    examId: "",
    name: "",
    examType: "midterm",
    classRoomId: "",
    date: "",
    startTime: "",
    endTime: "",
    totalMarks: "",
    passingMarks: "",
    instructions: "",
    status: "scheduled",
};

const examTypeOptions = [
    { value: "midterm", label: "Midterm" },
    { value: "final", label: "Final" },
    { value: "quiz", label: "Quiz" },
    { value: "assignment", label: "Assignment" },
    { value: "practical", label: "Practical" },
];

const statusOptions = [
    { value: "scheduled", label: "Scheduled" },
    { value: "ongoing", label: "Ongoing" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
];

export default function TeacherExamsPage() {
    const { t } = useTranslation();
    const { referenceId } = useAuth();
    const { classRooms, loading: classRoomsLoading } = useClassRooms({}, true, referenceId);
    const { exams, loading, fetchExamsByClassRooms, createExam, updateExam, deleteExam } = useExams({}, false);

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Exam | null>(null);
    const [form, setForm] = useState<TF>(blank);
    const [confirm, setConfirm] = useState<Exam | null>(null);
    const [busy, setBusy] = useState(false);

    const f = (k: keyof TF, v: string) => setForm((p) => ({ ...p, [k]: v }));

    // Get course ID from selected classroom
    const selectedClassRoom = classRooms.find((cr) => cr._id === form.classRoomId);
    const courseId = selectedClassRoom
        ? typeof selectedClassRoom.courseId === "object"
            ? (selectedClassRoom.courseId as { _id: string })._id
            : selectedClassRoom.courseId
        : "";

    useEffect(() => {
        if (classRooms.length > 0) {
            const classRoomIds = classRooms.map((cr) => cr._id);
            fetchExamsByClassRooms(classRoomIds);
        }
    }, [classRooms, fetchExamsByClassRooms]);

    function openAdd() {
        setEditing(null);
        setForm(blank);
        setOpen(true);
    }

    function openEdit(ex: Exam) {
        setEditing(ex);
        setForm({
            examId: ex.examId,
            name: ex.name,
            examType: ex.examType,
            classRoomId: String(
                typeof ex.classRoomId === "object"
                    ? (ex.classRoomId as { _id: string })._id
                    : ex.classRoomId
            ),
            date: ex.date?.slice(0, 10) ?? "",
            startTime: ex.startTime,
            endTime: ex.endTime,
            totalMarks: String(ex.totalMarks),
            passingMarks: String(ex.passingMarks),
            instructions: ex.instructions ?? "",
            status: ex.status,
        });
        setOpen(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        try {
            const payload = {
                ...form,
                courseId,
                totalMarks: Number(form.totalMarks),
                passingMarks: Number(form.passingMarks),
                examType: form.examType as "midterm" | "final" | "quiz" | "assignment" | "practical",
                status: form.status as "scheduled" | "ongoing" | "completed" | "cancelled",
            };
            if (editing) {
                await updateExam(editing._id, payload);
                toast.success(t("teacherPortal.exams.examUpdated"));
            } else {
                await createExam(payload);
                toast.success(t("teacherPortal.exams.examCreated"));
            }
            setOpen(false);
            // Refresh exams
            if (classRooms.length > 0) {
                const classRoomIds = classRooms.map((cr) => cr._id);
                fetchExamsByClassRooms(classRoomIds);
            }
        } catch {
            toast.error(t("teacherPortal.exams.failedToSave"));
        } finally {
            setBusy(false);
        }
    }

    async function handleDelete() {
        if (!confirm) return;
        setBusy(true);
        try {
            await deleteExam(confirm._id);
            toast.success(t("teacherPortal.exams.examDeleted"));
            setConfirm(null);
            // Refresh exams
            if (classRooms.length > 0) {
                const classRoomIds = classRooms.map((cr) => cr._id);
                fetchExamsByClassRooms(classRoomIds);
            }
        } catch {
            toast.error(t("teacherPortal.exams.failedToDelete"));
        } finally {
            setBusy(false);
        }
    }

    const columns: ColumnDef<Exam, unknown>[] = [
        { id: "examId", accessorKey: "examId", header: t("teacherPortal.exams.examIdHeader") },
        { id: "name", accessorKey: "name", header: t("teacherPortal.exams.examHeader") },
        { id: "examType", accessorKey: "examType", header: t("teacherPortal.exams.typeHeader") },
        {
            id: "course",
            header: t("teacherPortal.exams.courseHeader"),
            accessorFn: (r) =>
                (r.courseId as { name?: string })?.name ?? String(r.courseId),
        },
        {
            id: "class",
            header: t("teacherPortal.exams.classHeader"),
            accessorFn: (r) =>
                (r.classRoomId as { name?: string })?.name ?? String(r.classRoomId),
        },
        { id: "date", header: t("teacherPortal.exams.dateHeader"), accessorFn: (r) => formatDate(r.date) },
        {
            id: "time",
            header: t("teacherPortal.exams.timeHeader"),
            accessorFn: (r) => `${r.startTime} - ${r.endTime}`,
        },
        { id: "totalMarks", accessorKey: "totalMarks", header: t("teacherPortal.exams.totalHeader") },
        { id: "passingMarks", accessorKey: "passingMarks", header: t("teacherPortal.exams.passHeader") },
        {
            id: "status",
            header: t("teacherPortal.exams.statusHeader"),
            accessorKey: "status",
            cell: ({ getValue }) => {
                const status = String(getValue());
                const variant =
                    status === "completed"
                        ? "default"
                        : status === "scheduled"
                            ? "secondary"
                            : "secondary";
                return <Badge variant={variant}>{status}</Badge>;
            },
        },
        {
            id: "actions",
            header: "",
            cell: ({ row: { original: r } }) => (
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                        <Pencil size={13} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
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
            <Header title={t("teacherPortal.exams.title")} />
            <main className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-[--foreground]">{t("teacherPortal.exams.myExams")}</h2>
                        <p className="text-sm text-[--muted-foreground]">
                            {t("teacherPortal.exams.examCount", { count: exams.length })}
                        </p>
                    </div>
                    <Button onClick={openAdd}>
                        <Plus size={15} className="mr-1" />
                        {t("teacherPortal.exams.addExam")}
                    </Button>
                </div>
                {loading || classRoomsLoading ? (
                    <div className="card p-10 text-center text-[--muted-foreground] text-sm">
                        {t("teacherPortal.exams.loading")}
                    </div>
                ) : exams.length === 0 ? (
                    <div className="card p-10 text-center text-[--muted-foreground] text-sm">
                        {t("teacherPortal.exams.noExams")}
                    </div>
                ) : (
                    <DataTable
                        data={exams}
                        columns={columns}
                        title="Exams"
                        exportFilename="teacher-exams"
                    />
                )}
            </main>

            {/* Create/Edit Form Dialog */}
            <FormDialog
                open={open}
                onClose={() => setOpen(false)}
                title={editing ? t("teacherPortal.exams.editExam") : t("teacherPortal.exams.createExam")}
            >
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>{t("teacherPortal.exams.examIdLabel")}</Label>
                            <Input
                                type="text"
                                value={form.examId}
                                onChange={(e) => f("examId", e.target.value)}
                                required
                                placeholder={t("teacherPortal.exams.examIdPlaceholder")}
                            />
                        </div>
                        <div>
                            <Label>{t("teacherPortal.exams.examNameLabel")}</Label>
                            <Input
                                type="text"
                                value={form.name}
                                onChange={(e) => f("name", e.target.value)}
                                required
                                placeholder={t("teacherPortal.exams.examNamePlaceholder")}
                            />
                        </div>
                        <div>
                            <Label>{t("teacherPortal.exams.classroomLabel")}</Label>
                            <FormCombobox
                                items={classRooms}
                                value={form.classRoomId}
                                onValueChange={(v) => f("classRoomId", v)}
                                required
                                placeholder={t("teacherPortal.exams.selectClassroom")}
                                renderItem={(cr) =>
                                    `${cr.name}${cr.roomNumber ? ` — Room ${cr.roomNumber}` : ""}`
                                }
                                getItemValue={(cr) => cr._id}
                                getItemLabel={(cr) => `${cr.name}${cr.roomNumber ? ` — Room ${cr.roomNumber}` : ""}`}
                            />
                        </div>
                        <div>
                            <Label>{t("teacherPortal.exams.typeLabel")}</Label>
                            <FormCombobox
                                items={examTypeOptions}
                                value={form.examType}
                                onValueChange={(v) => f("examType", v)}
                                placeholder={t("teacherPortal.exams.selectExamType")}
                                renderItem={(opt) => opt.label}
                                getItemValue={(opt) => opt.value}
                                getItemLabel={(opt) => opt.label}
                            />
                        </div>
                        <div>
                            <Label>{t("teacherPortal.exams.date")}</Label>
                            <Input
                                type="date"
                                value={form.date}
                                onChange={(e) => f("date", e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>{t("teacherPortal.exams.startTime")}</Label>
                            <Input
                                type="time"
                                value={form.startTime}
                                onChange={(e) => f("startTime", e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>{t("teacherPortal.exams.endTime")}</Label>
                            <Input
                                type="time"
                                value={form.endTime}
                                onChange={(e) => f("endTime", e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>{t("teacherPortal.exams.totalMarksLabel")}</Label>
                            <Input
                                type="number"
                                value={form.totalMarks}
                                onChange={(e) => f("totalMarks", e.target.value)}
                                placeholder={t("teacherPortal.exams.totalMarksPlaceholder")}
                            />
                        </div>
                        <div>
                            <Label>{t("teacherPortal.exams.passingMarksLabel")}</Label>
                            <Input
                                type="number"
                                value={form.passingMarks}
                                onChange={(e) => f("passingMarks", e.target.value)}
                                placeholder={t("teacherPortal.exams.passingMarksPlaceholder")}
                            />
                        </div>
                        <div>
                            <Label>{t("teacherPortal.exams.statusLabel")}</Label>
                            <FormCombobox
                                items={statusOptions}
                                value={form.status}
                                onValueChange={(v) => f("status", v)}
                                placeholder={t("teacherPortal.exams.selectStatus")}
                                renderItem={(opt) => opt.label}
                                getItemValue={(opt) => opt.value}
                                getItemLabel={(opt) => opt.label}
                            />
                        </div>
                        <div className="col-span-2">
                            <Label>{t("teacherPortal.exams.instructionsLabel")}</Label>
                            <Input
                                value={form.instructions}
                                onChange={(e) => f("instructions", e.target.value)}
                                placeholder={t("teacherPortal.exams.instructionsPlaceholder")}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => setOpen(false)}
                        >
                            {t("teacherPortal.exams.cancel")}
                        </Button>
                        <Button size="sm" type="submit" disabled={busy}>
                            {busy ? t("teacherPortal.exams.saving") : editing ? t("teacherPortal.exams.update") : t("teacherPortal.exams.create")}
                        </Button>
                    </div>
                </form>
            </FormDialog>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={!!confirm}
                onClose={() => setConfirm(null)}
                onConfirm={handleDelete}
                loading={busy}
                message={t("teacherPortal.exams.deleteConfirm", { name: confirm?.name })}
            />
        </>
    );
}
