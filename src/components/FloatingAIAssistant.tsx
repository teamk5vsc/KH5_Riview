import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, LessonPlan, CambridgeStandard, UploadedDocument } from "../types";
import { Sparkles, MessageSquare, Send, X, AlertTriangle, HelpCircle, Bot, Paperclip, RefreshCw } from "lucide-react";
import { TRANSLATIONS } from "../translations";
import { chatSpecialistAI } from "../geminiService";
import { parseDocumentFile } from "../fileParser";

interface FloatingAIAssistantProps {
  activeLesson: LessonPlan | null;
  activeStandard: CambridgeStandard | null;
  isOpen: boolean;
  onToggle: () => void;
  language: "vi" | "en";
  documents: UploadedDocument[];
}

export default function FloatingAIAssistant({
  activeLesson,
  activeStandard,
  isOpen,
  onToggle,
  language,
  documents,
}: FloatingAIAssistantProps) {
  const t = TRANSLATIONS[language];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Direct file attachment states
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string; type: string } | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize welcome message when language changes
  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        sender: "assistant",
        text: language === "vi" 
          ? "Chào mừng bạn đến với Trợ lý Chương trình Khoa học Vinschool. Tôi là cố vấn chuyên sâu về khung chương trình Cambridge Primary Science và TWS. Hãy hỏi tôi về tính tương thích, đề xuất hoạt động TWS hoặc kiểm tra độ sâu nhận thức."
          : "Welcome to the Vinschool Science AI Curriculum Coprocessor. I am your specialized Cambridge Primary Science frameworks advisor. Ask me to review alignment, suggest Thinking and Working Scientifically (TWS) tasks, or evaluate cognitive depth.",
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  }, [language]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleAttachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsingFile(true);
    setFileError(null);
    try {
      const parsed = await parseDocumentFile(file);
      setAttachedFile({
        name: file.name,
        content: parsed.textContent,
        type: parsed.docType
      });
    } catch (err: any) {
      setFileError(err.message || "Failed to parse attachment");
    } finally {
      setIsParsingFile(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: "user",
      text: input,
      timestamp: new Date().toLocaleTimeString(),
      attachmentName: attachedFile ? attachedFile.name : undefined
    };

    // Prepare message with file contents for AI, but keep simple text for chat display
    const userMsgForAI = attachedFile 
      ? { ...userMsg, text: `[TỆP ĐÍNH KÈM: ${attachedFile.name}]\n${attachedFile.content}\n\nCÂU HỎI CỦA TÔI: ${input}` }
      : userMsg;

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    
    // Build docs payload including the temp attachment
    const docsToSend = attachedFile 
      ? [
          {
            id: `temp_${Date.now()}`,
            name: attachedFile.name,
            type: attachedFile.type as any,
            uploadedAt: new Date().toISOString(),
            fileSize: attachedFile.content.length,
            status: "ready" as const,
            extractedText: attachedFile.content
          },
          ...documents
        ]
      : documents;

    // Reset attachment immediately
    setAttachedFile(null);
    setInput("");
    setIsLoading(true);
    setApiError(null);

    const apiKey = localStorage.getItem("gemini_api_key") || "";
    const selectedModel = localStorage.getItem("gemini_selected_model") || "gemini-3-flash-preview";

    if (!apiKey) {
      setApiError(t.errorApiKeyRequired);
      setIsLoading(false);
      return;
    }

    try {
      const newMessagesForAI = [...messages, userMsgForAI];
      const responseText = await chatSpecialistAI(
        newMessagesForAI.slice(-8), // Send last 8 turns
        activeLesson,
        activeStandard,
        docsToSend,
        {
          apiKey,
          selectedModel,
          language,
          onProgress: (model, attempt, status) => {
            console.log(`Chat advisor: ${model} attempt ${attempt} - ${status}`);
          }
        }
      );
      
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: "assistant",
          text: responseText || "No response received.",
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } catch (err: any) {
      setApiError(err.message || "An unexpected communication error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        id="btn-open-assistant"
        className="fixed bottom-6 right-6 z-40 h-11 w-fit px-3 bg-gradient-to-tr from-[#18181b] to-[#27272a] hover:from-[#27272a] hover:to-[#3f3f46] text-white shadow-2xl rounded-full flex items-center gap-2 border border-amber-500/30 hover:border-amber-400 transition-all duration-300 group scale-105"
      >
        {/* Pulsing glow ring */}
        <span className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping opacity-75 pointer-events-none" />
        
        <img 
          src="/robot_avatar.png" 
          alt="Robot AI avatar" 
          className="w-8 h-8 rounded-full border border-amber-400/50 group-hover:scale-110 group-hover:rotate-6 transition-all object-cover"
        />
        <span className="text-xs font-bold tracking-wide pr-2">AI Coprocessor</span>
      </button>
    );
  }

  return (
    <div 
      className="fixed bottom-6 right-6 z-40 w-96 h-128 max-h-[calc(100vh-80px)] bg-white border border-gray-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden font-sans border-t-4 border-t-amber-500"
    >
      {/* Header Banner */}
      <div className="bg-[#18181b] p-4 border-b border-[#27272a] text-white flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full border border-amber-500/40 overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
            <img src="/robot_avatar.png" alt="Robot avatar" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-wide text-white leading-none">
              {language === "vi" ? "Trợ lý học thuật AI" : "AI Curriculum Specialist"}
            </h3>
            <span className="text-[9px] text-gray-400 font-mono mt-1 block uppercase tracking-wider">
              Cambridge Science Coprocessor
            </span>
          </div>
        </div>
        <button 
          onClick={onToggle}
          className="p-1.5 hover:bg-[#27272a] rounded-lg text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Dynamic context chips */}
      {(activeLesson || activeStandard) && (
        <div className="bg-gray-50 border-b border-gray-100 p-2.5 flex flex-wrap gap-1.5 text-[10px]">
          {activeLesson && (
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-100 px-2 py-0.5 rounded-full font-medium">
              <MessageSquare className="w-2.5 h-2.5 text-amber-500" />
              {language === "vi" ? "Bài học" : "Lesson"}: {activeLesson.title.substring(0, 20)}...
            </span>
          )}
          {activeStandard && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-900 border border-emerald-100 px-2 py-0.5 rounded-full font-medium">
              <HelpCircle className="w-2.5 h-2.5 text-emerald-500" />
              {language === "vi" ? "Chuẩn" : "Standard"}: [{activeStandard.code}]
            </span>
          )}
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 select-text">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-2.5 ${m.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* Avatar icon */}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 overflow-hidden border ${
              m.sender === "user"
                ? "bg-gray-100 border-gray-250 text-gray-700 text-[10px] font-bold"
                : "bg-white border-amber-500/20"
            }`}>
              {m.sender === "user" ? "U" : <img src="/robot_avatar.png" alt="Bot avatar" className="w-full h-full object-cover" />}
            </div>

            <div className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                  m.sender === "user"
                    ? "bg-[#18181b] text-white rounded-tr-none font-medium"
                    : "bg-white text-gray-800 border border-gray-150/40 rounded-tl-none"
                }`}
              >
                {m.attachmentName && (
                  <div className={`flex items-center gap-1 text-[9px] mb-1.5 px-2 py-0.5 rounded border font-mono select-none ${
                    m.sender === "user"
                      ? "bg-white/10 text-gray-200 border-white/20"
                      : "bg-amber-50 text-amber-900 border-amber-200/50"
                  }`}>
                    <Paperclip className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                    <span className="truncate max-w-[150px] font-semibold">{m.attachmentName}</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap font-sans">{m.text}</p>
              </div>
              <span className="text-[8px] text-gray-400 mt-1 font-mono px-1">
                {m.timestamp}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-gray-400 pl-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce delay-100" />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce delay-200" />
            <span className="text-[10px] font-mono tracking-wider uppercase ml-1">
              {language === "vi" ? "AI ĐANG TƯ DUY..." : "Specialist Thinking..."}
            </span>
          </div>
        )}

        {apiError && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex gap-2 items-start text-xs text-red-800">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{language === "vi" ? "Lỗi kết nối AI" : "Coprocessor Offline"}</p>
              <p className="text-[10px] text-red-700/80 mt-0.5">{apiError}</p>
            </div>
          </div>
        )}
        {isParsingFile && (
          <div className="p-2 bg-gray-50 border border-gray-150 text-[10px] text-gray-500 rounded-lg flex items-center gap-2 select-none mx-2 mb-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
            <span>{language === "vi" ? "AI đang nạp tài liệu..." : "AI parsing reference..."}</span>
          </div>
        )}

        {fileError && (
          <div className="p-2.5 bg-red-50 border border-red-100 text-[10px] text-red-800 rounded-lg flex gap-2 items-start mx-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
            <span>{fileError}</span>
          </div>
        )}

        {attachedFile && (
          <div className="p-2 bg-amber-55/10 border border-amber-200 text-[10px] text-amber-900 rounded-lg flex items-center justify-between mx-2 mb-2 select-none">
            <div className="flex items-center gap-1.5 truncate">
              <Paperclip className="w-3 h-3 text-amber-500" />
              <span className="truncate font-semibold max-w-[150px]">{attachedFile.name}</span>
              <span className="text-[8px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-mono font-bold uppercase">AI Loaded</span>
            </div>
            <button 
              type="button" 
              onClick={() => setAttachedFile(null)} 
              className="text-amber-600 hover:text-amber-850 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Form Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-gray-100 bg-white flex gap-2 items-center select-none shrink-0">
        {/* Attachment button */}
        <label 
          className={`w-9 h-9 rounded-xl border flex items-center justify-center cursor-pointer transition-all shrink-0 ${
            attachedFile 
              ? "bg-amber-100 border-amber-300 text-amber-600 animate-pulse" 
              : "bg-gray-55 border-gray-200 text-gray-400 hover:text-gray-650"
          }`}
          title={language === "vi" ? "Đính kèm tệp cho AI đọc" : "Attach file for AI Grounding"}
        >
          <Paperclip className="w-4 h-4" />
          <input 
            type="file" 
            accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,.json" 
            onChange={handleAttachFile} 
            className="hidden" 
            disabled={isLoading || isParsingFile}
          />
        </label>

        <input
          type="text"
          placeholder={language === "vi" ? "Hỏi trợ lý về giáo án, chuẩn dạy..." : "Ask specialist to review, draft questions..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-gray-55 border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:ring-1 focus:ring-amber-500/20 focus:border-amber-500 placeholder-gray-400 text-gray-700"
          disabled={isLoading || isParsingFile}
        />
        <button
          type="submit"
          disabled={(!input.trim() && !attachedFile) || isLoading || isParsingFile}
          className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600 disabled:bg-gray-100 disabled:text-gray-400 transition-colors shrink-0 cursor-pointer shadow-sm"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
