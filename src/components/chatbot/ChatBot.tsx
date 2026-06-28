"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useChatbot } from "@/hooks/useChatbot";
import "./chatbot.css";

// ── Icons (inline SVGs to avoid extra deps) ─────────────────────────────────

function MessageCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

// ── Simple Markdown Parser ──────────────────────────────────────────────────

function renderMarkdown(text: string) {
  // Process the text line by line for better markdown handling
  const lines = text.split("\n");
  const elements: (string | JSX.Element)[] = [];
  let inList = false;
  let listItems: string[] = [];
  let listType: "ul" | "ol" = "ul";
  let key = 0;

  const processInline = (line: string): string => {
    // Bold
    line = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    // Italic
    line = line.replace(/\*(.*?)\*/g, "<em>$1</em>");
    // Inline code
    line = line.replace(/`(.*?)`/g, '<code style="background:#e2e8f0;padding:0.1em 0.3em;border-radius:3px;font-size:0.85em">$1</code>');
    return line;
  };

  const flushList = () => {
    if (listItems.length > 0) {
      const Tag = listType;
      elements.push(
        <Tag key={key++}>
          {listItems.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: processInline(item) }} />
          ))}
        </Tag>
      );
      listItems = [];
      inList = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Unordered list
    if (/^[-*•]\s+/.test(trimmed)) {
      if (!inList || listType !== "ul") {
        flushList();
        inList = true;
        listType = "ul";
      }
      listItems.push(trimmed.replace(/^[-*•]\s+/, ""));
      continue;
    }

    // Ordered list
    if (/^\d+[.)]\s+/.test(trimmed)) {
      if (!inList || listType !== "ol") {
        flushList();
        inList = true;
        listType = "ol";
      }
      listItems.push(trimmed.replace(/^\d+[.)]\s+/, ""));
      continue;
    }

    // Not a list item — flush any pending list
    flushList();

    // Empty line
    if (trimmed === "") {
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={key++} dangerouslySetInnerHTML={{ __html: processInline(trimmed) }} />
    );
  }

  flushList();
  return elements;
}

// ── ChatBot Component ───────────────────────────────────────────────────────

export function ChatBot() {
  const { role } = useAuth();
  const { messages, isLoading, sendMessage, clearChat, suggestedPrompts } =
    useChatbot(role || "student");

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePromptClick = (text: string) => {
    sendMessage(text);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize textarea
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 80) + "px";
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        id="chatbot-fab"
        className={`chatbot-fab ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close chatbot" : "Open chatbot"}
      >
        {isOpen ? <XIcon /> : <MessageCircleIcon />}
      </button>

      {/* Chat Panel */}
      <div
        className={`chatbot-panel ${isOpen ? "open" : ""}`}
        role="dialog"
        aria-label="CampusBaba AI Chatbot"
      >
        {/* Header */}
        <div className="chatbot-header">
          <div className="chatbot-header-left">
            <div className="chatbot-header-avatar">🤖</div>
            <div className="chatbot-header-info">
              <h3>CampusBaba AI</h3>
              <p>বাংলা ও English — উভয়ই বুঝি</p>
            </div>
          </div>
          <div className="chatbot-header-actions">
            <button
              className="chatbot-header-btn"
              onClick={clearChat}
              title="Clear chat"
              aria-label="Clear chat history"
            >
              <TrashIcon />
            </button>
            <button
              className="chatbot-header-btn"
              onClick={() => setIsOpen(false)}
              title="Close"
              aria-label="Close chatbot"
            >
              <XIcon />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="chatbot-messages">
          {messages.length === 0 && !isLoading ? (
            <div className="chatbot-welcome">
              <div className="chatbot-welcome-icon">✨</div>
              <h4>আস্সালামু আলাইকুম!</h4>
              <p>
                আমি CampusBaba AI। আপনার যেকোনো প্রশ্ন করুন — বাংলা বা
                English-এ।
              </p>
              <div className="chatbot-prompts">
                {suggestedPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    className="chatbot-prompt-btn"
                    onClick={() => handlePromptClick(prompt.text)}
                  >
                    <span className="chatbot-prompt-icon">{prompt.icon}</span>
                    {prompt.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div key={msg.id} className={`chatbot-msg ${msg.role}`}>
                  <div className="chatbot-msg-avatar">
                    {msg.role === "user" ? "👤" : "🤖"}
                  </div>
                  <div>
                    <div className="chatbot-msg-bubble">
                      {msg.role === "assistant"
                        ? renderMarkdown(msg.content)
                        : msg.content}
                    </div>
                    <div className="chatbot-msg-time">
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isLoading && (
                <div className="chatbot-typing">
                  <div className="chatbot-typing-avatar">🤖</div>
                  <div className="chatbot-typing-dots">
                    <span className="chatbot-typing-dot" />
                    <span className="chatbot-typing-dot" />
                    <span className="chatbot-typing-dot" />
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="chatbot-input-area">
          <textarea
            ref={inputRef}
            className="chatbot-input"
            placeholder="আপনার প্রশ্ন লিখুন..."
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isLoading}
          />
          <button
            className="chatbot-send-btn"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            aria-label="Send message"
          >
            <SendIcon />
          </button>
        </div>

        {/* Footer */}
        <div className="chatbot-footer">
          Powered by Gemini AI • CampusBaba
        </div>
      </div>
    </>
  );
}
