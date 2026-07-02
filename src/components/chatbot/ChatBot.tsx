"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  KeyboardEvent,
} from "react";
import {
  MessageCircle,
  X,
  Send,
  Trash2,
  Search,
  Sparkles,
  Bot,
  User,
  School,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useChatbot, StudentContext, ClassContext } from "@/hooks/useChatbot";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import api from "@/lib/axios";

// ── Simple Markdown renderer ─────────────────────────────────────────────────

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let inList = false;
  let listItems: string[] = [];
  let listType: "ul" | "ol" = "ul";
  let key = 0;

  const processInline = (line: string) =>
    line
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(
        /`(.*?)`/g,
        '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>'
      );

  const flushList = () => {
    if (!listItems.length) return;
    const Tag = listType;
    elements.push(
      <Tag key={key++} className={listType === "ul" ? "list-disc pl-4 space-y-0.5 text-xs" : "list-decimal pl-4 space-y-0.5 text-xs"}>
        {listItems.map((item, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: processInline(item) }} />
        ))}
      </Tag>
    );
    listItems = [];
    inList = false;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-*•]\s+/.test(trimmed)) {
      if (!inList || listType !== "ul") { flushList(); inList = true; listType = "ul"; }
      listItems.push(trimmed.replace(/^[-*•]\s+/, ""));
      continue;
    }
    if (/^\d+[.)]\s+/.test(trimmed)) {
      if (!inList || listType !== "ol") { flushList(); inList = true; listType = "ol"; }
      listItems.push(trimmed.replace(/^\d+[.)]\s+/, ""));
      continue;
    }
    flushList();
    if (!trimmed) continue;
    elements.push(
      <p key={key++} className="text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: processInline(trimmed) }} />
    );
  }
  flushList();
  return elements;
}

// ── ChatBot ──────────────────────────────────────────────────────────────────

