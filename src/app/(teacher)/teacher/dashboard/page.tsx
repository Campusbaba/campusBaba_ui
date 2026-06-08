"use client";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useRoutines } from "@/hooks/useRoutines";
import { useExams } from "@/hooks/useExams";
import { Clock, CalendarCheck, FilePen } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function TeacherDashboard() {
    const { t } = useTranslation();
    const { routines, loading: rLoading } = useRoutines();
    const { exams, loading: eLoading } = useExams();
    const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    const todayRoutines = routines.filter((r) => r.dayOfWeek.toLowerCase() === todayName);
    const upcomingExams = exams.filter((e) => e.status === "scheduled" || e.status === "ongoing");

    return (
        <>
            <Header title={t("teacherPortal.dashboard.title")} />
            <main className="p-5 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { label: t("teacherPortal.dashboard.myClassesToday"), value: String(todayRoutines.length), icon: Clock, color: "text-[--primary]", bg: "bg-blue-50" },
                        { label: t("teacherPortal.dashboard.totalRoutines"), value: String(routines.length), icon: CalendarCheck, color: "text-[--warning]", bg: "bg-yellow-50" },
                        { label: t("teacherPortal.dashboard.upcomingExams"), value: String(upcomingExams.length), icon: FilePen, color: "text-[--danger]", bg: "bg-red-50" },
                    ].map((s) => (
                        <Card key={s.label}>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-[--muted-foreground]">{s.label}</p>
                                        <p className="text-2xl font-bold text-[--foreground] mt-1">{s.value}</p>
                                    </div>
                                    <span className={`h-11 w-11 rounded-xl flex items-center justify-center ${s.bg}`}>
                                        <s.icon size={22} className={s.color} />
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader><CardTitle>{t("teacherPortal.dashboard.todaysSchedule")}</CardTitle></CardHeader>
                        <CardContent>
                            {rLoading ? <p className="text-sm text-[--muted-foreground]">{t("teacherPortal.dashboard.loading")}</p> : (
                                <div className="space-y-2">
                                    {todayRoutines.map((r, i) => (
                                        <div key={i} className="flex items-center justify-between py-2 border-b border-[--border] last:border-0">
                                            <div>
                                                <p className="text-sm font-medium text-[--foreground]">{r.subject}</p>
                                                <p className="text-xs text-[--muted-foreground]">{(r.classRoomId as { name?: string })?.name ?? ""}</p>
                                            </div>
                                            <span className="text-xs text-[--muted-foreground]">{r.startTime} – {r.endTime}</span>
                                        </div>
                                    ))}
                                    {todayRoutines.length === 0 && <p className="text-sm text-[--muted-foreground]">{t("teacherPortal.dashboard.noClassesToday")}</p>}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>{t("teacherPortal.dashboard.upcomingExams")}</CardTitle></CardHeader>
                        <CardContent>
                            {eLoading ? <p className="text-sm text-[--muted-foreground]">{t("teacherPortal.dashboard.loading")}</p> : (
                                <div className="space-y-2">
                                    {upcomingExams.slice(0, 5).map((e, i) => (
                                        <div key={i} className="flex items-center justify-between py-2 border-b border-[--border] last:border-0">
                                            <div>
                                                <p className="text-sm font-medium text-[--foreground]">{e.name}</p>
                                                <p className="text-xs text-[--muted-foreground]">{e.examType}</p>
                                            </div>
                                            <span className="text-xs text-[--muted-foreground]">{new Date(e.date).toLocaleDateString()}</span>
                                        </div>
                                    ))}
                                    {upcomingExams.length === 0 && <p className="text-sm text-[--muted-foreground]">{t("teacherPortal.dashboard.noUpcomingExams")}</p>}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </>
    );
}
