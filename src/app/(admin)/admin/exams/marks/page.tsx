"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/datatable/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormCombobox } from "@/components/reusable/FormCombobox";
import { useClassRooms } from "@/hooks/useClassRooms";
import { useExams } from "@/hooks/useExams";
import { useExamMarks } from "@/hooks/useExamMarks";
import { ClassRoom, Student } from "@/types/viewModels";
import { toast } from "@/lib/toast";
import { Save, CheckCircle2, XCircle, Loader2, ClipboardList } from "lucide-react";
import api from "@/lib/axios";
import { computeGrade } from "@/utils/computeExamGrade";
import { useTranslation } from "react-i18next";

type MarkRow = {
    marksObtained: string;   // string for controlled input
    grade: string;
    remarks: string;
    status: "pending" | "evaluated" | "published";
    existingId?: string;     // set if a mark already exists in DB
    saved: boolean;          // whether this row has been saved in this session
};

type StudentMarkRow = {
    _id: string;
    studentId?: string;
    firstName: string;
    lastName: string;
    email: string;
    marksNum: number;       // NaN when blank — used for numeric sort
    marksStr: string;       // raw string — used for the Input control
    grade: string;
    remarks: string;
    status: MarkRow["status"];
    existingId?: string;
    saved: boolean;
    result: "Pass" | "Fail" | "";
};

