"use client";

import { useState, useCallback } from "react";
import api from "@/lib/axios";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  source?: "faq" | "gemini";
}

interface GeminiHistoryMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

interface SuggestedPrompt {
  text: string;
  icon: string;
}

export interface StudentContext {
  id: string;
  name: string;
  studentId: string;
  className: string | null;
}

export interface ClassContext {
  id: string;
  name: string;
  classRoomId: string;
  enrollment: number;
  capacity: number;
}

const ROLE_PROMPTS: Record<string, SuggestedPrompt[]> = {
  admin: [
    { text: "Total Students", icon: "👨‍🎓" },
    { text: "Monthly Income", icon: "💰" },
    { text: "Monthly Expense", icon: "💸" },
    { text: "Profit/Loss", icon: "📈" },
    { text: "Total Salary", icon: "🧾" },
    { text: "Notices", icon: "📢" },
    { text: "Upcoming Exams", icon: "📝" },
    { text: "Attendance", icon: "✅" },
  ],
  teacher: [
    { text: "Total Students", icon: "👨‍🎓" },
    { text: "Routine", icon: "📅" },
    { text: "Upcoming Exams", icon: "📝" },
    { text: "Notices", icon: "📢" },
    { text: "Attendance", icon: "✅" },
  ],
  parent: [
    { text: "Student Report", icon: "📋" },
    { text: "Attendance", icon: "✅" },
    { text: "Fees", icon: "💰" },
    { text: "Upcoming Exams", icon: "📝" },
    { text: "Notices", icon: "📢" },
  ],
  student: [
    { text: "Routine", icon: "📅" },
    { text: "Student Report", icon: "📋" },
    { text: "Attendance", icon: "✅" },
    { text: "Fees", icon: "💰" },
    { text: "Upcoming Exams", icon: "📝" },
    { text: "Notices", icon: "📢" },
  ],
};

export function useChatbot(role: string = "student") {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [geminiHistory, setGeminiHistory] = useState<GeminiHistoryMessage[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geminiUseCount, setGeminiUseCount] = useState(0);

  // Admin context selection
  const [selectedStudent, setSelectedStudent] = useState<StudentContext | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassContext | null>(null);

  const suggestedPrompts = ROLE_PROMPTS[role] || ROLE_PROMPTS.student;

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      try {
        const payload: any = {
          message: content.trim(),
          conversationHistory: geminiHistory,
        };

        // Inject context for admin/employee roles
        if (selectedStudent) {
          payload.studentContext = selectedStudent.name;
        }
        if (selectedClass) {
          payload.classContext = selectedClass.name;
        }

        const res = await api.post("/chatbot/message", payload);

        const {
          reply,
          conversationHistory: updatedHistory,
          source,
        } = res.data.data;

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: reply,
          timestamp: new Date(),
          source: source || "gemini",
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setGeminiHistory(updatedHistory);

        // Only increment counter when Gemini was actually called
        if (source === "gemini") {
          setGeminiUseCount((prev) => prev + 1);
        }
      } catch (err: any) {
        const errorMsg =
          err.message || "দুঃখিত, কিছু সমস্যা হয়েছে। আবার চেষ্টা করুন।";
        setError(errorMsg);

        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "⚠️ " + errorMsg,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [geminiHistory, isLoading, selectedStudent, selectedClass],
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setGeminiHistory([]);
    setError(null);
    setGeminiUseCount(0);
  }, []);

  const clearContext = useCallback(() => {
    setSelectedStudent(null);
    setSelectedClass(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    suggestedPrompts,
    geminiUseCount,
    // context
    selectedStudent,
    selectedClass,
    setSelectedStudent,
    setSelectedClass,
    clearContext,
  };
}
