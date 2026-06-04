"use client";
import { Bell, LogOut, ChevronDown, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useActiveNotices } from "@/hooks/useNotices";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface HeaderProps {
    title: string;
    onMenuClick?: () => void;
}

const priorityColor: Record<string, string> = {
    high: "destructive",
    medium: "default",
    low: "secondary",
};

export function Header({ title, onMenuClick }: HeaderProps) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    const isTeacher = user?.role === "teacher";
    const { notices, loading: noticesLoading } = useActiveNotices(isTeacher ? "teacher" : undefined);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const userName = user?.name || user?.email || "User";
    const userRole = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "";

    const handleLogout = async () => {
        await signOut({ redirect: false });
        router.push("/login");
    };

    const toggle = (id: string) => setExpandedId(prev => (prev === id ? null : id));

    return (
        <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-5 bg-[--muted] backdrop-blur-md border-b border-[--border] shadow-sm">
            <div className="flex items-center gap-3">
                <SidebarTrigger className="-ml-1" />
                <h1 className="text-sm font-semibold text-[--foreground]">{title}</h1>
            </div>

            <div className="flex items-center gap-3">
                {/* ── Bell / Notices ── */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative">
                            <Bell size={17} />
                            {notices.length > 0 && (
                                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[--danger]" />
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="end">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[--border]">
                            <span className="text-sm font-semibold">Notices</span>
                            {notices.length > 0 && (
                                <Badge variant="secondary" className="text-xs">{notices.length}</Badge>
                            )}
                        </div>

                        <div className="max-h-105 overflow-y-auto divide-y divide-[--border]">
                            {noticesLoading ? (
                                <div className="flex items-center justify-center py-8 gap-2 text-sm text-[--muted-foreground]">
                                    <Loader2 size={15} className="animate-spin" /> Loading…
                                </div>
                            ) : notices.length === 0 ? (
                                <p className="py-8 text-center text-sm text-[--muted-foreground]">
                                    No active notices
                                </p>
                            ) : (
                                notices.map(notice => {
                                    const isOpen = expandedId === notice._id;
                                    return (
                                        <div key={notice._id} className="px-4 py-3">
                                            <button
                                                onClick={() => toggle(notice._id)}
                                                className="flex w-full items-start justify-between gap-2 text-left group"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-medium text-[--foreground] truncate">
                                                            {notice.title}
                                                        </span>
                                                        <Badge
                                                            variant={priorityColor[notice.priority] as "destructive" | "default" | "secondary" ?? "secondary"}
                                                            className="text-[10px] px-1.5 py-0 shrink-0"
                                                        >
                                                            {notice.priority}
                                                        </Badge>
                                                    </div>
                                                    <span className="text-xs text-[--muted-foreground] capitalize">
                                                        {notice.category}
                                                        {notice.publishDate
                                                            ? ` · ${new Date(notice.publishDate).toLocaleDateString()}`
                                                            : ""}
                                                    </span>
                                                </div>
                                                <ChevronDown
                                                    size={15}
                                                    className={`shrink-0 mt-0.5 text-[--muted-foreground] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                                                />
                                            </button>

                                            {isOpen && (
                                                <p className="mt-2 text-sm text-[--foreground] whitespace-pre-wrap leading-relaxed border-t border-[--border] pt-2">
                                                    {notice.content}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </PopoverContent>
                </Popover>

                {/* ── User / Logout ── */}
                <Popover>
                    <PopoverTrigger asChild>
                        <button className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
                            {!isLoading && (
                                <>
                                    <div className="sm:hidden flex items-center justify-center h-8 w-8 rounded-full bg-[--border]">
                                        <User size={16} className="text-[--muted-foreground]" />
                                    </div>
                                    <div className="hidden sm:flex flex-col text-left">
                                        <span className="text-sm font-medium text-[--foreground] leading-tight">
                                            {userName}
                                        </span>
                                        {userRole && (
                                            <span className="text-xs text-[--muted-foreground] leading-tight">
                                                {userRole}
                                            </span>
                                        )}
                                    </div>
                                </>
                            )}
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="end">
                        <div className="flex flex-col gap-1">
                            <div className="px-3 py-2 border-b border-[--border]">
                                <p className="text-sm font-medium text-[--foreground]">{userName}</p>
                                <p className="text-xs text-[--muted-foreground]">{user?.email}</p>
                                {/* {user?.referenceId && (
                                    <p className="text-xs text-[--muted-foreground] mt-1">
                                        ID: {user.referenceId}
                                    </p>
                                )} */}
                            </div>
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-sm gap-2 text-[--danger] hover:text-[--danger] hover:bg-[--danger]/10"
                                onClick={handleLogout}
                            >
                                <LogOut size={16} />
                                Logout
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </header>
    );
}
