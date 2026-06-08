"use client";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { useStudents } from "@/hooks/useStudents";
import { useRoutines } from "@/hooks/useRoutines";
import { Calendar, Clock, MapPin, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Routine } from "@/types/viewModels";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function StudentRoutinesPage() {
    const { t } = useTranslation();
    const { referenceId } = useAuth();
    const { student, fetchStudent } = useStudents({}, false);
    const { routines, loading, fetchRoutinesByClassRoom } = useRoutines({}, false);

    useEffect(() => {
        if (!referenceId) return;
        fetchStudent(referenceId);
    }, [referenceId, fetchStudent]);

    useEffect(() => {
        if (!student) return;
        const classRoomId = typeof student.classRoomId === "string"
            ? student.classRoomId
            : (student.classRoomId as { _id?: string })?._id;

        if (classRoomId) {
            fetchRoutinesByClassRoom(classRoomId);
        }
    }, [student, fetchRoutinesByClassRoom]);

    const groupedRoutines = routines.reduce((acc, r) => {
        if (!acc[r.dayOfWeek]) acc[r.dayOfWeek] = [];
        acc[r.dayOfWeek].push(r);
        return acc;
    }, {} as Record<string, Routine[]>);

    // Sort routines by time
    Object.keys(groupedRoutines).forEach(day => {
        groupedRoutines[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return (
        <>
            <Header title={t("studentPortal.routines.myRoutine")} />
            <main className="p-5 space-y-6">
                {loading && routines.length === 0 ? (
                    <div className="card p-10 text-center text-sm text-[--muted-foreground]">{t("studentPortal.routines.loading")}</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {DAYS.map(day => {
                            const dayRoutines = groupedRoutines[day as any] || [];
                            if (dayRoutines.length === 0) return null;

                            return (
                                <div key={day} className="space-y-3">
                                    <h3 className="capitalize font-semibold text-[--foreground] border-b border-[--border] pb-2">
                                        {t(`routines.${day}`)}
                                    </h3>
                                    {dayRoutines.map(routine => (
                                        <Card key={routine._id} className="overflow-hidden">
                                            <div className="h-1 bg-[--primary]" />
                                            <CardContent className="p-3 space-y-2">
                                                <h4 className="font-semibold text-sm">{routine.subject}</h4>

                                                <div className="flex items-center gap-2 text-xs text-[--muted-foreground]">
                                                    <Clock size={12} className="shrink-0" />
                                                    <span>{routine.startTime} - {routine.endTime}</span>
                                                </div>

                                                <div className="flex items-center gap-2 text-xs text-[--muted-foreground]">
                                                    <MapPin size={12} className="shrink-0" />
                                                    <span>{t("studentPortal.routines.room", { number: routine.roomNumber })}</span>
                                                </div>

                                                <div className="flex items-center gap-2 text-xs text-[--muted-foreground]">
                                                    <User size={12} className="shrink-0" />
                                                    <span>
                                                        {(routine.teacherId as { firstName?: string })?.firstName
                                                            ? `${(routine.teacherId as any).firstName} ${(routine.teacherId as any).lastName}`
                                                            : t("studentPortal.routines.teacher")}
                                                    </span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            );
                        })}
                        {Object.keys(groupedRoutines).length === 0 && !loading && (
                            <div className="col-span-full py-10 text-center text-[--muted-foreground]">
                                {t("studentPortal.routines.noRoutines")}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </>
    );
}
