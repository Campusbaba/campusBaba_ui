"use client";

import { useState, useCallback } from "react";
import api from "@/lib/axios";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface GeminiHistoryMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

interface SuggestedPrompt {
  text: string;
  icon: string;
}

const ROLE_PROMPTS: Record<string, SuggestedPrompt[]> = {
  admin: [
    { text: "এই মাসের মোট আয় কত?", icon: "💰" },
    { text: "এই মাসের খরচ কত হয়েছে?", icon: "📊" },
    { text: "মোট ছাত্র সংখ্যা কত?", icon: "👨‍🎓" },
    { text: "Profit/Loss report দাও", icon: "📈" },
    { text: "Show recent notices", icon: "📢" },
    { text: "আগামী সপ্তাহে কোন পরীক্ষা আছে?", icon: "📝" },
  ],
  teacher: [
    { text: "আমার আজকের ক্লাস routine দাও", icon: "📅" },
    { text: "মোট ছাত্র সংখ্যা কত?", icon: "👨‍🎓" },
    { text: "আগামী পরীক্ষা কবে?", icon: "📝" },
    { text: "Show recent notices", icon: "📢" },
    { text: "এই মাসের attendance কেমন?", icon: "✅" },
  ],
  parent: [
    { text: "আমার ছেলের এই মাসের রিপোর্ট দাও", icon: "📋" },
    { text: "আমার সন্তানের attendance কেমন?", icon: "✅" },
    { text: "বাকি fees কত?", icon: "💰" },
    { text: "আগামী পরীক্ষা কবে?", icon: "📝" },
    { text: "নতুন কোন notice আছে?", icon: "📢" },
  ],
  student: [
    { text: "আমার আজকের routine দাও", icon: "📅" },
    { text: "আমার এই মাসের রিজাল্ট দাও", icon: "📋" },
    { text: "আমার attendance কেমন?", icon: "✅" },
    { text: "আমার বাকি fees কত?", icon: "💰" },
    { text: "নতুন কোন notice আছে?", icon: "📢" },
  ],
};

export function useChatbot(role: string = "student") {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [geminiHistory, setGeminiHistory] = useState<GeminiHistoryMessage[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        const res = await api.post("/chatbot/message", {
          message: content.trim(),
          conversationHistory: geminiHistory,
        });

        const { reply, conversationHistory: updatedHistory } = res.data.data;

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: reply,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setGeminiHistory(updatedHistory);
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
    [geminiHistory, isLoading],
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setGeminiHistory([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    suggestedPrompts,
  };
}
