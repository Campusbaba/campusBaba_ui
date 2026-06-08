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
import { FormCombobox } from "@/components/reusable/FormCombobox";
import { useExams } from "@/hooks/useExams";
import { useCourses } from "@/hooks/useCourses";
import { useClassRooms } from "@/hooks/useClassRooms";
import { Exam, Course, ClassRoom } from "@/types/viewModels";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { formatDate } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type TF = { examId: string, name: string; examType: string; courseId: string; classRoomId: string; date: string; startTime: string; endTime: string; totalMarks: string; passingMarks: string; instructions: string; status: string };
const blank: TF = { examId: "", name: "", examType: "midterm", courseId: "", classRoomId: "", date: "", startTime: "", endTime: "", totalMarks: "", passingMarks: "", instructions: "", status: "scheduled" };

export default function ExamsPage() {
    const { t } = useTranslation();
    const { exams, loading, pagination, createExam, updateExam, deleteExam } = useExams();
    const { courses } = useCourses();
    const { classRooms } = useClassRooms();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Exam | null>(null);
    const [form, setForm] = useState<TF>(blank);
    const [confirm, setConfirm] = useState<Exam | null>(null);
    const [busy, setBusy] = useState(false);
    const f = (k: keyof TF, v: string) => setForm(p => ({ ...p, [k]: v }));
    const filteredClassRooms = classRooms.filter(cr => {
        const id = typeof cr.courseId === "string" ? cr.courseId : (cr.courseId as any)?._id;
        return id === form.courseId;
    });

    const basicFields: { key: keyof TF; label: string; type: string; required: boolean; placeholder?: string }[] = [
        { key: "examId", label: t("exams.examId"), type: "text", required: true, placeholder: "e.g. CS-Q-25-01" },
        { key: "name", label: t("exams.examName"), type: "text", required: true, placeholder: "e.g. Mid-Term Examination" },
    ];

    const scheduleFields: { key: keyof TF; label: string; type: string; required: boolean; placeholder?: string }[] = [
        { key: "date", label: t("exams.date"), type: "date", required: false },
        { key: "startTime", label: t("exams.startTime"), type: "time", required: false },
        { key: "endTime", label: t("exams.endTime"), type: "time", required: false },
    ];

    const marksFields: { key: keyof TF; label: string; type: string; required: boolean; placeholder?: string }[] = [
        { key: "totalMarks", label: t("exams.totalMarks"), type: "number", required: false, placeholder: "e.g. 100" },
        { key: "passingMarks", label: t("exams.passingMarks"), type: "number", required: false, placeholder: "e.g. 40" },
    ];

    const examTypeOptions = [{ value: "midterm", label: t("exams.midterm") }, { value: "final", label: t("exams.final") }, { value: "quiz", label: t("exams.quiz") }, { value: "assignment", label: t("exams.assignment") }, { value: "practical", label: t("exams.practical") }];
    const statusOptions = [{ value: "scheduled", label: t("exams.scheduled") }, { value: "ongoing", label: t("exams.ongoing") }, { value: "completed", label: t("exams.completed") }, { value: "cancelled", label: t("exams.cancelled") }];

    function openAdd() { setEditing(null); setForm(blank); setOpen(true); }
    function openEdit(ex: Exam) {
        setEditing(ex);
        setForm({
            examId: ex.examId,
            name: ex.name, examType: ex.examType,
            courseId: String(typeof ex.courseId === "object" ? (ex.courseId as { _id: string })._id : ex.courseId),
            classRoomId: String(typeof ex.classRoomId === "object" ? (ex.classRoomId as { _id: string })._id : ex.classRoomId),
            date: ex.date?.slice(0, 10) ?? "", startTime: ex.startTime, endTime: ex.endTime,
            totalMarks: String(ex.totalMarks), passingMarks: String(ex.passingMarks),
            instructions: ex.instructions ?? "", status: ex.status
        });
        setOpen(true);
    }
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault(); setBusy(true);
        try {
            const payload = {
                ...form,
                totalMarks: Number(form.totalMarks),
                passingMarks: Number(form.passingMarks),
                examType: form.examType as "midterm" | "final" | "quiz" | "assignment" | "practical",
                status: form.status as "scheduled" | "ongoing" | "completed" | "cancelled"
            };
            if (editing) { await updateExam(editing._id, payload); toast.success(t("exams.examUpdated")); }
            else { await createExam(payload); toast.success(t("exams.examAdded")); }
            setOpen(false);
        } catch { toast.error(t("exams.failedToSave")); } finally { setBusy(false); }
    }
    async function handleDelete() {
        if (!confirm) return; setBusy(true);
        try { await deleteExam(confirm._id); toast.success(t("exams.examDeleted")); setConfirm(null); }
        catch { toast.error(t("exams.failedToDelete")); } finally { setBusy(false); }
    }

    const columns: ColumnDef<Exam, unknown>[] = [
        { id: "examId", accessorKey: "examId", header: t("exams.examId") },
        { id: "name", accessorKey: "name", header: t("exams.examName") },
        { id: "examType", accessorKey: "examType", header: t("exams.type") },
        { id: "course", header: t("exams.course"), accessorFn: r => { const c = r.courseId; return typeof c === "object" ? (c as { name: string }).name : String(c); } },
        { id: "class", header: t("exams.classroom"), accessorFn: r => { const c = r.classRoomId; return typeof c === "object" ? (c as { name: string }).name : String(c); } },
        { id: "date", header: t("exams.date"), accessorFn: r => formatDate(r.date) },
        { id: "time", header: t("exams.time"), accessorFn: r => `${r.startTime} - ${r.endTime}` },
        { id: "totalMarks", accessorKey: "totalMarks", header: t("exams.totalMarks") },
        { id: "passingMarks", accessorKey: "passingMarks", header: t("exams.passMarks") },
        { id: "status", header: t("exams.status"), accessorKey: "status", cell: ({ getValue }) => <Badge variant={String(getValue()) === "completed" ? "default" : String(getValue()) === "scheduled" ? "secondary" : "secondary"}>{String(getValue())}</Badge> },
        { id: "actions", header: "", cell: ({ row: { original: r } }) => (<div className="flex items-center gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil size={13} /></Button><Button variant="ghost" size="icon" className="text-[--danger]" onClick={() => setConfirm(r)}><Trash2 size={13} /></Button></div>) },
    ];

    return (
        <>
            <Header title={t("common.pages.exams")} />
            <main className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div><h2 className="text-base font-semibold">{t("exams.allExams")}</h2><p className="text-sm text-[--muted-foreground]">{pagination?.totalItems ?? 0} {t("common.fields.total")}</p></div>
                    <Button onClick={openAdd}><Plus size={15} className="mr-1" />{t("exams.addExam")}</Button>
                </div>
                {loading ? <div className="card p-10 text-center text-sm text-[--muted-foreground]">{t("common.operations.loading")}</div>
                    : <DataTable data={exams} columns={columns} title={t("common.pages.exams")} exportFilename="exams" />}
            </main>
            <FormDialog open={open} onClose={() => setOpen(false)} title={editing ? t("exams.editExam") : t("exams.addExam")}>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        {basicFields.map(field => (
                            <div key={field.key}>
                                <Label>{field.label}{field.required && " *"}</Label>
                                <Input type={field.type} value={form[field.key] as string} onChange={e => f(field.key, e.target.value)} required={field.required} placeholder={field.placeholder} />
                            </div>
                        ))}
                        <div>
                            <Label>{t("exams.course")} *</Label>
                            <FormCombobox
                                items={courses}
                                value={form.courseId}
                                onValueChange={v => { f("courseId", v); f("classRoomId", ""); }}
                                required
                                placeholder={t("exams.selectCourse")}
                                renderItem={c => c.name}
                                getItemValue={c => c._id}
                                getItemLabel={c => c.name}
                            />
                        </div>
                        <div>
                            <Label>{t("exams.classroom")} *</Label>
                            <FormCombobox
                                items={filteredClassRooms}
                                value={form.classRoomId}
                                onValueChange={v => f("classRoomId", v)}
                                required
                                placeholder={form.courseId ? t("exams.selectClassroom") : t("exams.selectClassroomFirst")}
                                renderItem={cr => `${cr.name}${cr.roomNumber ? ` — ${t("exams.room")} ${cr.roomNumber}` : ""}`}
                                getItemValue={cr => cr._id}
                                getItemLabel={cr => `${cr.name}${cr.roomNumber ? ` — ${t("exams.room")} ${cr.roomNumber}` : ""}`}
                            />
                        </div>
                        <div>
                            <Label>{t("exams.type")}</Label>
                            <FormCombobox
                                items={examTypeOptions}
                                value={form.examType}
                                onValueChange={v => f("examType", v)}
                                placeholder={t("exams.selectExamType")}
                                renderItem={opt => opt.label}
                                getItemValue={opt => opt.value}
                                getItemLabel={opt => opt.label}
                            />
                        </div>
                        {scheduleFields.map(field => (
                            <div key={field.key}>
                                <Label>{field.label}</Label>
                                <Input type={field.type} value={form[field.key] as string} onChange={e => f(field.key, e.target.value)} placeholder={field.placeholder} />
                            </div>
                        ))}
                        {marksFields.map(field => (
                            <div key={field.key}>
                                <Label>{field.label}</Label>
                                <Input type={field.type} value={form[field.key] as string} onChange={e => f(field.key, e.target.value)} placeholder={field.placeholder} />
                            </div>
                        ))}
                        <div>
                            <Label>{t("exams.status")}</Label>
                            <FormCombobox
                                items={statusOptions}
                                value={form.status}
                                onValueChange={v => f("status", v)}
                                placeholder={t("exams.selectStatus")}
                                renderItem={opt => opt.label}
                                getItemValue={opt => opt.value}
                                getItemLabel={opt => opt.label}
                            />
                        </div>
                        <div className="col-span-2"><Label>{t("exams.instructions")}</Label><Input value={form.instructions} onChange={e => f("instructions", e.target.value)} /></div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" size="sm" type="button" onClick={() => setOpen(false)}>{t("common.operations.cancel")}</Button>
                        <Button size="sm" type="submit" disabled={busy}>{busy ? t("common.operations.saving") : editing ? t("common.operations.update") : t("common.operations.create")}</Button>
                    </div>
                </form>
            </FormDialog>
            <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleDelete} loading={busy}
                message={t("exams.deleteConfirmMessage", { name: confirm?.name })} />
        </>
    );
}
