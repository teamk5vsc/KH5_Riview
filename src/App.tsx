import React, { useState, useEffect } from "react";
import Sidebar, { TabType } from "./components/Sidebar";
import DocumentSplitReader from "./components/DocumentSplitReader";
import FloatingAIAssistant from "./components/FloatingAIAssistant";
import { CAMBRIDGE_STANDARDS_DB, VINSCHOOL_LESSONS_DB } from "./data";
import { 
  LessonPlan, 
  CambridgeStandard, 
  UploadedDocument, 
  GapAnalysisReport, 
  AIReviewResult 
} from "./types";
import { 
  Plus, 
  Sparkles, 
  Search, 
  Copy, 
  AlertCircle, 
  Activity, 
  FileText, 
  HelpCircle, 
  RefreshCw, 
  Database,
  Layers,
  Settings,
  Globe,
  CheckCircle,
  Info,
  GitCompare,
  UploadCloud,
  FileSpreadsheet
} from "lucide-react";
import { TRANSLATIONS } from "./translations";
import { 
  analyzeLesson, 
  generateQuestions, 
  generateGuidance, 
  performGapAnalysis, 
  compareLessonsAI 
} from "./geminiService";
import { parseDocumentFile } from "./fileParser";

// Default virtual documents with bilingual translations inside the text content
const DEFAULT_DOCUMENTS: UploadedDocument[] = [
  {
    id: "doc_cambridge_g5_ch1",
    name: "Cambridge_Primary_Science_Learner_Book_5_Chapter_1.pdf",
    type: "PDF",
    uploadedAt: "2026-07-02T10:38:00Z",
    fileSize: 2450000,
    status: "ready",
    extractedText: "Cambridge Primary Science Stage 5 Learner Book. Chapter 1: Life Processes and Cells. Section 1.1: What are living organisms? All living organisms are made of tiny cells. Section 1.2: Plant and animal cell structures. Plant cells contain a Cell Wall made of tough cellulose, Chloroplasts for carrying out photosynthesis, and a Large Central Vacuole for storing cell sap. Animal cells only have a Cell Membrane, Cytoplasm, and a Nucleus. Section 1.3: Specialized cells. Root hair cells absorb water and have an extended surface area but no chloroplasts because they are underground. Palisade cells sit near the top of leaves and are packed with chloroplasts to trap maximum light. Red blood cells carry oxygen and have no nucleus to save space.",
  },
  {
    id: "doc_vinschool_g5_excel",
    name: "Vinschool_Curriculum_Framework_Science_G5.xlsx",
    type: "Excel",
    uploadedAt: "2026-07-01T14:20:00Z",
    fileSize: 185000,
    status: "ready",
    extractedText: "Vinschool Science Curriculum Framework Grade 5. Row 1: Unit 1: Life Processes and Cells. Lesson 1: Living Organisms (40 min). Standard mapping: 5Bi.01. Lesson 2: Structure of plant & animal cells (80 min). Standard mapping: 5Bi.01, 5Bi.02. Lesson 3: Specialized Cells (40 min). Standard mapping: 5Bi.03. Row 2: Unit 2: States and Behavior of Matter. Lesson 1: Properties of solids, liquids, and gases (80 min). Standard mapping: 5Ch.01.",
  },
  {
    id: "doc_internal_guide",
    name: "Vinschool_Internal_Science_Guidance_2026.docx",
    type: "Word",
    uploadedAt: "2026-07-02T09:12:00Z",
    fileSize: 512000,
    status: "ready",
    extractedText: "Vinschool Internal Science Pedagogical Guidance: Emphasis should always be placed on Thinking and Working Scientifically (TWS). Teachers are guided to organize wet-mount slide labs for cells. Misconception alerts: Red blood cells do not reproduce on their own; plant cell walls are fully permeable, unlike cell membranes. When teaching forces, encourage students to predict frictional forces before measuring with Newtonmeters.",
  },
];