export default function ExamMarksPage() {
    const { t } = useTranslation();
    const { classRooms } = useClassRooms();
    const { exams } = useExams();
    const { marks, loading: marksLoading, fetchMarks, createMark, updateMark } = useExamMarks();

    const statusOptions: { value: MarkRow["status"]; label: string }[] = useMemo(() => [
        { value: "pending", label: t("exams.pending") },
        { value: "evaluated", label: t("exams.evaluated") },
        { value: "published", label: t("exams.published") },
    ], [t]);

    const gradeBadge = (grade: string) => (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${grade === "A+" || grade === "A" ? "bg-emerald-50 text-emerald-700" :
            grade === "B" ? "bg-blue-50 text-blue-700" :
                grade === "C" ? "bg-amber-50 text-amber-700" :
                    grade === "D" ? "bg-orange-50 text-orange-700" :
                        grade === "F" ? "bg-rose-50 text-rose-700" :
                            "bg-[--muted] text-[--muted-foreground]"
            }`}>{grade || "—"}</span>
    );

    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [selectedExamId, setSelectedExamId] = useState<string>("");
    const [students, setStudents] = useState<Student[]>([]);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [rows, setRows] = useState<Record<string, MarkRow>>({});
    const [saving, setSaving] = useState(false);

    // Exams filtered by selected class
    const filteredExams = exams.filter(ex => {
        const crId = typeof ex.classRoomId === "object"
            ? (ex.classRoomId as ClassRoom)._id
            : ex.classRoomId;
        return crId === selectedClassId;
    });

    const selectedExam = exams.find(ex => ex._id === selectedExamId) ?? null;

    // Fetch students when class changes
    const loadStudents = useCallback(async (classId: string) => {
        setStudentsLoading(true);
        try {
            const res = await api.get("/students", { params: { classRoomId: classId, limit: 200 } });
            setStudents(res.data.data ?? []);
        } catch {
            setStudents([]);
            toast.error(t("exams.failedToLoadStudents"));
        } finally {
            setStudentsLoading(false);
        }
    }, [t]);

    useEffect(() => {
        if (!selectedClassId) { setStudents([]); setSelectedExamId(""); return; }
        loadStudents(selectedClassId);
        setSelectedExamId("");
    }, [selectedClassId, loadStudents]);

    // Fetch marks when exam changes
    useEffect(() => {
        if (!selectedExamId) return;
        fetchMarks(selectedExamId);
    }, [selectedExamId, fetchMarks]);

    // Merge students with existing marks into rows state
    useEffect(() => {
        if (!selectedExamId || students.length === 0) { setRows({}); return; }
        const examTotalMarks = selectedExam?.totalMarks ?? 100;
        const next: Record<string, MarkRow> = {};
        students.forEach(s => {
            const existing = marks.find(m => {
                const sid = typeof m.studentId === "object"
                    ? (m.studentId as Student)._id
                    : m.studentId;
                return sid === s._id;
            });
            if (existing) {
                next[s._id] = {
                    marksObtained: String(existing.marksObtained),
                    grade: existing.grade ?? computeGrade(existing.marksObtained, examTotalMarks),
                    remarks: existing.remarks ?? "",
                    status: existing.status,
                    existingId: existing._id,
                    saved: true,
                };
            } else {
                next[s._id] = {
                    marksObtained: "",
                    grade: "",
                    remarks: "",
                    status: "evaluated",
                    saved: false,
                };
            }
        });
        setRows(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [marks, students, selectedExamId]);

    function updateRow(studentId: string, field: keyof MarkRow, value: string) {
        setRows(prev => {
            const row = { ...prev[studentId], [field]: value, saved: false };
            if (field === "marksObtained") {
                const num = Number(value);
                row.grade = !isNaN(num) && value !== ""
                    ? computeGrade(num, selectedExam?.totalMarks ?? 100)
                    : "";
            }
            return { ...prev, [studentId]: row };
        });
    }

    // Flat data for DataTable — merges student info with live mark state
    const tableData = useMemo<StudentMarkRow[]>(() =>
        students.map(s => {
            const row = rows[s._id];
            const marksStr = row?.marksObtained ?? "";
            const marksNum = marksStr !== "" ? Number(marksStr) : NaN;
            const passing = !isNaN(marksNum) && marksNum >= (selectedExam?.passingMarks ?? Infinity);
            const failing = !isNaN(marksNum) && marksNum < (selectedExam?.passingMarks ?? Infinity);
            return {
                _id: s._id,
                studentId: s.studentId,
                firstName: s.firstName,
                lastName: s.lastName,
                email: s.email,
                marksNum,
                marksStr,
                grade: row?.grade ?? "",
                remarks: row?.remarks ?? "",
                status: row?.status ?? "evaluated",
                existingId: row?.existingId,
                saved: row?.saved ?? false,
                result: passing ? "Pass" : failing ? "Fail" : "",
            };
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [students, rows, selectedExam?.passingMarks]);

    const columns = useMemo<ColumnDef<StudentMarkRow, unknown>[]>(() => [
        {
            id: "studentId", accessorKey: "studentId", header: t("exams.studentId"),
            cell: ({ getValue }) => (
                <span className="font-mono text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                    {String(getValue() ?? "—")}
                </span>
            ),
        },
        {
            id: "name", header: t("common.fields.name"), accessorFn: r => `${r.firstName} ${r.lastName}`,
            cell: ({ row: { original: r } }) => (
                <div>
                    <p className="font-medium text-xs">{r.firstName} {r.lastName}</p>
                    <p className="text-[--muted-foreground] text-xs">{r.email}</p>
                </div>
            ),
        },
        {
            id: "marksObtained", header: t("exams.marks"), accessorFn: r => isNaN(r.marksNum) ? -1 : r.marksNum,
            sortingFn: "basic",
            cell: ({ row: { original: r } }) => (
                <Input
                    type="number"
                    min={0}
                    max={selectedExam?.totalMarks ?? undefined}
                    value={r.marksStr}
                    onChange={e => updateRow(r._id, "marksObtained", e.target.value)}
                    placeholder="—"
                    className="h-8 text-xs w-24"
                />
            ),
        },
        // {
        //     id: "grade", accessorKey: "grade", header: t("exams.grade"),
        //     cell: ({ getValue }) => gradeBadge(String(getValue() ?? "")),
        // },
        {
            id: "remarks", accessorKey: "remarks", header: t("exams.remarks"),
            cell: ({ row: { original: r } }) => (
                <Input
                    value={r.remarks}
                    onChange={e => updateRow(r._id, "remarks", e.target.value)}
                    placeholder={t("exams.optional")}
                    className="h-8 text-xs w-36"
                />
            ),
        },
        {
            id: "status", accessorKey: "status", header: t("exams.status"),
            cell: ({ row: { original: r } }) => (
                <FormCombobox
                    items={statusOptions}
                    value={r.status}
                    onValueChange={v => updateRow(r._id, "status", v)}
                    placeholder={t("exams.selectStatus")}
                    renderItem={opt => opt.label}
                    getItemValue={opt => opt.value}
                    getItemLabel={opt => opt.label}
                />
            ),
        },
        {
            id: "result", accessorKey: "result", header: t("exams.result"),
            cell: ({ row: { original: r } }) => (
                <div className="flex items-center gap-1.5">
                    {r.result === "Pass" && (
                        <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                            <CheckCircle2 size={13} />{t("exams.pass")}
                        </span>
                    )}
                    {r.result === "Fail" && (
                        <span className="flex items-center gap-1 text-rose-600 text-xs font-medium">
                            <XCircle size={13} />{t("exams.fail")}
                        </span>
                    )}
                    {r.result === "" && <span className="text-[--muted-foreground] text-xs">—</span>}
                    {r.saved && <Badge variant="secondary" className="text-[10px] px-1 py-0">{t("exams.saved")}</Badge>}
                </div>
            ),
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [selectedExam?.totalMarks, selectedExam?.passingMarks, t, statusOptions]);

    async function handleSaveAll() {
        if (!selectedExamId) return;
        const toSave = students.filter(s => {
            const row = rows[s._id];
            return row && row.marksObtained !== "";
        });
        if (toSave.length === 0) { toast.error(t("exams.noMarksEntered")); return; }
        setSaving(true);
        let successCount = 0;
        let failCount = 0;
        for (const s of toSave) {
            const row = rows[s._id];
            const obtained = Number(row.marksObtained);
            if (isNaN(obtained) || obtained < 0) { failCount++; continue; }
            const total = selectedExam?.totalMarks ?? 100;
            if (obtained > total) { toast.error(t("exams.marksExceedTotal")); failCount++; continue; }
            const payload = {
                examId: selectedExamId,
                studentId: s._id,
                marksObtained: obtained,
                grade: row.grade || computeGrade(obtained, total),
                remarks: row.remarks,
                status: row.status,
            };
            try {
                if (row.existingId) {
                    await updateMark(row.existingId, payload);
                } else {
                    const created = await createMark(payload);
                    setRows(prev => ({
                        ...prev,
                        [s._id]: { ...prev[s._id], existingId: created._id, saved: true },
                    }));
                }
                setRows(prev => ({ ...prev, [s._id]: { ...prev[s._id], saved: true } }));
                successCount++;
            } catch {
                failCount++;
            }
        }
        setSaving(false);
        if (successCount > 0) toast.success(t("exams.marksSavedCount", { count: successCount }));
        if (failCount > 0) toast.error(t("exams.marksFailedCount", { count: failCount }));
        // Refresh marks
        fetchMarks(selectedExamId);
    }

    const passCount = tableData.filter(r => r.result === "Pass").length;
    const failCount = tableData.filter(r => r.result === "Fail").length;
    const pendingCount = tableData.filter(r => r.marksStr === "").length;

    return (
        <>
            <Header title={t("common.pages.exammarks")} />
            <main className="p-5 space-y-5">
                {/* Selectors */}
                <div className="card p-5 space-y-4">
                    <h2 className="text-sm font-semibold text-[--foreground]">{t("exams.selectClassroomAndExam")}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>{t("exams.classroom")}</Label>
                            <FormCombobox
                                items={classRooms}
                                value={selectedClassId}
                                onValueChange={setSelectedClassId}
                                placeholder={`${t("exams.selectClassroom")}...`}
                                renderItem={cr => `${cr.name}${cr.roomNumber ? ` — ${t("exams.room")} ${cr.roomNumber}` : ""}`}
                                getItemValue={cr => cr._id}
                                getItemLabel={cr => `${cr.name}${cr.roomNumber ? ` — ${t("exams.room")} ${cr.roomNumber}` : ""}`}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t("exams.title")}</Label>
                            <FormCombobox
                                items={filteredExams}
                                value={selectedExamId}
                                onValueChange={setSelectedExamId}
                                disabled={!selectedClassId || filteredExams.length === 0}
                                placeholder={
                                    !selectedClassId ? t("exams.selectClassroomFirst") + "..." :
                                        filteredExams.length === 0 ? t("exams.noExamsForClass") :
                                            `${t("common.operations.select")}...`
                                }
                                renderItem={ex => `${ex.name} — ${ex.examType} (${ex.totalMarks} ${t("exams.marks")})`}
                                getItemValue={ex => ex._id}
                                getItemLabel={ex => `${ex.name} — ${ex.examType} (${ex.totalMarks} ${t("exams.marks")})`}
                            />
                        </div>
                    </div>

                    {/* Exam summary */}
                    {selectedExam && (
                        <div className="flex flex-wrap gap-3 pt-1">
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                {t("exams.totalMarks")}: <strong>{selectedExam.totalMarks}</strong>
                            </span>
                            <span className="text-xs bg-rose-50 text-rose-700 px-2 py-1 rounded">
                                {t("exams.passingMarks")}: <strong>{selectedExam.passingMarks}</strong>
                            </span>
                            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded">
                                {t("exams.pass")}: <strong>{passCount}</strong>
                            </span>
                            <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded">
                                {t("exams.fail")}: <strong>{failCount}</strong>
                            </span>
                            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded">
                                {t("exams.pending")}: <strong>{pendingCount}</strong>
                            </span>
                        </div>
                    )}
                </div>

                {/* DataTable */}
                {selectedClassId && selectedExamId && (
                    studentsLoading || marksLoading ? (
                        <div className="card p-10 text-center text-sm text-[--muted-foreground]">
                            <Loader2 size={20} className="animate-spin mx-auto mb-2" />
                            {t("common.operations.loading")}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex justify-end">
                                <Button size="sm" onClick={handleSaveAll} disabled={saving}>
                                    {saving
                                        ? <><Loader2 size={14} className="mr-1.5 animate-spin" />{t("common.operations.saving")}</>
                                        : <><Save size={14} className="mr-1.5" />{t("exams.saveAll")}</>}
                                </Button>
                            </div>
                            <DataTable
                                data={tableData}
                                columns={columns}
                                title={`${selectedExam?.name ?? t("exams.title")} — ${tableData.length} ${t("exams.student")}`}
                                exportFilename={`marks_${selectedExam?.name ?? "exam"}`}
                                pageSize={20}
                            />
                        </div>
                    )
                )}

                {!selectedClassId && (
                    <div className="card p-12">
                        <div className="text-center text-[--muted-foreground]">
                            <ClipboardList size={36} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm">{t("exams.selectClassAndExam")}</p>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