export function ChatBot() {
  const { role } = useAuth();
  const {
    messages,
    isLoading,
    sendMessage,
    clearChat,
    suggestedPrompts,
    geminiUseCount,
    selectedStudent,
    selectedClass,
    setSelectedStudent,
    setSelectedClass,
    clearContext,
  } = useChatbot(role || "student");

  const isAdmin = role === "admin" || role === "employee";

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentResults, setStudentResults] = useState<StudentContext[]>([]);
  const [classResults, setClassResults] = useState<ClassContext[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isOpen]);

  // Load classes once when picker opens
  useEffect(() => {
    if (pickerOpen && classResults.length === 0) {
      api
        .get("/chatbot/search/classes")
        .then((res) => setClassResults(res.data.data))
        .catch(() => {});
    }
  }, [pickerOpen]);

  // Debounced student search
  const searchStudents = useCallback(async (q: string) => {
    setSearchLoading(true);
    try {
      const res = await api.get(
        `/chatbot/search/students?q=${encodeURIComponent(q)}`
      );
      setStudentResults(res.data.data);
    } catch {
      setStudentResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;
    const t = setTimeout(() => searchStudents(studentQuery), 300);
    return () => clearTimeout(t);
  }, [studentQuery, pickerOpen, searchStudents]);

  // Load all students when picker first opens
  useEffect(() => {
    if (pickerOpen) searchStudents("");
  }, [pickerOpen]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 80) + "px";
  };

  const handleSelectStudent = (s: StudentContext) => {
    setSelectedStudent(s);
    setSelectedClass(null);
    setPickerOpen(false);
  };

  const handleSelectClass = (c: ClassContext) => {
    setSelectedClass(c);
    setSelectedStudent(null);
    setPickerOpen(false);
  };

  const formatTime = (date: Date) =>
    new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const hasContext = !!(selectedStudent || selectedClass);

  return (
    <>
      {/* ── FAB ─────────────────────────────────────────────────────────────── */}
      <button
        id="chatbot-fab"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close chatbot" : "Open chatbot"}
        className={cn(
          "fixed bottom-6 right-6 z-[9999] size-14 rounded-full flex items-center justify-center",
          "bg-gradient-to-br from-[#3b6ef8] via-[#6366f1] to-[#8b5cf6]",
          "shadow-[0_4px_20px_rgba(59,110,248,0.45)] hover:shadow-[0_6px_28px_rgba(59,110,248,0.6)]",
          "transition-all duration-300 hover:scale-110",
          !isOpen && "animate-pulse"
        )}
      >
        {isOpen ? (
          <X className="size-5 text-white" />
        ) : (
          <MessageCircle className="size-5 text-white" />
        )}
      </button>

      {/* ── Chat Panel ──────────────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-label="CampusBaba AI Chatbot"
        className={cn(
          "fixed bottom-24 right-6 z-[9998] w-[400px] flex flex-col",
          "bg-background border border-border rounded-2xl",
          "shadow-[0_20px_60px_rgba(0,0,0,0.15)]",
          "transition-all duration-300 ease-in-out origin-bottom-right",
          isOpen
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        )}
      >
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 rounded-t-2xl bg-[#0f172a] text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-full bg-gradient-to-br from-[#3b6ef8] to-[#8b5cf6] flex items-center justify-center shrink-0">
              <Bot className="size-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">CampusBaba AI</p>
              <p className="text-[10px] text-slate-400 leading-tight">
                বাংলা ও English — উভয়ই বুঝি
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Gemini counter */}
            <div className="flex items-center gap-1 bg-violet-500/20 border border-violet-500/30 rounded-full px-2 py-0.5">
              <Sparkles className="size-2.5 text-violet-300" />
              <span className="text-[10px] font-semibold text-violet-300 tabular-nums">
                {geminiUseCount}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={clearChat}
              title="Clear chat"
              className="text-slate-400 hover:text-white hover:bg-white/10 rounded-lg"
            >
              <Trash2 className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white hover:bg-white/10 rounded-lg"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* ── Messages ──────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0 max-h-[360px] px-3 py-3 flex flex-col gap-3 scroll-smooth">
          {messages.length === 0 && !isLoading ? (
            /* Welcome */
            <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
              <div className="size-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 flex items-center justify-center">
                <Sparkles className="size-6 text-[#6366f1]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  আস্সালামু আলাইকুম!
                </h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  আমি CampusBaba AI। আপনার যেকোনো প্রশ্ন করুন —{" "}
                  <span className="text-[#3b6ef8] font-medium">বাংলা</span> বা{" "}
                  <span className="text-[#3b6ef8] font-medium">English</span>-এ।
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-2 max-w-[88%]",
                    msg.role === "user"
                      ? "self-end flex-row-reverse"
                      : "self-start"
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "size-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      msg.role === "user"
                        ? "bg-gradient-to-br from-[#3b6ef8] to-[#6366f1]"
                        : "bg-muted"
                    )}
                  >
                    {msg.role === "user" ? (
                      <User className="size-3.5 text-white" />
                    ) : (
                      <Bot className="size-3.5 text-muted-foreground" />
                    )}
                  </div>

                  <div>
                    {/* Bubble */}
                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2 leading-relaxed",
                        msg.role === "user"
                          ? "bg-gradient-to-br from-[#3b6ef8] to-[#6366f1] text-white rounded-br-sm text-xs"
                          : "bg-muted text-foreground rounded-bl-sm space-y-1"
                      )}
                    >
                      {msg.role === "assistant"
                        ? renderMarkdown(msg.content)
                        : <span className="text-xs">{msg.content}</span>}
                    </div>

                    {/* Meta */}
                    <div
                      className={cn(
                        "flex items-center gap-1.5 mt-1 px-1",
                        msg.role === "user" && "justify-end"
                      )}
                    >
                      <span className="text-[10px] text-muted-foreground">
                        {formatTime(msg.timestamp)}
                      </span>
                      {msg.role === "assistant" && msg.source && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] px-1.5 py-0 h-4 font-semibold",
                            msg.source === "faq"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-400"
                              : "border-violet-200 bg-violet-50 text-violet-600 dark:bg-violet-950 dark:border-violet-800 dark:text-violet-400"
                          )}
                        >
                          {msg.source === "faq" ? "⚡ FAQ" : "✨ Gemini"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex items-center gap-2 self-start">
                  <div className="size-7 rounded-full bg-muted flex items-center justify-center">
                    <Bot className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2.5 flex gap-1">
                    {[0, 0.2, 0.4].map((delay, i) => (
                      <span
                        key={i}
                        className="size-1.5 rounded-full bg-slate-400 animate-bounce"
                        style={{ animationDelay: `${delay}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Persistent keyword chips ─────────────────────────────────────── */}
        <div className="flex flex-wrap gap-1.5 px-3 py-2 border-t border-border bg-muted/40">
          {suggestedPrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => sendMessage(p.text)}
              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border border-border bg-background text-muted-foreground hover:border-[#3b6ef8] hover:text-[#3b6ef8] hover:bg-blue-50 dark:hover:bg-blue-950 transition-all whitespace-nowrap"
            >
              <span>{p.icon}</span>
              {p.text}
            </button>
          ))}
        </div>

        {/* ── Admin Context Picker Panel ──────────────────────────────────── */}
        {isAdmin && pickerOpen && (
          <div className="border-t border-border bg-background">
            <Tabs defaultValue="student">
              <div className="flex items-center justify-between px-3 pt-2 pb-1">
                <TabsList className="h-7 text-xs">
                  <TabsTrigger value="student" className="text-xs gap-1 px-3">
                    <User className="size-3" /> Student
                  </TabsTrigger>
                  <TabsTrigger value="class" className="text-xs gap-1 px-3">
                    <School className="size-3" /> Class
                  </TabsTrigger>
                </TabsList>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setPickerOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </Button>
              </div>

              {/* Student tab */}
              <TabsContent value="student" className="m-0 px-3 pb-2">
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                  <Input
                    className="pl-7 h-7 text-xs"
                    placeholder="Search by name or ID..."
                    value={studentQuery}
                    onChange={(e) => setStudentQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="max-h-36 overflow-y-auto flex flex-col gap-0.5">
                  {searchLoading && (
                    <p className="text-xs text-muted-foreground text-center py-3">
                      Searching...
                    </p>
                  )}
                  {!searchLoading && studentResults.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">
                      No students found
                    </p>
                  )}
                  {!searchLoading &&
                    studentResults.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleSelectStudent(s)}
                        className={cn(
                          "w-full text-left flex flex-col px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                          selectedStudent?.id === s.id
                            ? "bg-[#3b6ef8]/10 border border-[#3b6ef8]/30"
                            : "hover:bg-muted border border-transparent"
                        )}
                      >
                        <span className="font-medium text-foreground">
                          {s.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {s.studentId}
                          {s.className && ` · ${s.className}`}
                        </span>
                      </button>
                    ))}
                </div>
              </TabsContent>

              {/* Class tab */}
              <TabsContent value="class" className="m-0 px-3 pb-2">
                <div className="max-h-44 overflow-y-auto flex flex-col gap-0.5">
                  {classResults.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">
                      Loading classes...
                    </p>
                  )}
                  {classResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleSelectClass(c)}
                      className={cn(
                        "w-full text-left flex flex-col px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                        selectedClass?.id === c.id
                          ? "bg-[#3b6ef8]/10 border border-[#3b6ef8]/30"
                          : "hover:bg-muted border border-transparent"
                      )}
                    >
                      <span className="font-medium text-foreground">
                        {c.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {c.classRoomId} · {c.enrollment}/{c.capacity} students
                      </span>
                    </button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* ── Context badge ────────────────────────────────────────────────── */}
        {isAdmin && hasContext && (
          <div className="px-3 pt-2 pb-0 border-t border-border">
            {selectedStudent && (
              <div className="flex items-center gap-1.5 text-xs bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg px-2.5 py-1.5">
                <User className="size-3 text-[#3b6ef8] shrink-0" />
                <span className="font-medium text-[#3b6ef8] truncate">
                  {selectedStudent.name}
                </span>
                {selectedStudent.className && (
                  <span className="text-[10px] text-blue-400">
                    · {selectedStudent.className}
                  </span>
                )}
                <button
                  onClick={clearContext}
                  className="ml-auto text-blue-400 hover:text-blue-600 transition-colors shrink-0"
                  aria-label="Remove context"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}
            {selectedClass && (
              <div className="flex items-center gap-1.5 text-xs bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-lg px-2.5 py-1.5">
                <School className="size-3 text-[#6366f1] shrink-0" />
                <span className="font-medium text-[#6366f1] truncate">
                  {selectedClass.name}
                </span>
                <button
                  onClick={clearContext}
                  className="ml-auto text-indigo-400 hover:text-indigo-600 transition-colors shrink-0"
                  aria-label="Remove context"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Input Area ──────────────────────────────────────────────────── */}
        <div className="flex items-end gap-2 px-3 py-2.5 border-t border-border bg-background rounded-b-2xl shrink-0">
          {/* Context picker trigger (admin only) */}
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPickerOpen(!pickerOpen)}
              title="Select student or class"
              className={cn(
                "shrink-0 mb-0.5 transition-all",
                pickerOpen && "bg-[#3b6ef8]/10 text-[#3b6ef8]",
                hasContext && !pickerOpen && "text-[#3b6ef8]"
              )}
            >
              <Search className="size-4" />
            </Button>
          )}

          <Textarea
            ref={inputRef}
            className="flex-1 min-h-[36px] max-h-20 resize-none text-xs rounded-xl border-border bg-muted/30 py-2 px-3 leading-relaxed cursor-not-allowed opacity-60"
            placeholder="🔒 Personal search is disabled for demo version"
            value=""
            onChange={() => {}}
            rows={1}
            disabled
            readOnly
          />

          <Button
            size="icon-sm"
            disabled
            className="shrink-0 mb-0.5 bg-gradient-to-br from-[#3b6ef8] to-[#6366f1] border-0 shadow-md opacity-30 cursor-not-allowed"
          >
            <Send className="size-3.5" />
          </Button>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="text-center text-[10px] text-muted-foreground pb-2">
          Powered by{" "}
          <span className="text-violet-500 font-medium">Gemini AI</span> ·
          CampusBaba
        </div>
      </div>
    </>
  );
}