export default function App() {
  // Global Bilingual & Credentials state
  const [language, setLanguage] = useState<"vi" | "en">(() => {
    return (localStorage.getItem("app_language") as "vi" | "en") || "vi";
  });
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem("gemini_api_key") || "";
  });
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem("gemini_selected_model") || "gemini-3-flash-preview";
  });
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(!localStorage.getItem("gemini_api_key"));

  const t = TRANSLATIONS[language];

  // Bilingual dynamic helpers
  const translateTwsStage = (stage: string) => {
    if (language !== "vi") return stage;
    switch (stage) {
      case "Planning": return "Lên kế hoạch";
      case "Obtaining & Presenting Evidence": return "Thu thập & Trình bày Bằng chứng";
      case "Analysis, Evaluation & Conclusions": return "Phân tích, Đánh giá & Kết luận";
      default: return stage;
    }
  };

  const translateCognitiveLevel = (level: string) => {
    if (language !== "vi") return level;
    switch (level) {
      case "Remembering": return "Nhớ";
      case "Understanding": return "Hiểu";
      case "Applying": return "Vận dụng";
      case "Analyzing": return "Phân tích";
      case "Evaluating": return "Đánh giá";
      case "Creating": return "Sáng tạo";
      default: return level;
    }
  };

  const translateStrand = (strand: string) => {
    if (language !== "vi") return strand;
    switch (strand) {
      case "Biology": return "Sinh học";
      case "Chemistry": return "Hóa học";
      case "Physics": return "Vật lý";
      case "Earth & Space": return "Trái đất & Vũ trụ";
      case "Thinking & Working Scientifically": return "Tư duy & Làm việc Khoa học";
      case "Science in Context": return "Khoa học trong Bối cảnh";
      default: return strand;
    }
  };

  // Navigation & Workspace states
  const [currentTab, setCurrentTab] = useState<TabType>("explorer");
  const [showDesignProposal, setShowDesignProposal] = useState(false);

  // Active curriculum datasets (persisted in client state)
  const [lessons, setLessons] = useState<LessonPlan[]>(VINSCHOOL_LESSONS_DB);
  const [standards, setStandards] = useState<CambridgeStandard[]>(CAMBRIDGE_STANDARDS_DB);
  const [selectedLessonId, setSelectedLessonId] = useState<string>(VINSCHOOL_LESSONS_DB[0].id);
  const [selectedStandardId, setSelectedStandardId] = useState<string>(CAMBRIDGE_STANDARDS_DB[0].id);

  // Global search & filtering
  const [globalSearch, setGlobalSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<number>(5);

  // Split-Screen Reference Document states
  const [documents, setDocuments] = useState<UploadedDocument[]>(() => {
    const saved = localStorage.getItem("uploaded_documents");
    return saved ? JSON.parse(saved) : DEFAULT_DOCUMENTS;
  });
  const [isSplitReaderOpen, setIsSplitReaderOpen] = useState(false);
  
  // Floating AI states
  const [isFloatingAIAssistantOpen, setIsFloatingAIAssistantOpen] = useState(false);

  // AI Operation States
  const [activeAnalysis, setActiveAnalysis] = useState<AIReviewResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedGaps, setSelectedGaps] = useState({
    prediction: true,
    evidence: true,
    modeling: true,
    dataEvaluation: true
  });
  
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  const [generatedGuidance, setGeneratedGuidance] = useState<any | null>(null);
  const [isGeneratingGuidance, setIsGeneratingGuidance] = useState(false);

  const [activeGapReport, setActiveGapReport] = useState<GapAnalysisReport | null>(null);
  const [isAnalyzingGaps, setIsAnalyzingGaps] = useState(false);

  // Model Fallback / Progress indicator state
  const [modelProgressInfo, setModelProgressInfo] = useState<{
    model: string;
    attempt: number;
    status: string;
  } | null>(null);

  // Comparative module states
  const [compareIdA, setCompareIdA] = useState<string>(VINSCHOOL_LESSONS_DB[0].id);
  const [compareIdB, setCompareIdB] = useState<string>(VINSCHOOL_LESSONS_DB[1]?.id || VINSCHOOL_LESSONS_DB[0].id);
  const [compareResult, setCompareResult] = useState<any | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  // UI Toast or status indicators
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Import Center custom file fields & states
  const [uploadMode, setUploadMode] = useState<"file" | "manual">("file");
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [fileParsingError, setFileParsingError] = useState<string | null>(null);
  const [newDocName, setNewDocName] = useState("");
  const [newDocType, setNewDocType] = useState<"PDF" | "Excel" | "Word">("PDF");
  const [newDocText, setNewDocText] = useState("");

  // Persist settings
  const handleSaveSettings = (key: string, model: string) => {
    localStorage.setItem("gemini_api_key", key);
    localStorage.setItem("gemini_selected_model", model);
    setApiKey(key);
    setSelectedModel(model);
    setShowSettingsModal(false);
    showToast(language === "vi" ? "Đã lưu cấu hình AI!" : "AI settings saved successfully!");
  };

  const handleToggleLanguage = () => {
    const nextLang = language === "vi" ? "en" : "vi";
    setLanguage(nextLang);
    localStorage.setItem("app_language", nextLang);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Find active records
  const activeLesson = lessons.find(l => l.id === selectedLessonId) || lessons[0];
  const activeStandard = standards.find(s => s.id === selectedStandardId) || standards[0];

  // Ingestion: Simulate uploading custom frameworks/books manually
  const handleIngestDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim() || !newDocText.trim()) return;

    const newDoc: UploadedDocument = {
      id: `doc_${Date.now()}`,
      name: newDocName,
      type: newDocType,
      uploadedAt: new Date().toISOString(),
      fileSize: newDocText.length * 1.5,
      status: "ready",
      extractedText: newDocText,
      targetGrade: gradeFilter as any
    };

    const updatedDocs = [newDoc, ...documents];
    setDocuments(updatedDocs);
    localStorage.setItem("uploaded_documents", JSON.stringify(updatedDocs));

    setNewDocName("");
    setNewDocText("");
    showToast(t.uploadSuccess.replace("{name}", newDoc.name));
    setIsSplitReaderOpen(true);
  };

  // File Uploader Parser
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setIsParsingFile(true);
    setFileParsingError(null);

    try {
      const { textContent, docType } = await parseDocumentFile(file);

      const newDoc: UploadedDocument = {
        id: `doc_${Date.now()}`,
        name: file.name,
        type: docType,
        uploadedAt: new Date().toISOString(),
        fileSize: file.size,
        status: "ready",
        extractedText: textContent,
        targetGrade: gradeFilter as any
      };

      const updatedDocs = [newDoc, ...documents];
      setDocuments(updatedDocs);
      
      // Save locally if size permits
      if (JSON.stringify(updatedDocs).length < 4000000) {
        localStorage.setItem("uploaded_documents", JSON.stringify(updatedDocs));
      } else {
        showToast(language === "vi" 
          ? "Đã nạp tài liệu vào phiên! Tệp lớn sẽ không lưu vĩnh viễn để tránh đầy bộ nhớ trình duyệt."
          : "Large file loaded into active session! Not saved permanently to avoid local storage overflow."
        );
      }

      showToast(t.uploadSuccess.replace("{name}", file.name));
      setIsSplitReaderOpen(true);
    } catch (err: any) {
      console.error(err);
      setFileParsingError(err.message || "Failed to extract text content.");
      showToast(t.uploadError);
    } finally {
      setIsParsingFile(false);
    }
  };

  // UI status progress helper
  const getAIConfig = () => {
    return {
      apiKey,
      selectedModel,
      language,
      onProgress: (model: string, attempt: number, status: string) => {
        setModelProgressInfo({ model, attempt, status });
      }
    };
  };

  const handleAICallWrapper = async (callFn: () => Promise<void>) => {
    if (!apiKey) {
      setShowSettingsModal(true);
      showToast(t.errorApiKeyRequired);
      return;
    }
    setModelProgressInfo(null);
    try {
      await callFn();
    } catch (e: any) {
      showToast(t.stopWithError + ": " + e.message);
      setModelProgressInfo(prev => prev ? { ...prev, status: `failed: ${e.message}` } : null);
    }
  };

  // AI Action: Request structured Lesson Audit
  const handleAnalyzeLesson = () => {
    if (!activeLesson) return;
    setIsAnalyzing(true);
    setActiveAnalysis(null);
    handleAICallWrapper(async () => {
      const data = await analyzeLesson(activeLesson, documents, selectedGaps, getAIConfig());
      setActiveAnalysis(data);
      showToast(language === "vi" ? "Hoàn thành kiểm định giáo án!" : "Lesson audit complete!");
      setIsAnalyzing(false);
    }).finally(() => {
      setIsAnalyzing(false);
    });
  };

  // AI Action: Generate Higher-Order Thinking Questions
  const handleGenerateQuestions = () => {
    if (!activeLesson) return;
    setIsGeneratingQuestions(true);
    setGeneratedQuestions([]);
    handleAICallWrapper(async () => {
      const data = await generateQuestions(activeLesson, documents, getAIConfig());
      setGeneratedQuestions(data.questions || []);
      showToast(language === "vi" ? "Đã sinh câu hỏi tư duy!" : "Higher-order questions generated!");
      setIsGeneratingQuestions(false);
    }).finally(() => {
      setIsGeneratingQuestions(false);
    });
  };

  // AI Action: Generate Teacher Guidance Document
  const handleGenerateGuidance = () => {
    if (!activeLesson) return;
    setIsGeneratingGuidance(true);
    setGeneratedGuidance(null);
    handleAICallWrapper(async () => {
      const data = await generateGuidance(activeLesson, documents, getAIConfig());
      setGeneratedGuidance(data);
      showToast(language === "vi" ? "Đã sinh hướng dẫn giảng dạy!" : "Teacher guidance generated!");
      setIsGeneratingGuidance(false);
    }).finally(() => {
      setIsGeneratingGuidance(false);
    });
  };

  // AI Action: Run Gap Analysis Report
  const handleRunGapAnalysis = () => {
    setIsAnalyzingGaps(true);
    setActiveGapReport(null);
    handleAICallWrapper(async () => {
      const gradeLessons = lessons.filter(l => l.grade === gradeFilter);
      const gradeStandards = standards.filter(s => s.stage === gradeFilter);
      const data = await performGapAnalysis(gradeFilter, gradeLessons, gradeStandards, documents, getAIConfig());
      setActiveGapReport(data);
      showToast(language === "vi" ? `Đã hoàn thành báo cáo lớp ${gradeFilter}!` : `Grade ${gradeFilter} gap report completed!`);
      setIsAnalyzingGaps(false);
    }).finally(() => {
      setIsAnalyzingGaps(false);
    });
  };

  // AI Action: Run Side-by-Side Comparison
  const handleCompareLessons = () => {
    const lessonA = lessons.find(l => l.id === compareIdA);
    const lessonB = lessons.find(l => l.id === compareIdB);
    if (!lessonA || !lessonB) return;
    setIsComparing(true);
    setCompareResult(null);
    handleAICallWrapper(async () => {
      const data = await compareLessonsAI(lessonA, lessonB, documents, getAIConfig());
      setCompareResult(data);
      showToast(language === "vi" ? "Đã hoàn thành phân tích so sánh!" : "Comparison analysis complete!");
      setIsComparing(false);
    }).finally(() => {
      setIsComparing(false);
    });
  };

  // Interactive Mapping: Map standard code to the current lesson
  const toggleStandardMapping = (stdCode: string) => {
    if (!activeLesson) return;
    const isMapped = activeLesson.mappedCambridgeStandards.includes(stdCode);
    const updatedStandards = isMapped
      ? activeLesson.mappedCambridgeStandards.filter(c => c !== stdCode)
      : [...activeLesson.mappedCambridgeStandards, stdCode];

    const updatedLessons = lessons.map(l => {
      if (l.id === activeLesson.id) {
        return { ...l, mappedCambridgeStandards: updatedStandards };
      }
      return l;
    });

    setLessons(updatedLessons);
    showToast(
      isMapped 
        ? `${t.toastUnmapped}: [${stdCode}]` 
        : `${t.toastMapped}: [${stdCode}]`
    );
  };

  // Copy text helper
  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(t.toastCopied);
  };

  // Filter lessons based on search and grade level
  const filteredLessons = lessons.filter(l => {
    const matchesGrade = l.grade === gradeFilter;
    const matchesSearch = globalSearch.trim() === "" || 
      l.title.toLowerCase().includes(globalSearch.toLowerCase()) ||
      (l.titleVi && l.titleVi.toLowerCase().includes(globalSearch.toLowerCase())) ||
      l.unitTitle.toLowerCase().includes(globalSearch.toLowerCase()) ||
      (l.unitTitleVi && l.unitTitleVi.toLowerCase().includes(globalSearch.toLowerCase())) ||
      l.learningObjectives.some(obj => obj.toLowerCase().includes(globalSearch.toLowerCase())) ||
      (l.learningObjectivesVi && l.learningObjectivesVi.some(obj => obj.toLowerCase().includes(globalSearch.toLowerCase())));
    return matchesGrade && matchesSearch;
  });

  return (
    <div className="flex h-screen bg-[#f4f4f7] text-gray-800 font-sans overflow-hidden select-none">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 bg-[#18181b] border border-[#27272a] text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Left Navigation Sidebar */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          setShowDesignProposal(false);
        }} 
        activeLessonId={selectedLessonId}
        uploadedCount={documents.length}
        language={language}
      />

      {/* Center Console Pane */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        
        {/* Top Control Bar */}
        <header className="h-14 border-b border-gray-100 px-6 flex items-center justify-between shrink-0 bg-white shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider font-mono text-gray-400">{t.stageLabel}</span>
              <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                {([1, 2, 3, 4, 5] as const).map((grade) => (
                  <button
                    key={grade}
                    onClick={() => setGradeFilter(grade)}
                    className={`w-7 h-7 rounded-md text-xs font-semibold flex items-center justify-center transition-all ${
                      gradeFilter === grade
                        ? "bg-amber-500 text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    {grade}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Search everywhere in this stage */}
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-1.5 text-xs focus:ring-1 focus:ring-amber-500/20 focus:border-amber-500 placeholder-gray-400 text-gray-700 font-sans"
              />
            </div>
          </div>

          {/* Quick Right Buttons */}
          <div className="flex items-center gap-2">
            
            {/* API Key Warning Label */}
            {!apiKey && (
              <span className="text-[11px] font-semibold text-red-500 animate-pulse mr-2 font-mono">
                {t.warningApiKey} ➜
              </span>
            )}

            {/* Language Switch */}
            <button
              onClick={handleToggleLanguage}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Change Language / Đổi ngôn ngữ"
            >
              <Globe className="w-3.5 h-3.5 text-amber-500" />
              <span>{language === "vi" ? "EN" : "VI"}</span>
            </button>

            {/* Settings Trigger */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-gray-500" />
              <span>{t.btnSettings}</span>
            </button>
            
            <button
              onClick={() => setIsSplitReaderOpen(!isSplitReaderOpen)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                isSplitReaderOpen 
                  ? "bg-amber-500 text-white border-amber-500 shadow-sm" 
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>{t.btnSplitReader} ({documents.length})</span>
            </button>
          </div>
        </header>

        {/* Fallback processing Banner */}
        {modelProgressInfo && (
          <div className={`px-6 py-2 border-b text-[11px] font-mono flex items-center justify-between transition-colors ${
            modelProgressInfo.status === "processing" ? "bg-amber-50 border-amber-100 text-amber-800" :
            modelProgressInfo.status === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-800" :
            "bg-red-50 border-red-100 text-red-800"
          }`}>
            <div className="flex items-center gap-2">
              {modelProgressInfo.status === "processing" ? <RefreshCw className="w-3 h-3 animate-spin text-amber-600" /> :
               modelProgressInfo.status === "success" ? <CheckCircle className="w-3 h-3 text-emerald-600" /> :
               <AlertCircle className="w-3 h-3 text-red-600" />}
              <span>
                {modelProgressInfo.status === "processing" && t.modelProcessing.replace("{model}", modelProgressInfo.model)}
                {modelProgressInfo.status === "success" && t.modelSuccess.replace("{model}", modelProgressInfo.model)}
                {modelProgressInfo.status.startsWith("failed") && t.modelFailed.replace("{model}", modelProgressInfo.model)}
              </span>
            </div>
            {modelProgressInfo.status.startsWith("failed") && (
              <span className="text-[10px] text-red-600 underline truncate max-w-sm ml-2">
                {modelProgressInfo.status.split("failed:")[1]}
              </span>
            )}
          </div>
        )}

        {/* Dynamic Workspace Container */}
        <div className="flex-1 overflow-y-auto bg-[#f8f9fa] p-6">
          
          {/* TAB 1: CURRICULUM EXPLORER */}
          {currentTab === "explorer" && (
            <div className="grid grid-cols-3 gap-6 max-w-7xl mx-auto h-full">
              
              {/* Left Column: Lesson Tree Hierarchy */}
              <div className="col-span-1 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden h-140">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 font-mono">
                      {t.explorerHierarchy.replace("{grade}", gradeFilter.toString())}
                    </h3>
                    <h2 className="text-sm font-bold text-gray-800 mt-0.5">{language === "vi" ? "Danh mục bài học" : "Unit & Lesson Explorer"}</h2>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {filteredLessons.length > 0 ? (
                    filteredLessons.reduce((acc: any[], lesson) => {
                      const unitGroup = acc.find(g => g.unitId === lesson.unitId);
                      if (unitGroup) {
                        unitGroup.lessons.push(lesson);
                      } else {
                        acc.push({
                          unitId: lesson.unitId,
                          unitTitle: lesson.unitTitle,
                          unitTitleVi: lesson.unitTitleVi,
                          lessons: [lesson]
                        });
                      }
                      return acc;
                    }, []).map((unit) => (
                      <div key={unit.unitId} className="space-y-1.5">
                        <div className="flex items-center gap-2 px-1 text-xs font-bold text-gray-500 tracking-wide uppercase font-mono">
                          <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600 border border-gray-200">
                            {unit.unitId.split("_")[0]}
                          </span>
                          <span className="truncate">{language === "vi" ? unit.unitTitleVi || unit.unitTitle : unit.unitTitle}</span>
                        </div>
                        <div className="space-y-1 pl-2">
                          {unit.lessons.map((lesson: LessonPlan) => (
                            <button
                              key={lesson.id}
                              id={`lesson-card-${lesson.id}`}
                              onClick={() => setSelectedLessonId(lesson.id)}
                              className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                                selectedLessonId === lesson.id
                                  ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/10"
                                  : "bg-white text-gray-700 border-gray-100 hover:bg-gray-50"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] opacity-80">
                                  {language === "vi" ? "Bài" : "Lesson"} {lesson.lessonNumber}
                                </span>
                                <span className="text-[9px] font-mono opacity-95">
                                  {t.durationMin.replace("{duration}", lesson.durationMinutes.toString())}
                                </span>
                              </div>
                              <p className="mt-1 font-semibold truncate leading-snug">
                                {language === "vi" ? lesson.titleVi || lesson.title : lesson.title}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <AlertCircle className="w-6 h-6 mx-auto text-gray-300 mb-2" />
                      <p className="text-xs">{language === "vi" ? "Không tìm thấy bài học nào phù hợp." : "No lessons found matching filter."}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Middle & Right Column: Workspace Lesson Plan Inspector */}
              <div className="col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden h-140">
                {activeLesson ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    
                    {/* Selected Lesson Title Bar */}
                    <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-start">
                      <div>
                        <div className="flex gap-1.5 items-center">
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-100 rounded text-[10px] font-semibold font-mono">
                            UNIT {activeLesson.unitId.split("_")[0]}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span className="text-xs text-gray-500 font-medium">
                            {language === "vi" 
                              ? `Bài học ${activeLesson.lessonNumber} • ${activeLesson.durationMinutes} phút`
                              : `Lesson ${activeLesson.lessonNumber} of ${activeLesson.durationMinutes} minutes`}
                          </span>
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 mt-2">
                          {language === "vi" ? activeLesson.titleVi || activeLesson.title : activeLesson.title}
                        </h2>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => setCurrentTab("ai-review")}
                          className="px-3 py-1.5 bg-[#18181b] hover:bg-[#27272a] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>{t.btnAuditWithAI}</span>
                        </button>
                      </div>
                    </div>

                    {/* Lesson Detail Fields */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 select-text">
                      
                      {/* Learning Objectives */}
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 tracking-wider uppercase font-mono mb-2">
                          {t.learningObjectives}
                        </h4>
                        <div className="space-y-2">
                          {(language === "vi" && activeLesson.learningObjectivesVi ? activeLesson.learningObjectivesVi : activeLesson.learningObjectives).map((obj, i) => (
                            <div key={i} className="flex gap-2 items-start bg-gray-50 border border-gray-100 p-3 rounded-xl text-xs text-gray-700">
                              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-955 font-bold flex items-center justify-center shrink-0">
                                {i + 1}
                              </span>
                              <p className="mt-0.5 leading-relaxed">{obj}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Mapped Cambridge Primary Science Standards */}
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 tracking-wider uppercase font-mono mb-2">
                          {t.mappedStandards}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {activeLesson.mappedCambridgeStandards.map((code) => {
                            const matchedStd = standards.find(s => s.code === code);
                            return (
                              <div 
                                key={code}
                                className="bg-emerald-50 text-emerald-950 border border-emerald-100 p-3 rounded-xl text-xs max-w-md shadow-sm"
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[9px] font-bold font-mono">
                                    {code}
                                  </span>
                                  <span className="text-[10px] font-mono text-emerald-700/80 uppercase font-semibold">
                                    {translateStrand(matchedStd?.strand || "Standard")}
                                  </span>
                                </div>
                                <p className="leading-relaxed mt-1 text-emerald-900">
                                  {language === "vi" ? matchedStd?.descriptionVi || matchedStd?.description : matchedStd?.description}
                                </p>
                              </div>
                            );
                          })}
                          {activeLesson.mappedCambridgeStandards.length === 0 && (
                            <p className="text-xs text-gray-400 italic">No Cambridge standards mapped yet.</p>
                          )}
                        </div>
                      </div>

                      {/* Thinking & Working Scientifically Indicators */}
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 tracking-wider uppercase font-mono mb-2">
                          {t.twsIndicators}
                        </h4>
                        <div className="space-y-2">
                          {activeLesson.twsElements.map((tws) => (
                            <div key={tws.id} className="bg-sky-50 text-sky-955 border border-sky-100 p-3.5 rounded-xl text-xs font-sans">
                              <div className="flex justify-between items-center mb-1 font-mono">
                                <span className="text-[10px] font-bold tracking-wide text-sky-850 uppercase bg-sky-100/60 px-2 py-0.5 rounded-full">
                                  {translateTwsStage(tws.stage)}
                                </span>
                                <span className="text-[9px] text-sky-700 uppercase font-semibold">
                                  {language === "vi" ? "MỨC ĐỘ NHẬN THỨC" : "COGNITIVE LEVEL"}: {translateCognitiveLevel(tws.bloomCognitiveLevel).toUpperCase()}
                                </span>
                              </div>
                              <p className="mt-1 leading-relaxed text-sky-900 font-sans">
                                {language === "vi" ? tws.descriptionVi || tws.description : tws.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Lesson Activities Flow */}
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 tracking-wider uppercase font-mono mb-2">
                          {t.activitiesFlow}
                        </h4>
                        <div className="border-l-2 border-gray-100 pl-4 space-y-4 font-sans">
                          {(language === "vi" && activeLesson.activitiesVi ? activeLesson.activitiesVi : activeLesson.activities).map((act, i) => (
                            <div key={i} className="relative text-xs">
                              <div className="absolute -left-6 top-0 w-3 h-3 bg-amber-500 border-2 border-white rounded-full shadow" />
                              <p className="font-semibold text-gray-800">{language === "vi" ? `Giai đoạn ${i + 1}` : `Phase ${i + 1}`}</p>
                              <p className="text-gray-600 mt-1 leading-relaxed">{act}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Standard Thinking Questions */}
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 tracking-wider uppercase font-mono mb-2 font-sans">
                          {t.coreThinkingQuestions}
                        </h4>
                        <div className="space-y-2 font-sans">
                          {(language === "vi" && activeLesson.thinkingQuestionsVi ? activeLesson.thinkingQuestionsVi : activeLesson.thinkingQuestions).map((q, i) => (
                            <div key={i} className="bg-purple-50 border border-purple-100 text-purple-900 p-3 rounded-xl text-xs italic">
                              "{q}"
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Guidance */}
                      <div className="bg-amber-50/50 border border-amber-100/60 rounded-xl p-4 font-sans">
                        <h4 className="text-xs font-bold text-amber-900 tracking-wider uppercase font-mono mb-2">
                          {t.syllabusWarnings}
                        </h4>
                        <p className="text-xs text-amber-955 leading-relaxed italic">
                          {language === "vi" && activeLesson.teacherGuidanceVi ? activeLesson.teacherGuidanceVi : activeLesson.teacherGuidance}
                        </p>
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-400">
                    <Layers className="w-12 h-12 text-gray-300 stroke-1 mb-2 animate-pulse" />
                    <p className="text-sm">{t.unselectedLesson}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CAMBRIDGE STANDARD MAPPING */}
          {currentTab === "mapping" && (
            <div className="grid grid-cols-3 gap-6 max-w-7xl mx-auto h-full">
              
              {/* Left panel: Selected Lesson Context */}
              <div className="col-span-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col h-140">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono mb-1">{t.mappingLessonContext}</h3>
                <h2 className="text-sm font-bold text-gray-900 truncate">{language === "vi" ? activeLesson?.titleVi || activeLesson?.title : activeLesson?.title || "No Lesson Selected"}</h2>
                
                <div className="mt-4 flex-1 overflow-y-auto space-y-4">
                  <p className="text-xs text-gray-500 leading-relaxed font-sans">
                    {t.mappingInstructions}
                  </p>

                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 font-sans">
                    <h4 className="text-xs font-bold text-gray-700 font-mono mb-2">{t.activeMappedStandards}</h4>
                    <div className="space-y-2">
                      {activeLesson?.mappedCambridgeStandards.map((code) => {
                        const std = standards.find(s => s.code === code);
                        return (
                          <div key={code} className="bg-white border border-gray-200 p-2.5 rounded-lg text-xs flex justify-between items-start font-sans">
                            <div>
                              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                                {code}
                              </span>
                              <p className="mt-1 text-gray-600 line-clamp-2 text-[11px] leading-snug">
                                {language === "vi" ? std?.descriptionVi || std?.description : std?.description}
                              </p>
                            </div>
                            <button 
                              onClick={() => toggleStandardMapping(code)}
                              className="text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50 rounded px-1 py-0.5 ml-2 cursor-pointer"
                            >
                              {t.btnRemove}
                            </button>
                          </div>
                        );
                      })}
                      {(!activeLesson || activeLesson.mappedCambridgeStandards.length === 0) && (
                        <p className="text-xs text-gray-400 italic">{t.noStandardsMapped}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right two columns: Cambridge Framework Standards Tree */}
              <div className="col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden h-140">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 font-mono font-sans">
                      Stage {gradeFilter} Cambridge Standards
                    </h3>
                    <h2 className="text-sm font-bold text-gray-800 mt-0.5">{t.frameworkDirectory}</h2>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {standards
                    .filter(s => s.stage === gradeFilter)
                    .map((std) => {
                      const isMapped = activeLesson?.mappedCambridgeStandards.includes(std.code);
                      return (
                        <div 
                          key={std.id}
                          className={`p-4 rounded-xl border transition-all ${
                            isMapped 
                              ? "bg-emerald-50/50 border-emerald-300 shadow-sm" 
                              : "bg-white border-gray-100 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex justify-between items-start gap-4 font-sans">
                            <div className="space-y-1">
                              <div className="flex gap-2 items-center font-mono">
                                <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded">
                                  {std.code}
                                </span>
                                <span className="text-[10px] uppercase tracking-wider text-gray-400">
                                  {translateStrand(std.strand)} • {language === "vi" ? std.substrandVi || std.substrand : std.substrand}
                                </span>
                              </div>
                              <p className="text-xs text-gray-800 leading-relaxed font-sans pt-1">
                                {language === "vi" ? std.descriptionVi || std.description : std.description}
                              </p>
                              <span className="inline-block mt-1 text-[9px] font-mono text-gray-400 uppercase">
                                Bloom's: {translateCognitiveLevel(std.bloomCognitiveLevel)}
                              </span>
                            </div>

                            <button
                              onClick={() => toggleStandardMapping(std.code)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                                isMapped
                                  ? "bg-emerald-600 text-white shadow-sm"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              }`}
                            >
                              {isMapped ? t.mappedBadge : t.btnMapToLesson}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI LESSON AUDITOR */}
          {currentTab === "ai-review" && (
            <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-140 flex flex-col">
              
              {/* Title Bar */}
              <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 font-mono font-sans">Module: AI Curriculum Auditor</h3>
                  <h2 className="text-sm font-bold text-gray-800 mt-0.5">{t.auditorTitle}</h2>
                </div>
                
                <button
                  onClick={handleAnalyzeLesson}
                  disabled={isAnalyzing}
                  className="px-4 py-2 bg-[#18181b] hover:bg-[#27272a] text-white text-xs font-bold rounded-xl flex items-center gap-2 disabled:bg-gray-100 disabled:text-gray-400 transition-all shadow-sm cursor-pointer"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{t.auditingInProgress}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>{t.btnRunAudit}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Review Content panel */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Gaps scanning checklist selectors */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-amber-500" />
                    {t.gapSelectionTitle}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-sans">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700 bg-white border border-gray-150 p-2.5 rounded-lg hover:bg-gray-50 select-none">
                      <input 
                        type="checkbox" 
                        checked={selectedGaps.prediction} 
                        onChange={(e) => setSelectedGaps(prev => ({ ...prev, prediction: e.target.checked }))}
                        className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                      />
                      <span>{t.gapPrediction}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700 bg-white border border-gray-150 p-2.5 rounded-lg hover:bg-gray-50 select-none">
                      <input 
                        type="checkbox" 
                        checked={selectedGaps.evidence} 
                        onChange={(e) => setSelectedGaps(prev => ({ ...prev, evidence: e.target.checked }))}
                        className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                      />
                      <span>{t.gapEvidence}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700 bg-white border border-gray-150 p-2.5 rounded-lg hover:bg-gray-50 select-none">
                      <input 
                        type="checkbox" 
                        checked={selectedGaps.modeling} 
                        onChange={(e) => setSelectedGaps(prev => ({ ...prev, modeling: e.target.checked }))}
                        className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                      />
                      <span>{t.gapModeling}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700 bg-white border border-gray-150 p-2.5 rounded-lg hover:bg-gray-50 select-none">
                      <input 
                        type="checkbox" 
                        checked={selectedGaps.dataEvaluation} 
                        onChange={(e) => setSelectedGaps(prev => ({ ...prev, dataEvaluation: e.target.checked }))}
                        className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                      />
                      <span>{t.gapDataEvaluation}</span>
                    </label>
                  </div>
                </div>

                {activeAnalysis ? (
                  <div className="space-y-6 select-text font-sans">
                    
                    {/* Summary Block */}
                    <div className="grid grid-cols-3 gap-4 font-mono">
                      
                      {/* Alignment Meter */}
                      <div className="col-span-1 bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">{t.scoreAlignment}</span>
                        <span className={`text-4xl font-extrabold mt-1 ${
                          activeAnalysis.alignmentScore >= 80 ? "text-green-600" : "text-amber-500"
                        }`}>
                          {activeAnalysis.alignmentScore}%
                        </span>
                        <p className="text-[10px] text-gray-500 mt-2 font-medium">Cambridge Objective Match</p>
                      </div>

                      {/* Cognitive Depth Card */}
                      <div className="col-span-1 bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">{t.scoreCognitive}</span>
                        <span className="text-xs font-bold text-gray-800 mt-2 truncate max-w-full">
                          {activeAnalysis.cognitiveDepthRating}
                        </span>
                        <p className="text-[10px] text-gray-500 mt-2 font-medium">Bloom's Taxonomy Audit</p>
                      </div>

                      {/* Verification Source badge */}
                      <div className="col-span-1 bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">{t.scoreTraceability}</span>
                        <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full border border-green-200 mt-2 uppercase font-mono">
                          Verified Grounded
                        </span>
                        <p className="text-[9px] text-gray-500 mt-2 font-mono truncate max-w-full">
                          {activeAnalysis.referencedSources[0] || "Ingested Syllabus"}
                        </p>
                      </div>

                    </div>

                    {/* TWS Audit details */}
                    <div className="bg-sky-50 text-sky-950 border border-sky-100 rounded-xl p-4 font-sans">
                      <h4 className="text-xs font-bold text-sky-900 uppercase tracking-wider font-mono mb-1">
                        {t.twsAuditSection}
                      </h4>
                      <p className="text-xs text-sky-900 leading-relaxed pt-1 font-medium">
                        {activeAnalysis.twsIntegrationAudit}
                      </p>
                    </div>

                    {/* Strengths & Omissions */}
                    <div className="grid grid-cols-2 gap-4 font-sans">
                      <div className="bg-emerald-50 text-emerald-950 border border-emerald-100 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider font-mono mb-2">
                          {t.strengthsTitle}
                        </h4>
                        <ul className="list-disc pl-4 space-y-1.5 text-xs text-emerald-900">
                          {activeAnalysis.strengths.map((str, i) => (
                            <li key={i} className="leading-relaxed">{str}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-red-50 text-red-950 border border-red-100 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider font-mono mb-2">
                          {t.gapsTitle}
                        </h4>
                        <ul className="list-disc pl-4 space-y-1.5 text-xs text-red-900">
                          {activeAnalysis.gaps.map((gap, i) => (
                            <li key={i} className="leading-relaxed">{gap}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Actionable recommendations */}
                    <div className="bg-amber-50/50 border border-amber-100/60 rounded-xl p-5 font-sans">
                      <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider font-mono mb-3">
                        {t.improvementsTitle}
                      </h4>
                      <div className="space-y-2">
                        {activeAnalysis.actionableImprovements.map((imp, i) => (
                          <div key={i} className="flex gap-2 items-start text-xs text-amber-955 leading-relaxed">
                            <span className="w-5 h-5 rounded-full bg-amber-100 font-bold flex items-center justify-center shrink-0">
                              {i + 1}
                            </span>
                            <p className="mt-0.5">{imp}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-400 max-w-md mx-auto">
                    <Sparkles className="w-10 h-10 mx-auto text-amber-400 animate-pulse mb-3" />
                    <h4 className="text-sm font-bold text-gray-700">{t.auditorIdleTitle}</h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed font-sans">
                      {t.auditorIdleDesc.replace("{title}", language === "vi" ? activeLesson?.titleVi || activeLesson?.title : activeLesson?.title || "")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: THINKING QUESTION GENERATOR */}
          {currentTab === "question-gen" && (
            <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-140 flex flex-col">
              
              {/* Title Bar */}
              <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 font-mono font-sans font-sans">Module: Thinking Question Generator</h3>
                  <h2 className="text-sm font-bold text-gray-800 mt-0.5">{t.questionGenTitle}</h2>
                </div>
                
                <button
                  onClick={handleGenerateQuestions}
                  disabled={isGeneratingQuestions}
                  className="px-4 py-2 bg-[#18181b] hover:bg-[#27272a] text-white text-xs font-bold rounded-xl flex items-center gap-2 disabled:bg-gray-100 disabled:text-gray-400 transition-all shadow-sm cursor-pointer"
                >
                  {isGeneratingQuestions ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{t.generatingQuestions}</span>
                    </>
                  ) : (
                    <>
                      <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span>{t.btnGenerateQuestions}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Questions Panel */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="bg-amber-50 text-amber-955 border border-amber-100 rounded-xl p-3.5 text-xs flex gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    {language === "vi" 
                      ? "Các câu hỏi được thiết kế theo đúng triết lý \"Làm sao ta biết?\" (How do we know?) giúp giáo viên kiểm tra được lập luận, bằng chứng khoa học và phương pháp thu thập dữ liệu thay vì chỉ hỏi lý thuyết học vẹt."
                      : "Questions are generated according to the \"How do we know?\" framework, focusing on scientific inquiry, evidence gathering, and experimentation rather than direct memory recall."}
                  </p>
                </div>

                {generatedQuestions.length > 0 ? (
                  generatedQuestions.map((q, idx) => (
                    <div key={idx} className="bg-gray-50 border border-gray-100 rounded-xl p-5 space-y-3 relative group select-text font-sans">
                      
                      <div className="flex justify-between items-start font-mono">
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-200 rounded text-[10px] font-bold uppercase">
                          {t.questionLevel.replace("{level}", q.level)}
                        </span>
                        <button
                          onClick={() => copyText(`Question: ${q.question}\n\nExpected Answer Guide: ${q.expectedAnswerGuide}`)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded text-gray-500 cursor-pointer"
                          title="Copy question details"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-sm font-bold text-gray-900 leading-snug">
                        {q.question}
                      </p>

                      <div className="text-xs text-gray-600 space-y-2 leading-relaxed font-sans">
                        <p><span className="font-semibold text-gray-700">{t.pedagogicalIntent}:</span> {q.pedagogicalIntent}</p>
                        <p className="text-amber-900/90 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100/50 mt-1">
                          <span className="font-semibold text-amber-955 font-mono text-[10px] block uppercase mb-1">{t.expectedAnswer}:</span> 
                          {q.expectedAnswerGuide}
                        </p>
                      </div>

                      <div className="text-[9px] font-mono text-gray-400 uppercase">
                        {t.sourceGrounding.replace("{ref}", q.sourceReference)}
                      </div>

                    </div>
                  ))
                ) : (
                  <div className="text-center py-16 text-gray-400 max-w-md mx-auto">
                    <HelpCircle className="w-10 h-10 mx-auto text-amber-400 animate-pulse mb-3" />
                    <h4 className="text-sm font-bold text-gray-700 font-sans">{t.questionIdleTitle}</h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed font-sans font-sans">
                      {t.questionIdleDesc.replace("{title}", language === "vi" ? activeLesson?.titleVi || activeLesson?.title : activeLesson?.title || "")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: TEACHER GUIDANCE CREATOR */}
          {currentTab === "guidance-gen" && (
            <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-140 flex flex-col animate-fade-in">
              
              {/* Title Bar */}
              <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 font-mono font-sans">Module: Teacher Guidance Creator</h3>
                  <h2 className="text-sm font-bold text-gray-800 mt-0.5">{t.guidanceCreatorTitle}</h2>
                </div>
                
                <button
                  onClick={handleGenerateGuidance}
                  disabled={isGeneratingGuidance}
                  className="px-4 py-2 bg-[#18181b] hover:bg-[#27272a] text-white text-xs font-bold rounded-xl flex items-center gap-2 disabled:bg-gray-100 disabled:text-gray-400 transition-all shadow-sm cursor-pointer"
                >
                  {isGeneratingGuidance ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{t.generatingGuidance}</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span>{t.btnGenerateGuidance}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Guidance Content panel */}
              <div className="flex-1 overflow-y-auto p-6 text-gray-850">
                {generatedGuidance ? (
                  <div className="space-y-6 select-text font-sans">
                    
                    {/* Pedagogical Strategy block */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono mb-2">
                        {t.pedagogicalFramework}
                      </h4>
                      <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100 font-sans">
                        {generatedGuidance.pedagogicalFramework}
                      </p>
                    </div>

                    {/* Misconception warning board */}
                    <div>
                      <h4 className="text-xs font-bold text-red-800 uppercase tracking-widest font-mono mb-2">
                        {t.misconceptionsTitle}
                      </h4>
                      <div className="space-y-3 font-sans">
                        {generatedGuidance.misconceptionAlerts.map((m: any, i: number) => (
                          <div key={i} className="bg-red-50/50 border border-red-100 rounded-xl p-4 space-y-2">
                            <div className="text-xs font-bold text-red-800 uppercase font-mono">
                              ALERT {i + 1}: "{m.misconception}"
                            </div>
                            <div className="text-xs text-red-955 leading-relaxed space-y-1">
                              <p><span className="font-semibold">{language === "vi" ? "Giải thích Khoa học" : "Scientific Correction"}:</span> {m.scientificCorrection}</p>
                              <p className="text-gray-600"><span className="font-semibold text-red-900">{language === "vi" ? "Cách can thiệp" : "Intervention Strategy"}:</span> {m.interventionStrategy}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Hands-on Lab advice */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono mb-2">
                        {t.practicalLabTitle}
                      </h4>
                      <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100 font-sans">
                        {generatedGuidance.practicalLabGuidelines}
                      </p>
                    </div>

                    {/* Differentiation Tips */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono mb-2">
                        {t.differentiationTitle}
                      </h4>
                      <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100 font-sans">
                        {generatedGuidance.differentiationTips}
                      </p>
                    </div>

                    <div className="text-[10px] text-gray-400 font-mono pt-4 border-t border-gray-100 uppercase text-right">
                      Traceability: {generatedGuidance.curriculumTraceability}
                    </div>

                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-400 max-w-md mx-auto">
                    <FileText className="w-10 h-10 mx-auto text-amber-400 animate-pulse mb-3" />
                    <h4 className="text-sm font-bold text-gray-700 font-sans">{t.guidanceIdleTitle}</h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed font-sans">
                      {t.guidanceIdleDesc.replace("{title}", language === "vi" ? activeLesson?.titleVi || activeLesson?.title : activeLesson?.title || "")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: CAMBRIDGE GAP ANALYSIS */}
          {currentTab === "gap-analysis" && (
            <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-140 flex flex-col">
              
              {/* Title Bar */}
              <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 font-mono font-sans">Module: Cambridge Gap Analysis</h3>
                  <h2 className="text-sm font-bold text-gray-800 mt-0.5">{t.gapAnalysisTitle}</h2>
                </div>
                
                <button
                  onClick={handleRunGapAnalysis}
                  disabled={isAnalyzingGaps}
                  className="px-4 py-2 bg-[#18181b] hover:bg-[#27272a] text-white text-xs font-bold rounded-xl flex items-center gap-2 disabled:bg-gray-100 disabled:text-gray-400 transition-all shadow-sm cursor-pointer"
                >
                  {isAnalyzingGaps ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{t.runningGapAnalysis}</span>
                    </>
                  ) : (
                    <>
                      <Activity className="w-3.5 h-3.5 text-amber-400" />
                      <span>{t.btnRunGapAnalysis}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Gap report feed */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeGapReport ? (
                  <div className="space-y-6 select-text font-sans">
                    
                    {/* Summary and Metrics */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex items-center justify-between font-mono">
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-gray-900 leading-none">
                          {activeGapReport.title}
                        </h3>
                        <p className="text-xs text-gray-550">
                          Analysis Run: {new Date(activeGapReport.runDate).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-bold font-mono text-amber-900">
                        {t.gapsDetected.replace("{count}", activeGapReport.identifiedGaps.length.toString())}
                      </span>
                    </div>

                    {/* Gap analysis summary */}
                    <div className="text-xs text-gray-700 bg-gray-50/50 p-4 border border-gray-100 rounded-xl leading-relaxed font-sans">
                      <span className="font-bold text-gray-800 block mb-1">{t.auditSummary}</span>
                      {activeGapReport.summary}
                    </div>

                    {/* Interactive lists of gaps */}
                    <div className="space-y-3.5">
                      {activeGapReport.identifiedGaps.map((gap, idx) => (
                        <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4.5 space-y-3.5 relative shadow-sm">
                          
                          <div className="flex justify-between items-center font-mono">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-red-600 text-white rounded font-mono text-[10px] font-bold">
                                {gap.standardCode}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                gap.severity === "High" ? "bg-red-55 text-red-700" : "bg-amber-55 text-amber-700"
                              }`}>
                                {t.severityLevel.replace("{severity}", gap.severity)}
                              </span>
                            </div>
                            <span className="text-[10px] tracking-wider text-gray-400 uppercase">
                              {gap.gapType}
                            </span>
                          </div>

                          <div className="text-xs space-y-2">
                            <p><span className="font-semibold text-gray-700">{t.standardRequirement}:</span> {gap.standardDesc}</p>
                            <p className="text-red-900 bg-red-50/40 p-2.5 rounded-lg border border-red-100/50">
                              <span className="font-semibold text-red-955 block font-mono text-[10px] uppercase mb-1">{t.omissionDesc}:</span> 
                              {gap.description}
                            </p>
                            <p className="text-emerald-900 bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-100/50 font-sans">
                              <span className="font-semibold text-emerald-955 block font-mono text-[10px] uppercase mb-1">{t.actionPlan}:</span> 
                              {gap.recommendation}
                            </p>
                          </div>

                        </div>
                      ))}
                    </div>

                    <div className="text-[10px] font-mono text-gray-400 uppercase text-right">
                      Analysis Trace: {activeGapReport.traceabilityNotes}
                    </div>

                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-400 max-w-md mx-auto">
                    <Activity className="w-10 h-10 mx-auto text-amber-400 animate-pulse mb-3" />
                    <h4 className="text-sm font-bold text-gray-700 font-sans">{t.gapIdleTitle}</h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed font-sans font-sans">
                      {t.gapIdleDesc.replace("{grade}", gradeFilter.toString())}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: LESSON COMPARATOR */}
          {currentTab === "comparator" && (
            <div className="max-w-5xl mx-auto h-full space-y-6">
              
              {/* Selector panel */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
                <div>
                  <h2 className="text-sm font-bold text-gray-900 font-sans">{t.comparatorTitle}</h2>
                  <p className="text-xs text-gray-500 mt-0.5 font-sans">{t.comparatorSubtitle}</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  {/* Lesson A dropdown */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold text-gray-400">{t.lessonA}</span>
                    <select 
                      value={compareIdA}
                      onChange={(e) => setCompareIdA(e.target.value)}
                      className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-700 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    >
                      {lessons.map(l => (
                        <option key={l.id} value={l.id}>
                          L{l.lessonNumber} - {(language === "vi" ? l.titleVi || l.title : l.title).substring(0,25)}...
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Lesson B dropdown */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold text-gray-400">{t.lessonB}</span>
                    <select 
                      value={compareIdB}
                      onChange={(e) => setCompareIdB(e.target.value)}
                      className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-700 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    >
                      {lessons.map(l => (
                        <option key={l.id} value={l.id}>
                          L{l.lessonNumber} - {(language === "vi" ? l.titleVi || l.title : l.title).substring(0,25)}...
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* AI Comparison Trigger Button */}
                  <button
                    onClick={handleCompareLessons}
                    disabled={isComparing || compareIdA === compareIdB}
                    className="px-3.5 py-1.5 bg-[#18181b] hover:bg-[#27272a] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 disabled:bg-gray-100 disabled:text-gray-400 transition-all cursor-pointer shadow-sm"
                  >
                    {isComparing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{t.comparingInProgress}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>{t.btnGenerateCompareAI}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Comparisons columns layout */}
              <div className="grid grid-cols-2 gap-6">
                {/* Lesson A Column */}
                {(() => {
                  const lessonA = lessons.find(l => l.id === compareIdA) || lessons[0];
                  return (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
                      <span className="text-[10px] font-mono font-bold text-gray-400 uppercase">{t.lessonA}</span>
                      <h3 className="text-sm font-bold text-gray-900 leading-snug">
                        {language === "vi" ? lessonA.titleVi || lessonA.title : lessonA.title}
                      </h3>
                      
                      <div className="space-y-1.5 text-xs text-gray-600 font-sans">
                        <p><span className="font-semibold">{t.duration}:</span> {lessonA.durationMinutes} {language === "vi" ? "phút" : "Minutes"}</p>
                        <p><span className="font-semibold">Unit:</span> {language === "vi" ? lessonA.unitTitleVi || lessonA.unitTitle : lessonA.unitTitle}</p>
                      </div>

                      <div className="border-t border-gray-100 pt-3">
                        <span className="text-[10px] font-mono font-bold text-gray-400 block mb-2 uppercase">{t.objectivesCount}</span>
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold font-sans">
                          {lessonA.learningObjectives.length} {language === "vi" ? "Mục tiêu" : "Active Objectives"}
                        </span>
                      </div>

                      <div className="border-t border-gray-100 pt-3">
                        <span className="text-[10px] font-mono font-bold text-gray-400 block mb-2 uppercase">{t.mappedCodes}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {lessonA.mappedCambridgeStandards.map(code => (
                            <span key={code} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-955 border border-emerald-150 rounded text-[10px] font-mono font-semibold">
                              {code}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-3">
                        <span className="text-[10px] font-mono font-bold text-gray-400 block mb-2 uppercase">{t.twsSkills}</span>
                        <div className="space-y-2 font-sans">
                          {lessonA.twsElements.map(tws => (
                            <div key={tws.id} className="bg-sky-50/50 p-2 rounded border border-sky-100 text-[11px] text-sky-900">
                              <span className="font-semibold text-[10px] text-sky-950 uppercase font-mono block">{translateTwsStage(tws.stage)}</span>
                              <p className="mt-0.5 leading-relaxed">{language === "vi" ? tws.descriptionVi || tws.description : tws.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Lesson B Column */}
                {(() => {
                  const lessonB = lessons.find(l => l.id === compareIdB) || lessons[1] || lessons[0];
                  return (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
                      <span className="text-[10px] font-mono font-bold text-gray-400 uppercase">{t.lessonB}</span>
                      <h3 className="text-sm font-bold text-gray-900 leading-snug">
                        {language === "vi" ? lessonB.titleVi || lessonB.title : lessonB.title}
                      </h3>
                      
                      <div className="space-y-1.5 text-xs text-gray-600 font-sans">
                        <p><span className="font-semibold">{t.duration}:</span> {lessonB.durationMinutes} {language === "vi" ? "phút" : "Minutes"}</p>
                        <p><span className="font-semibold">Unit:</span> {language === "vi" ? lessonB.unitTitleVi || lessonB.unitTitle : lessonB.unitTitle}</p>
                      </div>

                      <div className="border-t border-gray-100 pt-3">
                        <span className="text-[10px] font-mono font-bold text-gray-400 block mb-2 uppercase">{t.objectivesCount}</span>
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold font-sans">
                          {lessonB.learningObjectives.length} {language === "vi" ? "Mục tiêu" : "Active Objectives"}
                        </span>
                      </div>

                      <div className="border-t border-gray-100 pt-3">
                        <span className="text-[10px] font-mono font-bold text-gray-400 block mb-2 uppercase">{t.mappedCodes}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {lessonB.mappedCambridgeStandards.map(code => (
                            <span key={code} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-955 border border-emerald-150 rounded text-[10px] font-mono font-semibold">
                              {code}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-3">
                        <span className="text-[10px] font-mono font-bold text-gray-400 block mb-2 uppercase">{t.twsSkills}</span>
                        <div className="space-y-2 font-sans">
                          {lessonB.twsElements.map(tws => (
                            <div key={tws.id} className="bg-sky-50/50 p-2 rounded border border-sky-100 text-[11px] text-sky-900 font-sans">
                              <span className="font-semibold text-[10px] text-sky-955 uppercase font-mono block">{translateTwsStage(tws.stage)}</span>
                              <p className="mt-0.5 leading-relaxed">{language === "vi" ? tws.descriptionVi || tws.description : tws.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* AI Comparative Report Panel */}
              {compareResult && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5 animate-fade-in select-text">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                    <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                    {t.aiCompareTitle}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-700 leading-relaxed font-sans">
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <h4 className="font-bold text-gray-900 font-mono text-[10px] uppercase mb-1.5">{t.aiCompareSummary}</h4>
                        <p>{compareResult.comparisonSummary}</p>
                      </div>

                      <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100/60 text-sky-955">
                        <h4 className="font-bold text-sky-900 font-mono text-[10px] uppercase mb-1.5">{t.aiCompareTws}</h4>
                        <p>{compareResult.twsIntegrationComparison}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100/60 text-purple-955">
                        <h4 className="font-bold text-purple-900 font-mono text-[10px] uppercase mb-1.5">{t.aiCompareCognitive}</h4>
                        <p>{compareResult.cognitiveDepthAnalysis}</p>
                      </div>

                      <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/60 text-emerald-955">
                        <h4 className="font-bold text-emerald-900 font-mono text-[10px] uppercase mb-1.5">{t.aiCompareRevisions}</h4>
                        <p>{compareResult.recommendedRevisions}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 8: RESEARCH KNOWLEDGE BASE REPOSITORY */}
          {currentTab === "documents" && (
            <div className="max-w-5xl mx-auto grid grid-cols-5 gap-6">
              
              {/* Left panel: File List */}
              <div className="col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col h-140">
                <h2 className="text-sm font-bold text-gray-900">{t.docsTitle}</h2>
                <p className="text-xs text-gray-500 mt-1">{t.docsSubtitle}</p>
                
                <div className="mt-4 flex-1 overflow-y-auto space-y-2.5">
                  {documents.map((doc) => (
                    <div 
                      key={doc.id}
                      className="p-3 bg-gray-50 border border-gray-100 hover:bg-gray-100/50 rounded-xl flex items-center justify-between transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-sans">
                          <span className={`w-2 h-2 rounded-full ${
                            doc.type === "PDF" ? "bg-red-500" : doc.type === "Excel" ? "bg-green-500" : "bg-blue-500"
                          }`} />
                          <span className="text-xs font-semibold text-gray-800 truncate max-w-[140px]">
                            {doc.name}
                          </span>
                        </div>
                        <p className="text-[9px] font-mono text-gray-400 uppercase">
                          {doc.type} • {(doc.fileSize / 1000).toFixed(0)} KB
                        </p>
                      </div>
                      
                      <button
                        onClick={() => {
                          setIsSplitReaderOpen(true);
                          showToast(t.toastCopied);
                        }}
                        className="px-2 py-1 text-[10px] font-bold text-amber-900 hover:bg-amber-100/60 rounded cursor-pointer"
                      >
                        {t.btnReadPanel}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right panel: Custom File Ingestion Uploader */}
              <div className="col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 h-140 flex flex-col font-sans">
                
                {/* Selector Header tab */}
                <div className="flex border-b border-gray-100 mb-4 pb-0.5">
                  <button
                    onClick={() => { setUploadMode("file"); setFileParsingError(null); }}
                    className={`flex-1 pb-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                      uploadMode === "file" 
                        ? "border-amber-500 text-amber-900" 
                        : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    {t.labelFileUploadIngest}
                  </button>
                  <button
                    onClick={() => { setUploadMode("manual"); setFileParsingError(null); }}
                    className={`flex-1 pb-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                      uploadMode === "manual" 
                        ? "border-amber-500 text-amber-900" 
                        : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    {t.labelManualIngest}
                  </button>
                </div>

                {uploadMode === "file" ? (
                  <div className="flex-1 flex flex-col justify-center">
                    {isParsingFile ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                        <RefreshCw className="w-10 h-10 text-amber-500 animate-spin mb-4" />
                        <p className="text-xs font-semibold text-gray-700">{t.labelParsingFile}</p>
                        <p className="text-[10px] text-gray-400 mt-1 font-mono">Running Local Extractor Service</p>
                      </div>
                    ) : (
                      <label 
                        className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 hover:border-amber-500 rounded-2xl bg-gray-50/30 hover:bg-amber-50/10 transition-all cursor-pointer group"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                      >
                        <UploadCloud className="w-12 h-12 text-gray-300 group-hover:text-amber-500 group-hover:scale-105 transition-all mb-4 stroke-1.5" />
                        <p className="text-xs font-bold text-gray-700 text-center">{t.labelDragDrop}</p>
                        <p className="text-[10px] text-gray-400 mt-1.5 text-center font-mono">{t.labelSupportedFormats}</p>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,.json"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file);
                          }}
                        />
                      </label>
                    )}

                    {fileParsingError && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl flex gap-2 items-start text-xs text-red-800">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">{language === "vi" ? "Lỗi phân tích tệp" : "File Parsing Failed"}</p>
                          <p className="text-[10px] text-red-700/80 mt-0.5">{fileParsingError}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleIngestDocument} className="flex-1 flex flex-col space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">{t.fileName}</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Cambridge_G5_Booster.pdf"
                          value={newDocName}
                          onChange={(e) => setNewDocName(e.target.value)}
                          required
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-sans"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">{t.docFormat}</label>
                        <select
                          value={newDocType}
                          onChange={(e) => setNewDocType(e.target.value as any)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        >
                          <option value="PDF">{t.docFormatPdf}</option>
                          <option value="Excel">{t.docFormatExcel}</option>
                          <option value="Word">{t.docFormatWord}</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col">
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">{t.extractedTextLabel}</label>
                      <textarea
                        placeholder="Paste extracted text, specific chapters or row listings here..."
                        value={newDocText}
                        onChange={(e) => setNewDocText(e.target.value)}
                        required
                        className="flex-1 w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-xs text-gray-700 placeholder-gray-400 resize-none font-sans focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t.btnSimulateUpload}</span>
                    </button>
                  </form>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Global Footer Credits */}
        <footer className="h-9 border-t border-gray-100 bg-white px-6 flex items-center justify-between text-[10px] text-gray-400 font-mono shrink-0 select-none">
          <span>{t.footerBranding}</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
            {t.stateOperational}
          </span>
        </footer>

      </div>

      {/* Collapsible Split-Screen Document Viewer */}
      <DocumentSplitReader 
        documents={documents}
        isOpen={isSplitReaderOpen}
        onClose={() => setIsSplitReaderOpen(false)}
        language={language}
      />

      {/* Floating Contextual AI Assistant Panel */}
      <FloatingAIAssistant 
        activeLesson={activeLesson}
        activeStandard={activeStandard}
        isOpen={isFloatingAIAssistantOpen}
        onToggle={() => setIsFloatingAIAssistantOpen(!isFloatingAIAssistantOpen)}
        language={language}
        documents={documents}
      />

      {/* API Key settings modal popup (required when key is missing) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-[#18181b]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-5 flex flex-col">
            
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-9 h-9 bg-amber-50 text-amber-500 border border-amber-200 rounded-xl flex items-center justify-center shrink-0">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 leading-snug font-sans">{t.modalTitle}</h3>
                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wide mt-0.5">AI Curriculum Coprocessor</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed font-sans">
              {t.modalInstructions}
            </p>

            <a 
              href="https://aistudio.google.com/api-keys" 
              target="_blank" 
              rel="noreferrer"
              className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all font-sans"
            >
              <Globe className="w-4 h-4 text-amber-600 animate-pulse" />
              <span>{t.btnGetApiKey}</span>
            </a>

            <div className="space-y-4">
              {/* API Key string input */}
              <div className="space-y-1 font-sans">
                <label className="text-[10px] font-bold text-gray-400 uppercase">{t.labelApiKeyInput}</label>
                <input 
                  type="password"
                  placeholder={t.placeholderApiKey}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-700 focus:ring-1 focus:ring-amber-500 placeholder-gray-400 focus:outline-none"
                />
              </div>

              {/* Model Picker Cards */}
              <div className="space-y-2 font-sans">
                <label className="text-[10px] font-bold text-gray-400 uppercase">{t.labelSelectModel}</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: "gemini-3-flash-preview", name: "Gemini 3 Flash (Default)", desc: "Balanced speed & deep curriculum reasoning" },
                    { id: "gemini-3-pro-preview", name: "Gemini 3 Pro", desc: "Highest analytical reasoning for curriculum design" },
                    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", desc: "Standard stable model with low latency" }
                  ].map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setSelectedModel(model.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex justify-between items-center cursor-pointer ${
                        selectedModel === model.id
                          ? "bg-amber-50 text-amber-900 border-amber-300 shadow-sm"
                          : "bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100/60"
                      }`}
                    >
                      <div>
                        <p className="font-semibold">{model.name}</p>
                        <p className="text-[10px] opacity-75 mt-0.5">{model.desc}</p>
                      </div>
                      {selectedModel === model.id && <CheckCircle className="w-4 h-4 text-amber-500 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 font-sans">
              {/* Allow close button only if there is a saved API key */}
              {localStorage.getItem("gemini_api_key") && (
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 py-2.5 border border-gray-250 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  {language === "vi" ? "Hủy" : "Cancel"}
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSaveSettings(apiKey, selectedModel)}
                disabled={!apiKey.trim()}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-150 disabled:text-gray-400 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
              >
                {t.btnSaveSettings}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
