import React, { useState } from "react";
import { UploadedDocument } from "../types";
import { BookOpen, Search, X, Maximize2, Minimize2, CheckCircle, Clock } from "lucide-react";
import { TRANSLATIONS } from "../translations";

interface DocumentSplitReaderProps {
  documents: UploadedDocument[];
  isOpen: boolean;
  onClose: () => void;
  language: "vi" | "en";
  selectedDocId: string;
  setSelectedDocId: (id: string) => void;
}

export default function DocumentSplitReader({ 
  documents, 
  isOpen, 
  onClose,
  language,
  selectedDocId,
  setSelectedDocId
}: DocumentSplitReaderProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const t = TRANSLATIONS[language];

  if (!isOpen) return null;

  const activeDoc = documents.find(d => d.id === selectedDocId) || documents[0];

  // Simple text highlighting for search
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    const regex = new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) => 
          regex.test(part) 
            ? <mark key={i} className="bg-amber-100 text-amber-900 rounded px-0.5 font-semibold">{part}</mark> 
            : part
        )}
      </>
    );
  };

  return (
    <div 
      className={`border-l border-gray-200 bg-white shadow-2xl h-full flex flex-col transition-all duration-300 relative z-30 ${
        isExpanded ? "w-1/2" : "w-112"
      }`}
    >
      {/* Header controls */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-500" />
          <h2 className="text-xs font-semibold tracking-wide text-gray-800 uppercase font-sans">
            {t.readerTitle}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-gray-200 rounded text-gray-500 transition-colors"
            title={isExpanded ? "Minimize panel width" : "Maximize panel width"}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 rounded text-gray-500 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Document Selector tabs */}
      <div className="p-3 border-b border-gray-100 bg-white flex gap-1.5 overflow-x-auto">
        {documents.map((doc) => (
          <button
            key={doc.id}
            onClick={() => setSelectedDocId(doc.id)}
            className={`px-3 py-1.5 rounded text-[11px] font-medium transition-all flex items-center gap-1.5 border whitespace-nowrap ${
              selectedDocId === doc.id
                ? "bg-amber-50 text-amber-900 border-amber-200"
                : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${
              doc.type === "PDF" ? "bg-red-500" : doc.type === "Excel" ? "bg-green-500" : "bg-blue-500"
            }`} />
            {doc.name.substring(0, 24)}{doc.name.length > 24 ? "..." : ""}
          </button>
        ))}
      </div>

      {/* Internal Search bar */}
      <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-gray-400" />
        <input 
          type="text"
          placeholder={t.readerPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-none text-xs focus:ring-0 placeholder-gray-400 text-gray-700"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm("")} className="text-[10px] text-gray-400 hover:text-gray-600">
            {language === "vi" ? "Xóa" : "Clear"}
          </button>
        )}
      </div>

      {/* Document Body View */}
      {activeDoc ? (
        <div className="flex-1 overflow-y-auto p-5 select-text">
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 leading-tight">
                {activeDoc.name}
              </h3>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5 uppercase tracking-wider">
                {language === "vi" ? "Định dạng" : "Type"}: {activeDoc.type} • {language === "vi" ? "Đã nạp" : "Loaded"} {new Date(activeDoc.uploadedAt).toLocaleDateString()}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200 shadow-sm">
              <CheckCircle className="w-3 h-3 text-green-600" /> {t.sourceVerified}
            </span>
          </div>

          <div className="text-xs text-gray-700 leading-relaxed font-sans space-y-4">
            {activeDoc.extractedText.split("\n\n").map((para, idx) => {
              // Highlight sections that look like standard codes, e.g. [5Bi.01]
              const hasCode = para.match(/\b5[a-zA-Z]{2}\.\d{2}\b/g);
              return (
                <div 
                  key={idx} 
                  className={`p-3 rounded-lg border border-transparent transition-all ${
                    hasCode 
                      ? "bg-amber-50/40 border-amber-100/60 shadow-sm" 
                      : "hover:bg-gray-50/80"
                  }`}
                >
                  <p>
                    {highlightText(para, searchTerm)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
          <BookOpen className="w-8 h-8 text-gray-300 stroke-1 mb-2" />
          <p className="text-xs">{language === "vi" ? "Chưa nạp tài liệu tham khảo nào." : "No reference documents loaded in the knowledge base."}</p>
        </div>
      )}

      {/* Footer Info */}
      <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-[10px] text-gray-400 font-mono">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-gray-400" /> {t.traceabilityActive}
        </span>
        <span>MimeType: text/plain</span>
      </div>
    </div>
  );
}
