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
  FileSpreadsheet,
  Send,
  MessageSquare,
  Presentation
} from "lucide-react";
import { TRANSLATIONS } from "./translations";
import { 
  analyzeLesson, 
  generateQuestions, 
  generateGuidance, 
  performGapAnalysis, 
  compareLessonsAI,
  importLessonFromText,
  auditCurriculumFramework,
  generateRemediationPlan,
  chatNotebookLM,
  generateNotebookNotes,
  generateCustomLessonPlan,
  generateSlidesFromLesson,
  extractCurriculumFromDocument
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
  // Safe localStorage JSON parser
  const getLocalStorageJson = <T,>(key: string, fallback: T): T => {
    try {
      const saved = localStorage.getItem(key);
      if (saved && saved !== "undefined" && saved !== "null") {
        return JSON.parse(saved) as T;
      }
    } catch (e) {
      console.error(`Error parsing localStorage key "${key}":`, e);
    }
    return fallback;
  };

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
  const [lessons, setLessons] = useState<LessonPlan[]>(() => {
    return getLocalStorageJson<LessonPlan[]>("curriculum_lessons", VINSCHOOL_LESSONS_DB);
  });
  const [standards, setStandards] = useState<CambridgeStandard[]>(() => {
    return getLocalStorageJson<CambridgeStandard[]>("curriculum_standards", CAMBRIDGE_STANDARDS_DB);
  });
  const [selectedLessonId, setSelectedLessonId] = useState<string>(() => {
    const list = getLocalStorageJson<LessonPlan[]>("curriculum_lessons", VINSCHOOL_LESSONS_DB);
    return list[0]?.id || "";
  });
  const [selectedStandardId, setSelectedStandardId] = useState<string>(() => {
    const list = getLocalStorageJson<CambridgeStandard[]>("curriculum_standards", CAMBRIDGE_STANDARDS_DB);
    return list[0]?.id || "";
  });

  // Global search & filtering
  const [globalSearch, setGlobalSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<number>(5);

  // Split-Screen Reference Document states
  const [documents, setDocuments] = useState<UploadedDocument[]>(() => {
    return getLocalStorageJson<UploadedDocument[]>("uploaded_documents", DEFAULT_DOCUMENTS);
  });
  const [isSplitReaderOpen, setIsSplitReaderOpen] = useState(false);
  const [selectedDocIdReader, setSelectedDocIdReader] = useState<string>(() => {
    const docs = getLocalStorageJson<UploadedDocument[]>("uploaded_documents", DEFAULT_DOCUMENTS);
    return docs[0]?.id || "";
  });
  
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
  const [compareIdA, setCompareIdA] = useState<string>(() => {
    const list = getLocalStorageJson<LessonPlan[]>("curriculum_lessons", VINSCHOOL_LESSONS_DB);
    return list[0]?.id || "";
  });
  const [compareIdB, setCompareIdB] = useState<string>(() => {
    const list = getLocalStorageJson<LessonPlan[]>("curriculum_lessons", VINSCHOOL_LESSONS_DB);
    return list[1]?.id || list[0]?.id || "";
  });
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

  // Import custom Vinschool lesson state
  const [showImportLessonModal, setShowImportLessonModal] = useState(false);
  const [importLessonText, setImportLessonText] = useState("");
  const [isImportingLesson, setIsImportingLesson] = useState(false);
  const [importLessonError, setImportLessonError] = useState<string | null>(null);

  // Curriculum Framework Builder states
  const [totalWeeks, setTotalWeeks] = useState<number>(35);
  const [periodsPerWeek, setPeriodsPerWeek] = useState<number>(3); // Set to 3 as per user request
  const [frameworkTopics, setFrameworkTopics] = useState<any[]>(() => {
    return getLocalStorageJson<any[]>("framework_topics", [
      {
        id: "topic_1",
        name: "Topic 1: Life Processes and Cells",
        nameVi: "Chủ đề 1: Tế bào và Quá trình sống",
        allocatedPeriods: 25,
        mappedStandardCodes: ["5Bi.01", "5Bi.02", "5Bi.03"],
        twsFocus: ["5TWSm.02", "5TWSc.08"]
      },
      {
        id: "topic_2",
        name: "Topic 2: State and Properties of Matter",
        nameVi: "Chủ đề 2: Trạng thái và Tính chất Vật chất",
        allocatedPeriods: 20,
        mappedStandardCodes: ["5Cm.01", "5Cm.02"],
        twsFocus: ["5TWSm.01", "5TWSa.01"]
      },
      {
        id: "topic_3",
        name: "Topic 3: Forces and Energy",
        nameVi: "Chủ đề 3: Lực và Năng lượng",
        allocatedPeriods: 30,
        mappedStandardCodes: ["5Ps.01", "5Ps.02", "5Pe.01"],
        twsFocus: ["5TWSp.03", "5TWSa.05"]
      }
    ]);
  });
  const [activeFrameworkTopicId, setActiveFrameworkTopicId] = useState<string>("topic_1");
  const [frameworkAuditResult, setFrameworkAuditResult] = useState<any | null>(null);
  const [isAuditingFramework, setIsAuditingFramework] = useState(false);

  // Remediation module states
  const [diagnosticReport, setDiagnosticReport] = useState<string>(
    "Học sinh khối 5 làm bài kiểm tra định kỳ có kết quả rất kém ở các câu hỏi liên quan đến vẽ biểu đồ cột để biểu diễn số liệu (5TWSa.05) và kỹ năng đưa ra dự đoán khoa học trong thí nghiệm đo lực ma sát (5TWSp.03). Đồng thời, nhiều học sinh vẫn bị ngộ nhận rằng màng tế bào thực vật cũng có tính chất cứng cáp bảo vệ giống như thành tế bào (5Bi.01)."
  );
  const [remediationResult, setRemediationResult] = useState<any | null>(null);
  const [isAnalyzingRemediation, setIsAnalyzingRemediation] = useState(false);

  // NotebookLM states
  const [selectedNotebookDocIds, setSelectedNotebookDocIds] = useState<string[]>([]);
  const [notebookChatMessages, setNotebookChatMessages] = useState<ChatMessage[]>([]);
  const [notebookChatInput, setNotebookChatInput] = useState("");
  const [isNotebookChatLoading, setIsNotebookChatLoading] = useState(false);
  const [notebookNotesResult, setNotebookNotesResult] = useState<string | null>(null);
  const [isGeneratingNotebookNotes, setIsGeneratingNotebookNotes] = useState(false);
  const [notebookActiveWorkspaceTab, setNotebookActiveWorkspaceTab] = useState<'chat' | 'notes'>('chat');

  // Extraction loader state
  const [isExtractingCurriculum, setIsExtractingCurriculum] = useState<string | null>(null);

  useEffect(() => {
    if (documents.length > 0 && selectedNotebookDocIds.length === 0) {
      setSelectedNotebookDocIds(documents.map(d => d.id));
    }
  }, [documents]);

  // Lesson & Slide Builder states
  const [customObjectives, setCustomObjectives] = useState("");
  const [customSampleDocId, setCustomSampleDocId] = useState("");
  const [customPedagogicalPrompt, setCustomPedagogicalPrompt] = useState("");
  const [generatedCustomLessonPlanText, setGeneratedCustomLessonPlanText] = useState<string | null>(null);
  const [isDraftingCustomLesson, setIsDraftingCustomLesson] = useState(false);
  const [generatedSlides, setGeneratedSlides] = useState<any[]>([]);
  const [isGeneratingSlides, setIsGeneratingSlides] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [customActiveSubTab, setCustomActiveSubTab] = useState<'lesson' | 'slides'>('lesson');

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

  // Import Vinschool Lesson Plan via File or Raw Text
  const handleImportLessonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImportingLesson(true);
    setImportLessonError(null);
    try {
      const { textContent } = await parseDocumentFile(file);
      await performLessonTextImport(textContent);
    } catch (err: any) {
      console.error(err);
      setImportLessonError(err.message || "Failed to parse imported file.");
    } finally {
      setIsImportingLesson(false);
    }
  };

  const performLessonTextImport = async (text: string) => {
    if (!text.trim()) return;
    setIsImportingLesson(true);
    setImportLessonError(null);
    
    if (!apiKey) {
      setShowSettingsModal(true);
      showToast(t.errorApiKeyRequired);
      setIsImportingLesson(false);
      return;
    }

    try {
      const newLesson = await importLessonFromText(text, gradeFilter, getAIConfig());
      setLessons(prev => [newLesson, ...prev]);
      setSelectedLessonId(newLesson.id);
      setShowImportLessonModal(false);
      setImportLessonText("");
      showToast(language === "vi" ? "Đã nạp giáo án mới thành công bằng AI!" : "New lesson plan parsed and imported!");
    } catch (err: any) {
      console.error(err);
      setImportLessonError(err.message || "AI failed to extract lesson structure from text.");
    } finally {
      setIsImportingLesson(false);
    }
  };

  const handleAuditFramework = () => {
    setIsAuditingFramework(true);
    setFrameworkAuditResult(null);
    handleAICallWrapper(async () => {
      const totalPeriodsBudget = totalWeeks * periodsPerWeek;
      const data = await auditCurriculumFramework(frameworkTopics, totalPeriodsBudget, standards, documents, getAIConfig());
      setFrameworkAuditResult(data);
      showToast(language === "vi" ? "Đã kiểm định khung chương trình học thuật bằng AI!" : "Academic curriculum framework audited!");
      setIsAuditingFramework(false);
    }).finally(() => {
      setIsAuditingFramework(false);
    });
  };

  const handleGenerateRemediation = () => {
    setIsAnalyzingRemediation(true);
    setRemediationResult(null);
    handleAICallWrapper(async () => {
      const data = await generateRemediationPlan(diagnosticReport, lessons, standards, documents, getAIConfig());
      setRemediationResult(data);
      showToast(language === "vi" ? "Đã phân tích báo cáo và sinh tài liệu khắc phục!" : "Remediation plan generated successfully!");
      setIsAnalyzingRemediation(false);
    }).finally(() => {
      setIsAnalyzingRemediation(false);
    });
  };

  // NotebookLM handlers
  const handleToggleNotebookDoc = (docId: string) => {
    setSelectedNotebookDocIds(prev => 
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const handleSendNotebookChat = () => {
    if (!notebookChatInput.trim() || isNotebookChatLoading) return;
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: "user",
      text: notebookChatInput,
      timestamp: new Date().toLocaleTimeString()
    };
    const newMsgs = [...notebookChatMessages, userMsg];
    setNotebookChatMessages(newMsgs);
    setNotebookChatInput("");
    setIsNotebookChatLoading(true);

    const activeDocs = documents.filter(d => selectedNotebookDocIds.includes(d.id));

    handleAICallWrapper(async () => {
      const reply = await chatNotebookLM(newMsgs, activeDocs, notebookChatInput, getAIConfig());
      setNotebookChatMessages(prev => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: "assistant",
          text: reply,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    }).finally(() => {
      setIsNotebookChatLoading(false);
    });
  };

  const handleGenerateNotebookNotes = (type: "summary" | "faq" | "study-guide") => {
    setIsGeneratingNotebookNotes(true);
    setNotebookNotesResult(null);
    const activeDocs = documents.filter(d => selectedNotebookDocIds.includes(d.id));

    handleAICallWrapper(async () => {
      const notes = await generateNotebookNotes(activeDocs, type, getAIConfig());
      setNotebookNotesResult(notes);
      showToast(language === "vi" ? "Đã tổng hợp tài liệu đối chiếu thành công!" : "Ingested sources successfully synthesized!");
    }).finally(() => {
      setIsGeneratingNotebookNotes(false);
    });
  };

  const handleExtractCurriculum = (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    setIsExtractingCurriculum(docId);

    handleAICallWrapper(async () => {
      const data = await extractCurriculumFromDocument(doc.extractedText, gradeFilter, getAIConfig());
      if (data && data.lessons && data.standards) {
        // Format them with stage and active identifiers
        const formattedStandards = data.standards.map((s: any, idx: number) => ({
          ...s,
          id: `${gradeFilter}_std_${idx}_${Date.now()}`,
          stage: gradeFilter
        }));

        const formattedLessons = data.lessons.map((l: any, idx: number) => ({
          ...l,
          id: `extracted_l_${idx}_${Date.now()}`,
          grade: gradeFilter,
          // Fallbacks for optional fields
          titleVi: l.titleVi || l.title,
          unitTitleVi: l.unitTitleVi || l.unitTitle
        }));

        setStandards(formattedStandards);
        setLessons(formattedLessons);
        
        localStorage.setItem("curriculum_standards", JSON.stringify(formattedStandards));
        localStorage.setItem("curriculum_lessons", JSON.stringify(formattedLessons));

        if (formattedLessons.length > 0) {
          setSelectedLessonId(formattedLessons[0].id);
        }
        if (formattedStandards.length > 0) {
          setSelectedStandardId(formattedStandards[0].id);
        }

        showToast(language === "vi" ? "Đã đồng bộ danh mục bài học từ sách giáo khoa mới!" : "Synchronized curriculum lessons and standards from file successfully!");
      }
    }).finally(() => {
      setIsExtractingCurriculum(null);
    });
  };

  const handleDraftCustomLesson = () => {
    if (!customObjectives.trim()) {
      showToast(language === "vi" ? "Vui lòng nhập mục tiêu bài học!" : "Please provide learning objectives!");
      return;
    }
    setIsDraftingCustomLesson(true);
    setGeneratedCustomLessonPlanText(null);
    setGeneratedSlides([]);
    setActiveSlideIndex(0);

    const sampleDoc = documents.find(d => d.id === customSampleDocId);
    const sampleText = sampleDoc ? sampleDoc.extractedText : "";

    handleAICallWrapper(async () => {
      const plan = await generateCustomLessonPlan(
        customObjectives,
        sampleText,
        customPedagogicalPrompt,
        getAIConfig()
      );
      setGeneratedCustomLessonPlanText(plan);
      setCustomActiveSubTab('lesson');
      showToast(language === "vi" ? "Đã soạn thảo giáo án học thuật!" : "Lesson plan drafted successfully!");
    }).finally(() => {
      setIsDraftingCustomLesson(false);
    });
  };

  const handleGenerateSlides = () => {
    if (!generatedCustomLessonPlanText) return;
    setIsGeneratingSlides(true);

    handleAICallWrapper(async () => {
      const data = await generateSlidesFromLesson(generatedCustomLessonPlanText, getAIConfig());
      if (data && data.slides) {
        setGeneratedSlides(data.slides);
        setActiveSlideIndex(0);
        setCustomActiveSubTab('slides');
        showToast(language === "vi" ? "Đã tạo slide bài giảng thành công!" : "Presentation slides created!");
      }
    }).finally(() => {
      setIsGeneratingSlides(false);
    });
  };

  // UI status progress helper
  const getAIConfig = () => {
    return {
      apiKey,
      selectedModel,
      language,
      onProgress: (modelUsed: string, attempt: number, status: string) => {
        setModelProgressInfo({ model: modelUsed, attempt, status });
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
                {([1, 2, 3, 4, 5, 6] as const).map((grade) => (
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
                  
                  {/* Plus Import Lesson Button */}
                  <button
                    onClick={() => setShowImportLessonModal(true)}
                    className="p-1.5 hover:bg-gray-200 rounded-lg text-amber-500 hover:text-amber-600 transition-all cursor-pointer flex items-center justify-center border border-gray-200 bg-white shadow-sm"
                    title={language === "vi" ? "Nhập giáo án mới bằng AI" : "Import new lesson via AI"}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
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
                            <div key={i} className="flex gap-2 items-start bg-gray-50 border border-gray-100 p-3 rounded-xl text-xs text-gray-700 font-sans">
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
                                className="bg-emerald-50 text-emerald-955 border border-emerald-100 p-3 rounded-xl text-xs max-w-md shadow-sm font-sans"
                              >
                                <div className="flex justify-between items-center mb-1 font-mono">
                                  <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[9px] font-bold">
                                    {code}
                                  </span>
                                  <span className="text-[10px] text-emerald-700/80 uppercase font-semibold">
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
                            <p className="text-xs text-gray-400 italic font-sans">No Cambridge standards mapped yet.</p>
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
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto space-y-6">
                    <div className="relative w-full h-56 rounded-3xl overflow-hidden shadow-xl border border-gray-250/20 bg-gradient-to-tr from-[#18181b] to-gray-800 animate-fade-in">
                      <img src="/science_banner.png" alt="Science Banner" className="w-full h-full object-cover opacity-80" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#18181b] via-[#18181b]/35 to-transparent flex items-end p-4.5">
                        <div className="text-left">
                          <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-bold">Vinschool Science 5</span>
                          <h3 className="text-sm font-bold text-white mt-1 leading-snug">
                            {language === "vi" ? "Không gian Thẩm định & Phát triển Khung" : "Curriculum Audit Workspace"}
                          </h3>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-xs text-gray-650 leading-relaxed font-sans max-w-sm">
                        {lessons.length === 0
                          ? (language === "vi"
                              ? "Chưa có dữ liệu bài học nào. Vui lòng vào tab 'Kho tài liệu', tải lên sách giáo khoa lớp tương ứng (Stage 5 / Stage 6) và bấm nút 'Đồng bộ danh mục' để AI tự động trích xuất các bài học chính xác."
                              : "No curriculum data loaded. Please upload a textbook or syllabus in 'Kho tài liệu' tab, then click 'Sync Lessons' to automatically index lessons.")
                          : (language === "vi"
                              ? "Vui lòng chọn một bài học ở danh mục bên trái hoặc tải lên giáo án để bắt đầu phân tích tương thích chuẩn Cambridge và năng lực TWS."
                              : "Please select a lesson from the left directory or import a new file to begin mapping standards and TWS integration audits.")}
                      </p>
                    </div>
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
                      {activeLesson?.mappedCambridgeStandards?.map((code) => {
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
                      {(!activeLesson || !activeLesson.mappedCambridgeStandards || activeLesson.mappedCambridgeStandards.length === 0) && (
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

                <div className="flex-1 overflow-y-auto p-5 space-y-4 animate-fade-in">
                  {standards
                    .filter(s => s.stage === gradeFilter)
                    .map((std) => {
                      const isMapped = activeLesson?.mappedCambridgeStandards?.includes(std.code) || false;
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
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 font-mono font-sans font-sans">Module: AI Curriculum Auditor</h3>
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
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono flex items-center gap-1.5 font-sans">
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
                        <p className="text-[10px] text-gray-500 mt-2 font-medium font-sans">Cambridge Objective Match</p>
                      </div>

                      {/* Cognitive Depth Card */}
                      <div className="col-span-1 bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">{t.scoreCognitive}</span>
                        <span className="text-xs font-bold text-gray-800 mt-2 truncate max-w-full font-sans">
                          {activeAnalysis.cognitiveDepthRating}
                        </span>
                        <p className="text-[10px] text-gray-500 mt-2 font-medium font-sans">Bloom's Taxonomy Audit</p>
                      </div>

                      {/* Verification Source badge */}
                      <div className="col-span-1 bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">{t.scoreTraceability}</span>
                        <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full border border-green-200 mt-2 uppercase font-mono">
                          Verified Grounded
                        </span>
                        <p className="text-[9px] text-gray-550 mt-2 font-mono truncate max-w-full">
                          {activeAnalysis.referencedSources[0] || "Ingested Syllabus"}
                        </p>
                      </div>

                    </div>

                    {/* TWS Audit details */}
                    <div className="bg-sky-50 text-sky-955 border border-sky-100 rounded-xl p-4 font-sans">
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

                      <div className="bg-red-50 text-red-955 border border-red-100 rounded-xl p-4">
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
                          <div key={i} className="flex gap-2 items-start text-xs text-amber-955 leading-relaxed font-sans">
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
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 font-mono font-sans font-sans font-sans">Module: Thinking Question Generator</h3>
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
                  <p className="font-sans">
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

                      <div className="text-xs text-gray-650 space-y-2 leading-relaxed font-sans">
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
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed font-sans font-sans font-sans">
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
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 font-mono font-sans font-sans">Module: Teacher Guidance Creator</h3>
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
                            <div className="text-xs font-bold text-red-800 uppercase font-mono font-mono">
                              ALERT {i + 1}: "{m.misconception}"
                            </div>
                            <div className="text-xs text-red-955 leading-relaxed space-y-1 font-sans">
                              <p><span className="font-semibold">{language === "vi" ? "Giải thích Khoa học" : "Scientific Correction"}:</span> {m.scientificCorrection}</p>
                              <p className="text-gray-650"><span className="font-semibold text-red-900">{language === "vi" ? "Cách can thiệp" : "Intervention Strategy"}:</span> {m.interventionStrategy}</p>
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

                    <div className="text-[10px] text-gray-405 font-mono pt-4 border-t border-gray-100 uppercase text-right">
                      Traceability: {generatedGuidance.curriculumTraceability}
                    </div>

                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-400 max-w-md mx-auto font-sans">
                    <FileText className="w-10 h-10 mx-auto text-amber-400 animate-pulse mb-3" />
                    <h4 className="text-sm font-bold text-gray-700">{t.guidanceIdleTitle}</h4>
                    <p className="text-xs text-gray-550 mt-1 leading-relaxed">
                      {t.guidanceIdleDesc.replace("{title}", language === "vi" ? activeLesson?.titleVi || activeLesson?.title : activeLesson?.title || "")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: CAMBRIDGE GAP ANALYSIS */}
          {currentTab === "gap-analysis" && (
            <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-140 flex flex-col animate-fade-in">
              
              {/* Title Bar */}
              <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 font-mono font-sans font-sans">Module: Cambridge Gap Analysis</h3>
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
                        <h3 className="text-sm font-bold text-gray-900 leading-none font-sans">
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
                    <div className="space-y-3.5 font-sans">
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
                            <p><span className="font-semibold text-gray-700 font-sans">{t.standardRequirement}:</span> {gap.standardDesc}</p>
                            <p className="text-red-900 bg-red-50/40 p-2.5 rounded-lg border border-red-100/50">
                              <span className="font-semibold text-red-955 block font-mono text-[10px] uppercase mb-1">{t.omissionDesc}:</span> 
                              {gap.description}
                            </p>
                            <p className="text-emerald-900 bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-100/50">
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

          {/* TAB 11: NOTEBOOKLM EXPERT WORKSPACE */}
          {currentTab === "notebook" && (
            <div className="max-w-5xl mx-auto grid grid-cols-12 gap-6 h-[calc(100vh-180px)] select-none">
              
              {/* Left Pane: Ingested Sources Checklist (4/12 width) */}
              <div className="col-span-4 bg-white rounded-2xl border border-gray-200 shadow-sm p-4.5 flex flex-col h-full overflow-hidden font-sans">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3 shrink-0">
                  <div>
                    <h2 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 font-mono uppercase tracking-wide">
                      <Database className="w-4 h-4 text-amber-500" />
                      {language === "vi" ? "Bộ Nguồn Tư Liệu" : "Sources Grounding"}
                    </h2>
                    <p className="text-[9px] text-gray-450 mt-0.5">
                      {language === "vi" ? "Chọn tài liệu để AI tập trung đối chiếu" : "Select sources for active grounding"}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded text-[10px] font-bold font-mono">
                    {selectedNotebookDocIds.length}/{documents.length}
                  </span>
                </div>

                {/* Sources list */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                  {documents.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <p className="text-xs">{language === "vi" ? "Chưa có tài liệu nào. Vui lòng tải lên trước." : "No documents uploaded yet."}</p>
                    </div>
                  ) : (
                    documents.map(doc => {
                      const isSelected = selectedNotebookDocIds.includes(doc.id);
                      return (
                        <div 
                          key={doc.id}
                          onClick={() => handleToggleNotebookDoc(doc.id)}
                          className={`p-3 border rounded-xl flex items-start gap-2.5 transition-all cursor-pointer select-none ${
                            isSelected 
                              ? "bg-amber-50/20 border-amber-300 shadow-xs" 
                              : "bg-gray-50/40 border-gray-200 hover:bg-gray-55 hover:border-gray-300"
                          }`}
                        >
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // handled by parent onClick
                            className="mt-0.5 rounded border-gray-300 text-amber-500 focus:ring-amber-500 cursor-pointer w-3.5 h-3.5"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-semibold text-gray-800 truncate block">
                              {doc.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] font-mono text-gray-400 uppercase">
                                {doc.type} • {(doc.fileSize / 1000).toFixed(0)} KB
                              </span>
                              {doc.targetGrade && (
                                <span className="text-[8px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-250/20 px-1 rounded">
                                  LỚP {doc.targetGrade}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="border-t border-gray-100 pt-3 mt-3 shrink-0">
                  <button
                    onClick={() => setCurrentTab("documents")}
                    className="w-full py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === "vi" ? "Quản lý / Nạp thêm tệp" : "Ingest New Sources"}</span>
                  </button>
                </div>
              </div>

              {/* Right Pane: Interactive Workspace (8/12 width) */}
              <div className="col-span-8 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
                
                {/* Header Switcher tabs */}
                <div className="flex border-b border-gray-100 bg-gray-50 shrink-0">
                  <button
                    onClick={() => setNotebookActiveWorkspaceTab('chat')}
                    className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      notebookActiveWorkspaceTab === 'chat'
                        ? "border-amber-500 text-amber-900 bg-white"
                        : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{language === "vi" ? "Hỏi đáp Chuyên sâu (Chat)" : "Interactive Grounded Q&A"}</span>
                  </button>
                  <button
                    onClick={() => setNotebookActiveWorkspaceTab('notes')}
                    className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      notebookActiveWorkspaceTab === 'notes'
                        ? "border-amber-500 text-amber-900 bg-white"
                        : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{language === "vi" ? "Tổng hợp & Tổng hợp Sư phạm" : "Academic Notes & Synthesis"}</span>
                  </button>
                </div>

                {/* Workspace Content */}
                <div className="flex-1 overflow-hidden relative">
                  
                  {/* Chat workspace */}
                  {notebookActiveWorkspaceTab === 'chat' && (
                    <div className="h-full flex flex-col justify-between">
                      <div className="flex-1 overflow-y-auto p-5 space-y-4 select-text">
                        {notebookChatMessages.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto space-y-3.5 select-none">
                            <div className="w-12 h-12 bg-amber-55/10 rounded-2xl flex items-center justify-center text-amber-500 shadow-xs border border-amber-100">
                              <MessageSquare className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-gray-700">
                                {language === "vi" ? "Trợ lý Tra cứu Tài liệu Chuyên sâu" : "Source Grounded Chatbot"}
                              </h4>
                              <p className="text-[10px] text-gray-400 leading-relaxed mt-1">
                                {language === "vi" 
                                  ? "Nhập câu hỏi bất kỳ. AI sẽ chỉ trích lục dữ liệu từ các tài liệu bạn đã tích chọn ở cột bên trái và trả lời chuẩn xác kèm trích dẫn nguồn gốc cụ thể."
                                  : "Ask anything about the checked materials. The AI will strictly search through them and respond with precise source tags."}
                              </p>
                            </div>
                          </div>
                        ) : (
                          notebookChatMessages.map(msg => (
                            <div 
                              key={msg.id} 
                              className={`flex items-start gap-3 ${msg.sender === "user" ? "flex-row-reverse" : ""}`}
                            >
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm font-mono text-[9px] font-bold ${
                                msg.sender === "user" 
                                  ? "bg-amber-500 text-white" 
                                  : "bg-[#18181b] text-amber-400"
                              }`}>
                                {msg.sender === "user" ? "ME" : "AI"}
                              </div>
                              <div className={`p-3 rounded-2xl max-w-[80%] text-xs leading-relaxed font-sans select-text ${
                                msg.sender === "user"
                                  ? "bg-amber-500 text-white"
                                  : "bg-gray-50 border border-gray-200 text-gray-800"
                              }`}>
                                <div className="space-y-1.5 whitespace-pre-wrap select-text">
                                  {/* Format citations visually in output */}
                                  {msg.text.split(/(\[[^\]]+\.pdf\]|\[[^\]]+\.docx\]|\[[^\]]+\.xlsx\]|\[DOCUMENT:[^\]]+\])/g).map((part, pIdx) => {
                                    const isCitation = part.startsWith('[') && part.endsWith(']');
                                    if (isCitation) {
                                      const cleanName = part.replace('[DOCUMENT:', '').replace('[', '').replace(']', '');
                                      return (
                                        <span key={pIdx} className={`px-1.5 py-0.5 mx-0.5 rounded font-mono text-[9px] font-bold border inline-flex items-center gap-0.5 ${
                                          msg.sender === "user"
                                            ? "bg-white/20 text-white border-white/30"
                                            : "bg-amber-100 text-amber-900 border-amber-200"
                                        }`} title="Reference Source Document">
                                          <Database className="w-2 h-2 shrink-0" />
                                          {cleanName}
                                        </span>
                                      );
                                    }
                                    return part;
                                  })}
                                </div>
                                <span className={`text-[8px] font-mono block mt-1.5 text-right ${
                                  msg.sender === "user" ? "text-white/60" : "text-gray-400"
                                }`}>
                                  {msg.timestamp}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                        {isNotebookChatLoading && (
                          <div className="flex items-center gap-3 animate-pulse">
                            <div className="w-7 h-7 rounded-full bg-[#18181b] text-amber-400 flex items-center justify-center shrink-0">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            </div>
                            <div className="bg-gray-50 border border-gray-150/60 p-3 rounded-2xl text-xs text-gray-500 font-sans">
                              {language === "vi" ? "AI đang tra cứu tài liệu và xây dựng câu trả lời..." : "AI is auditing source databases..."}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Chat Input Bar */}
                      <div className="p-3.5 border-t border-gray-150 bg-gray-50 shrink-0 select-none">
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            placeholder={
                              selectedNotebookDocIds.length === 0 
                                ? (language === "vi" ? "Vui lòng chọn ít nhất 1 nguồn ở cột trái..." : "Please check at least one source document...")
                                : (language === "vi" ? "Hỏi bất kỳ điều gì về tài liệu đối chiếu..." : "Ask a question about the active sources...")
                            }
                            value={notebookChatInput}
                            onChange={(e) => setNotebookChatInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleSendNotebookChat(); }}
                            disabled={selectedNotebookDocIds.length === 0 || isNotebookChatLoading}
                            className="w-full bg-white border border-gray-250 rounded-xl pl-4 pr-12 py-2.5 text-xs focus:ring-1 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none placeholder-gray-400 text-gray-700 disabled:bg-gray-100"
                          />
                          <button
                            onClick={handleSendNotebookChat}
                            disabled={!notebookChatInput.trim() || isNotebookChatLoading || selectedNotebookDocIds.length === 0}
                            className="absolute right-2 p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:bg-gray-200 disabled:text-gray-400 cursor-pointer transition-all shadow-sm flex items-center justify-center"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes workspace */}
                  {notebookActiveWorkspaceTab === 'notes' && (
                    <div className="h-full flex flex-col p-5 overflow-hidden font-sans">
                      
                      {/* Synthesizer Toolbar */}
                      <div className="flex flex-wrap gap-2.5 mb-4 shrink-0 select-none">
                        <button
                          onClick={() => handleGenerateNotebookNotes("summary")}
                          disabled={isGeneratingNotebookNotes || selectedNotebookDocIds.length === 0}
                          className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-250 text-amber-900 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <FileText className="w-3.5 h-3.5 text-amber-550" />
                          <span>{language === "vi" ? "Tóm tắt Chuyên sâu" : "Deep Summary"}</span>
                        </button>
                        <button
                          onClick={() => handleGenerateNotebookNotes("faq")}
                          disabled={isGeneratingNotebookNotes || selectedNotebookDocIds.length === 0}
                          className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-900 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-sky-500" />
                          <span>{language === "vi" ? "Sinh Bộ Câu hỏi FAQs" : "Academic FAQs"}</span>
                        </button>
                        <button
                          onClick={() => handleGenerateNotebookNotes("study-guide")}
                          disabled={isGeneratingNotebookNotes || selectedNotebookDocIds.length === 0}
                          className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 text-emerald-900 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{language === "vi" ? "Cẩm nang Sư phạm mẫu" : "Pedagogical Guide"}</span>
                        </button>
                      </div>

                      {/* Display panel */}
                      <div className="flex-1 border border-gray-200 bg-gray-50/20 rounded-xl overflow-y-auto p-5 relative select-text">
                        {isGeneratingNotebookNotes && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-white/70 backdrop-blur-xs select-none z-10">
                            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
                            <p className="text-xs font-semibold text-gray-700">{language === "vi" ? "AI đang tổng hợp dữ liệu học thuật..." : "Ingesting and organizing reference content..."}</p>
                            <p className="text-[10px] text-gray-400 mt-1 font-mono">Applying Grounded Knowledge Synthesis</p>
                          </div>
                        )}

                        {notebookNotesResult ? (
                          <div className="space-y-4 select-text">
                            <div className="flex justify-between items-center border-b border-gray-150 pb-3 mb-2 shrink-0 select-none">
                              <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wide">
                                {language === "vi" ? "Văn bản phân tích đối chiếu" : "Ingested Synthesized Material"}
                              </span>
                              <button
                                onClick={() => copyText(notebookNotesResult)}
                                className="px-2.5 py-1 text-[10px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" />
                                <span>{language === "vi" ? "Sao chép" : "Copy"}</span>
                              </button>
                            </div>
                            
                            <div className="text-xs text-gray-700 leading-relaxed space-y-3 font-sans select-text whitespace-pre-wrap">
                              {notebookNotesResult.split('\n').map((line, lineIdx) => {
                                if (line.startsWith('# ')) {
                                  return <h1 key={lineIdx} className="text-sm font-bold text-gray-900 mt-4 border-b border-gray-100 pb-1">{line.replace('# ', '')}</h1>;
                                }
                                if (line.startsWith('## ')) {
                                  return <h2 key={lineIdx} className="text-xs font-bold text-gray-800 mt-3">{line.replace('## ', '')}</h2>;
                                }
                                if (line.startsWith('### ')) {
                                  return <h3 key={lineIdx} className="text-[11px] font-bold text-gray-700 mt-2">{line.replace('### ', '')}</h3>;
                                }
                                if (line.startsWith('* ') || line.startsWith('- ')) {
                                  return <li key={lineIdx} className="ml-4 list-disc mt-1">{line.substring(2)}</li>;
                                }
                                return <p key={lineIdx} className="mt-1">{line}</p>;
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto space-y-3 text-gray-400 select-none">
                            <FileText className="w-10 h-10 text-amber-400 animate-pulse" />
                            <div>
                              <h4 className="text-xs font-bold text-gray-700">
                                {language === "vi" ? "Trình kiến tạo tư liệu học thuật" : "Academic Notes Workspace"}
                              </h4>
                              <p className="text-[10px] text-gray-400 leading-relaxed mt-1">
                                {language === "vi" 
                                  ? "Vui lòng chọn ít nhất một tệp nguồn ở cột trái, sau đó bấm nút sinh tóm tắt, FAQ hoặc cẩm nang đối chiếu từ thanh công cụ phía trên."
                                  : "Select source materials and click a tool button to synthesize study resources."}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>
          )}
          {/* TAB 12: CUSTOM LESSON & SLIDE PRESENTATION BUILDER */}
          {currentTab === "lesson-builder" && (
            <div className="max-w-5xl mx-auto grid grid-cols-12 gap-6 h-[calc(100vh-180px)] select-none">
              
              {/* Left Pane: Config Inputs (5/12 width) */}
              <div className="col-span-5 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col h-full overflow-y-auto font-sans space-y-4">
                <div>
                  <h2 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 font-mono uppercase tracking-wide">
                    <Presentation className="w-4 h-4 text-amber-500" />
                    {language === "vi" ? "Thiết Lập Soạn Giáo Án" : "Lesson Plan Builder Config"}
                  </h2>
                  <p className="text-[9px] text-gray-400 mt-0.5">
                    {language === "vi" ? "Điền mục tiêu và tải tài liệu mẫu để AI dựng bài" : "Input requirements and sample to auto-draft"}
                  </p>
                </div>

                {/* Objectives */}
                <div className="space-y-1">
                  <label className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider block font-mono">
                    {language === "vi" ? "Mục tiêu học tập chính (Objectives)" : "Learning Objectives"}
                  </label>
                  <textarea
                    placeholder={language === "vi" ? "Ví dụ: Học sinh hiểu cấu trúc hệ tuần hoàn, phân biệt động mạch và tĩnh mạch, đo được nhịp tim..." : "e.g. Describe the circulatory system and differentiate veins and arteries..."}
                    value={customObjectives}
                    onChange={(e) => setCustomObjectives(e.target.value)}
                    className="w-full h-24 bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-700 focus:ring-1 focus:ring-amber-500 placeholder-gray-400 focus:outline-none resize-none"
                  />
                </div>

                {/* Sample Document dropdown selector */}
                <div className="space-y-1">
                  <label className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider block font-mono">
                    {language === "vi" ? "Cấu trúc Giáo án mẫu (Reference Sample)" : "Reference Sample Structure"}
                  </label>
                  <select
                    value={customSampleDocId}
                    onChange={(e) => setCustomSampleDocId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-250 rounded-xl px-3 py-2 text-xs text-gray-700 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="">{language === "vi" ? "— Sử dụng định dạng mẫu chuẩn của hệ thống —" : "— Use standard platform template —"}</option>
                    {documents.map(doc => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name} ({(doc.fileSize / 1000).toFixed(0)} KB)
                      </option>
                    ))}
                  </select>
                  <span className="text-[8.5px] text-gray-400 block mt-0.5 leading-normal">
                    {language === "vi" ? "AI sẽ bắt chước chính xác phong cách thiết kế của tệp này." : "AI will replicate the layout and style of the selected file."}
                  </span>
                </div>

                {/* Custom Prompt */}
                <div className="space-y-1">
                  <label className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider block font-mono">
                    {language === "vi" ? "Yêu cầu sư phạm riêng (Custom Prompts)" : "Custom Prompts & Requests"}
                  </label>
                  <textarea
                    placeholder={language === "vi" ? "Ví dụ: Giáo án dài 80 phút, chia 3 phần hoạt động cụ thể, bổ sung 1 trò chơi Hook 10 phút, tích hợp câu hỏi suy luận của Vinschool..." : "e.g. 80-minute lesson, include a 10m Hook game, map specific TWS lab experiments..."}
                    value={customPedagogicalPrompt}
                    onChange={(e) => setCustomPedagogicalPrompt(e.target.value)}
                    className="w-full h-24 bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-700 focus:ring-1 focus:ring-amber-500 placeholder-gray-400 focus:outline-none resize-none"
                  />
                </div>

                {/* Action button */}
                <button
                  onClick={handleDraftCustomLesson}
                  disabled={isDraftingCustomLesson || !customObjectives.trim()}
                  className="w-full py-2.5 bg-[#18181b] hover:bg-[#27272a] disabled:bg-gray-150 disabled:text-gray-400 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer mt-2 shrink-0"
                >
                  {isDraftingCustomLesson ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{language === "vi" ? "AI đang soạn thảo Giáo án..." : "AI drafting Lesson..."}</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span>{language === "vi" ? "Soạn thảo Giáo án AI" : "Draft AI Lesson Plan"}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Right Pane: Output Workspace & Slides Presentation View (7/12 width) */}
              <div className="col-span-7 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
                
                {/* Header sub-tabs */}
                <div className="flex border-b border-gray-100 bg-gray-50 shrink-0">
                  <button
                    onClick={() => setCustomActiveSubTab('lesson')}
                    className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      customActiveSubTab === 'lesson'
                        ? "border-amber-500 text-amber-900 bg-white"
                        : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>{language === "vi" ? "Giáo án học thuật (Word)" : "Word Lesson Plan"}</span>
                  </button>
                  <button
                    onClick={() => setCustomActiveSubTab('slides')}
                    className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      customActiveSubTab === 'slides'
                        ? "border-amber-500 text-amber-900 bg-white"
                        : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <Presentation className="w-4 h-4" />
                    <span>{language === "vi" ? "Bài trình bày Slide" : "Presentation Slides"}</span>
                  </button>
                </div>

                {/* Output content area */}
                <div className="flex-1 overflow-hidden relative p-5 flex flex-col">
                  
                  {/* SUBTAB: Lesson plan draft text */}
                  {customActiveSubTab === 'lesson' && (
                    <div className="h-full flex flex-col overflow-hidden">
                      {generatedCustomLessonPlanText ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                          <div className="flex justify-between items-center border-b border-gray-150 pb-2.5 mb-3 shrink-0">
                            <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wide">
                              {language === "vi" ? "Văn bản Giáo án soạn theo mẫu" : "Drafted Word Lesson Plan (Grounded)"}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={handleGenerateSlides}
                                disabled={isGeneratingSlides}
                                className="px-2.5 py-1 text-[10px] font-bold text-amber-955 bg-amber-500 hover:bg-amber-600 text-white rounded border border-amber-500 shadow-sm transition-all cursor-pointer flex items-center gap-1"
                              >
                                {isGeneratingSlides ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Presentation className="w-3 h-3" />}
                                <span>{language === "vi" ? "Chuyển thành Slide" : "Convert to Slides"}</span>
                              </button>
                              <button
                                onClick={() => copyText(generatedCustomLessonPlanText)}
                                className="px-2.5 py-1 text-[10px] font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded border border-gray-250 transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" />
                                <span>{language === "vi" ? "Sao chép" : "Copy"}</span>
                              </button>
                            </div>
                          </div>

                          <div className="flex-1 border border-gray-250 bg-gray-50/20 rounded-xl overflow-y-auto p-4 select-text font-sans leading-relaxed text-xs space-y-2 whitespace-pre-wrap">
                            {generatedCustomLessonPlanText.split('\n').map((line, lineIdx) => {
                              if (line.startsWith('# ')) {
                                return <h1 key={lineIdx} className="text-sm font-bold text-gray-900 mt-3 border-b border-gray-150 pb-1">{line.replace('# ', '')}</h1>;
                              }
                              if (line.startsWith('## ')) {
                                return <h2 key={lineIdx} className="text-xs font-bold text-gray-800 mt-2.5">{line.replace('## ', '')}</h2>;
                              }
                              if (line.startsWith('### ')) {
                                return <h3 key={lineIdx} className="text-[11px] font-bold text-gray-700 mt-2">{line.replace('### ', '')}</h3>;
                              }
                              if (line.startsWith('* ') || line.startsWith('- ')) {
                                return <li key={lineIdx} className="ml-4 list-disc mt-0.5">{line.substring(2)}</li>;
                              }
                              return <p key={lineIdx} className="mt-0.5">{line}</p>;
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto space-y-3 text-gray-400">
                          <FileText className="w-10 h-10 text-amber-400 animate-pulse" />
                          <div>
                            <h4 className="text-xs font-bold text-gray-700">
                              {language === "vi" ? "Khu vực hiển thị Giáo án" : "Lesson Plan Board"}
                            </h4>
                            <p className="text-[10px] text-gray-400 leading-relaxed mt-1">
                              {language === "vi" 
                                ? "Điền các yêu cầu cấu hình ở cột bên trái và bấm 'Soạn thảo Giáo án AI' để sinh giáo án Word mẫu."
                                : "Fill out configuration on the left and click 'Draft AI Lesson Plan' to construct Word documentation."}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUBTAB: Presentation Slides Viewer */}
                  {customActiveSubTab === 'slides' && (
                    <div className="h-full flex flex-col overflow-hidden">
                      {isGeneratingSlides && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-white/80 backdrop-blur-xs select-none z-20">
                          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
                          <p className="text-xs font-semibold text-gray-700">{language === "vi" ? "AI đang biên soạn thiết kế slide..." : "AI modeling slide layout..."}</p>
                          <p className="text-[10px] text-gray-400 mt-1 font-mono">Structuring Presentation Cards</p>
                        </div>
                      )}

                      {generatedSlides.length > 0 ? (
                        <div className="flex-1 flex flex-col justify-between">
                          {/* Presenter Mode Slides Board */}
                          <div className="flex-1 flex flex-col justify-center p-2">
                            {(() => {
                              const slide = generatedSlides[activeSlideIndex];
                              if (!slide) return null;
                              return (
                                <div className="w-full aspect-[16/9] bg-[#18181b] rounded-2xl shadow-xl border border-amber-500/20 p-8 flex flex-col justify-between text-white relative overflow-hidden font-sans select-text">
                                  {/* Sci-fi glow lines decor */}
                                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />
                                  <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

                                  {/* Slide header */}
                                  <div className="flex justify-between items-start">
                                    <div className="space-y-0.5">
                                      <h2 className="text-lg font-bold text-amber-400 select-text leading-tight">{slide.title}</h2>
                                      {slide.subtitle && <p className="text-[11px] text-gray-400 italic select-text">{slide.subtitle}</p>}
                                    </div>
                                    <span className="px-2 py-0.5 bg-white/10 text-[9px] font-bold font-mono rounded text-gray-300">
                                      SLIDE {slide.slideNumber} / {generatedSlides.length}
                                    </span>
                                  </div>

                                  {/* Slide content bullets */}
                                  <div className="my-auto py-2 grid grid-cols-1 gap-2.5 max-h-[60%] overflow-y-auto">
                                    {slide.contentPoints.map((pt: string, ptIdx: number) => (
                                      <div key={ptIdx} className="flex items-start gap-2.5 text-xs text-gray-250 select-text">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0 animate-pulse" />
                                        <p className="leading-relaxed">{pt}</p>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Slide footer metadata / visual notes */}
                                  <div className="flex justify-between items-center border-t border-white/10 pt-3 text-[9px] text-gray-400 font-mono">
                                    {slide.twsFocus ? (
                                      <span className="inline-flex items-center gap-1 bg-sky-950 text-sky-300 px-2 py-0.5 rounded border border-sky-900/50">
                                        🎯 TWS Focus: {slide.twsFocus}
                                      </span>
                                    ) : (
                                      <span />
                                    )}
                                    {slide.visualCues && (
                                      <span className="text-right italic truncate max-w-[200px]">
                                        🎬 Visual: {slide.visualCues}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Navigation Panel */}
                          <div className="flex justify-between items-center border-t border-gray-150 pt-4 shrink-0 select-none mt-2">
                            <button
                              onClick={() => setActiveSlideIndex(prev => Math.max(0, prev - 1))}
                              disabled={activeSlideIndex === 0}
                              className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer transition-all"
                            >
                              {language === "vi" ? "◀ Slide trước" : "◀ Prev Slide"}
                            </button>

                            {/* Center Dots */}
                            <div className="flex items-center gap-1.5">
                              {generatedSlides.map((_, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setActiveSlideIndex(idx)}
                                  className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                                    activeSlideIndex === idx ? "bg-amber-500 scale-125" : "bg-gray-200 hover:bg-gray-350"
                                  }`}
                                />
                              ))}
                            </div>

                            <button
                              onClick={() => setActiveSlideIndex(prev => Math.min(generatedSlides.length - 1, prev + 1))}
                              disabled={activeSlideIndex === generatedSlides.length - 1}
                              className="px-3 py-1.5 bg-[#18181b] hover:bg-[#27272a] disabled:opacity-40 text-white text-xs font-semibold rounded-xl cursor-pointer transition-all"
                            >
                              {language === "vi" ? "Slide tiếp theo ▶" : "Next Slide ▶"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto space-y-3.5 text-gray-400">
                          <Presentation className="w-10 h-10 text-amber-400 animate-pulse" />
                          <div>
                            <h4 className="text-xs font-bold text-gray-700">
                              {language === "vi" ? "Kiến tạo Slide Bài giảng" : "Presentation Slides Board"}
                            </h4>
                            <p className="text-[10px] text-gray-400 leading-relaxed mt-1">
                              {generatedCustomLessonPlanText 
                                ? (language === "vi" 
                                    ? "Bấm nút 'Chuyển thành Slide' ở Tab Giáo án hoặc bấm nút sinh slide dưới đây để AI phân tích cấu trúc bài học và dựng các thẻ slide trình bày."
                                    : "Click 'Convert to Slides' in the Lesson Plan tab to generate presentation slides.")
                                : (language === "vi" 
                                    ? "Vui lòng hoàn tất soạn thảo giáo án học thuật ở tab bên cạnh trước khi sinh slide bài giảng."
                                    : "Please draft your lesson plan on the adjacent tab before generating slides.")}
                            </p>
                            {generatedCustomLessonPlanText && (
                              <button
                                onClick={handleGenerateSlides}
                                className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition-all flex items-center gap-1.5 mx-auto"
                              >
                                <Presentation className="w-3.5 h-3.5" />
                                <span>{language === "vi" ? "Sinh Slide Bài giảng" : "Generate Slides Now"}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>

            </div>
          )}

          {/* TAB 7: LESSON COMPARATOR */}
          {currentTab === "comparator" && (
            <div className="max-w-5xl mx-auto h-full space-y-6">
              
              {/* Selector panel */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
              <div className="grid grid-cols-2 gap-6 font-sans">
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
                              <span className="font-semibold text-[10px] text-sky-955 uppercase font-mono block">{translateTwsStage(tws.stage)}</span>
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
                        <div className="space-y-2 font-sans font-sans">
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

                      <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100/60 text-sky-955 animate-fade-in">
                        <h4 className="font-bold text-sky-900 font-mono text-[10px] uppercase mb-1.5">{t.aiCompareTws}</h4>
                        <p>{compareResult.twsIntegrationComparison}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100/60 text-purple-955 animate-fade-in">
                        <h4 className="font-bold text-purple-900 font-mono text-[10px] uppercase mb-1.5">{t.aiCompareCognitive}</h4>
                        <p>{compareResult.cognitiveDepthAnalysis}</p>
                      </div>

                      <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/60 text-emerald-955 animate-fade-in">
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
                <p className="text-xs text-gray-550 mt-1 mb-3">{t.docsSubtitle}</p>
                
                {/* AI Grounding Active Sync Banner */}
                <div className="bg-amber-50/40 border border-amber-200/50 rounded-xl p-3 text-xs text-amber-955 font-sans mb-3 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <span className="font-bold block text-[10px] uppercase tracking-wide font-mono text-amber-900">
                      {language === "vi" ? "Tự động Đồng bộ hóa AI" : "AI Ingestion Active"}
                    </span>
                    <p className="text-[9px] text-amber-800/90 leading-relaxed mt-0.5">
                      {language === "vi" 
                        ? "Tất cả các tài liệu ở danh sách dưới đã được nạp tự động vào bộ não AI để làm dữ liệu nền tảng đối chiếu (AI Knowledge Base) cho các tác vụ kiểm định giáo án, lập kế hoạch can thiệp học thuật và sinh câu hỏi tư duy."
                        : "All files below are actively indexed in the AI Grounding database. When you generate questions or run audits, the AI cross-references this material."}
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5">
                  {documents.map((doc) => (
                    <div 
                      key={doc.id}
                      className="p-3 bg-gray-55 border border-gray-150/60 hover:bg-gray-100/50 rounded-xl flex items-center justify-between transition-colors animate-fade-in"
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
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <p className="text-[9px] font-mono text-gray-400 uppercase">
                            {doc.type} • {(doc.fileSize / 1000).toFixed(0)} KB
                          </p>
                          {doc.targetGrade && (
                            <span className="inline-flex items-center text-[8px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-250/20 px-1 py-0.2 rounded">
                              LỚP {doc.targetGrade}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-0.5 text-[8px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-250/30 px-1 py-0.2 rounded uppercase">
                            <CheckCircle className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                            {language === "vi" ? "AI Đã Đọc" : "AI Ingested"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setSelectedDocIdReader(doc.id);
                            setIsSplitReaderOpen(true);
                          }}
                          className="px-2 py-1 text-[10px] font-bold text-gray-500 hover:bg-gray-100 rounded cursor-pointer"
                        >
                          {t.btnReadPanel}
                        </button>
                        <button
                          onClick={() => handleExtractCurriculum(doc.id)}
                          disabled={isExtractingCurriculum !== null}
                          className="px-2.5 py-1 text-[10px] font-bold text-amber-950 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded border border-amber-500 shadow-sm transition-all cursor-pointer flex items-center gap-1 shrink-0"
                          title={language === "vi" ? "Trích xuất danh mục bài học từ tài liệu này" : "Sync lessons & standards database from this file"}
                        >
                          {isExtractingCurriculum === doc.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin text-white" />
                          ) : (
                            <Sparkles className="w-3 h-3 text-white" />
                          )}
                          <span>{language === "vi" ? "Đồng bộ" : "Sync DB"}</span>
                        </button>
                      </div>
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

          {/* TAB 9: CURRICULUM DESIGN WORKBENCH (KHUNG CHƯƠNG TRÌNH) */}
          {currentTab === "scheduler" && (
            <div className="max-w-5xl mx-auto h-full space-y-6 animate-fade-in font-sans">
              
              {/* Parameter Settings Bar */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-gray-900">
                    {language === "vi" ? "Thiết kế Khung chương trình học thuật" : "Curriculum Framework Design Workbench"}
                  </h2>
                  <p className="text-xs text-gray-550">
                    {language === "vi" 
                      ? "Xác định các chủ đề học thuật lớn, phân bổ số tiết định biên (3 tiết/tuần) và ánh xạ các chuẩn Cambridge cùng TWS."
                      : "Define major curriculum units, allocate yearly period budgets, and map Cambridge objectives and TWS focus."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs">
                  {/* Total weeks parameter */}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-600">{language === "vi" ? "Số tuần học:" : "Total Weeks:"}</span>
                    <input 
                      type="number" 
                      min={10} 
                      max={45} 
                      value={totalWeeks}
                      onChange={(e) => setTotalWeeks(Number(e.target.value))}
                      className="w-14 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-center font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Periods per week parameter */}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-600">{language === "vi" ? "Số tiết/tuần:" : "Periods/Week:"}</span>
                    <input 
                      type="number" 
                      min={1} 
                      max={10} 
                      value={periodsPerWeek}
                      onChange={(e) => setPeriodsPerWeek(Number(e.target.value))}
                      className="w-12 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-center font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Run Button */}
                  <button
                    onClick={handleAuditFramework}
                    disabled={isAuditingFramework}
                    className="px-4 py-2 bg-[#18181b] hover:bg-[#27272a] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 disabled:bg-gray-150 disabled:text-gray-400 transition-all cursor-pointer shadow-sm"
                  >
                    {isAuditingFramework ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{language === "vi" ? "AI đang thẩm định..." : "AI Auditing..."}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                        <span>{language === "vi" ? "AI Thẩm định Khung" : "AI Audit Framework"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase block font-mono">{language === "vi" ? "Tổng số chủ đề" : "Topics count"}</span>
                    <span className="text-sm font-bold text-gray-800">{frameworkTopics.length} chủ đề</span>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase block font-mono">{language === "vi" ? "Số tiết đã phân bổ" : "Allocated periods"}</span>
                    <span className="text-sm font-bold text-gray-800">
                      {frameworkTopics.reduce((acc, t) => acc + t.allocatedPeriods, 0)} tiết
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-500 flex items-center justify-center shrink-0">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase block font-mono">{language === "vi" ? "Quỹ tiết năm học" : "Year Period Budget"}</span>
                    <span className="text-sm font-bold text-gray-800">{totalWeeks * periodsPerWeek} tiết</span>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase block font-mono">{language === "vi" ? "Quỹ tiết dư" : "Buffer periods"}</span>
                    <span className="text-sm font-bold text-gray-800">
                      {totalWeeks * periodsPerWeek - frameworkTopics.reduce((acc, t) => acc + t.allocatedPeriods, 0)} tiết
                    </span>
                  </div>
                </div>
              </div>

              {/* Two Column Layout: Editor & AI Inspector */}
              <div className="grid grid-cols-12 gap-6 items-start">
                
                {/* Left Column: Topics List & Editor (5/12 cols) */}
                <div className="col-span-5 space-y-4">
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4.5 space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider font-mono">
                        {language === "vi" ? "Danh sách Chủ đề Khung" : "Framework Units List"}
                      </h3>
                      <button
                        onClick={() => {
                          const newId = `topic_${Date.now()}`;
                          const newTopic = {
                            id: newId,
                            name: "New Curriculum Topic",
                            nameVi: "Chủ đề học thuật mới",
                            allocatedPeriods: 10,
                            mappedStandardCodes: [],
                            twsFocus: []
                          };
                          setFrameworkTopics(prev => [...prev, newTopic]);
                          setActiveFrameworkTopicId(newId);
                        }}
                        className="px-2 py-1 text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{language === "vi" ? "Thêm" : "Add"}</span>
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {frameworkTopics.map((topic) => (
                        <div 
                          key={topic.id}
                          onClick={() => setActiveFrameworkTopicId(topic.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            activeFrameworkTopicId === topic.id
                              ? "bg-amber-50 text-amber-900 border-amber-300 shadow-sm"
                              : "bg-gray-55/60 border-gray-150 hover:bg-gray-100/50 text-gray-700"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-bold leading-snug">
                              {language === "vi" ? topic.nameVi : topic.name}
                            </span>
                            <span className="px-1.5 py-0.5 bg-white/80 border border-amber-250/30 text-[9px] font-mono font-bold rounded shrink-0">
                              {topic.allocatedPeriods} tiết
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-1 mt-2.5">
                            {topic.mappedStandardCodes.length === 0 ? (
                              <span className="text-[9px] text-gray-400 italic">Chưa liên kết chuẩn</span>
                            ) : (
                              topic.mappedStandardCodes.map((code: string) => (
                                <span key={code} className="px-1 py-0.2 bg-white/70 border border-gray-200 text-[8px] font-mono text-gray-500 rounded">
                                  {code}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Active Topic Editor Card */}
                  {(() => {
                    const activeTopic = frameworkTopics.find(t => t.id === activeFrameworkTopicId);
                    if (!activeTopic) return null;
                    return (
                      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4.5 space-y-3.5">
                        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider font-mono">
                          {language === "vi" ? "Chỉnh sửa Chủ đề đang chọn" : "Edit Active Topic"}
                        </h4>

                        {/* Title input */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">
                            {language === "vi" ? "Tên Chủ đề (Tiếng Việt)" : "Topic Title (Vietnamese)"}
                          </label>
                          <input 
                            type="text"
                            value={activeTopic.nameVi}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFrameworkTopics(prev => prev.map(t => t.id === activeTopic.id ? { ...t, nameVi: val } : t));
                            }}
                            className="w-full bg-gray-55 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>

                        {/* Allocated periods slider */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">
                              {language === "vi" ? "Số tiết phân bổ" : "Allocated Periods"}
                            </label>
                            <span className="text-xs font-bold text-amber-900 font-mono bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {activeTopic.allocatedPeriods} tiết
                            </span>
                          </div>
                          <input 
                            type="range"
                            min={2}
                            max={40}
                            value={activeTopic.allocatedPeriods}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setFrameworkTopics(prev => prev.map(t => t.id === activeTopic.id ? { ...t, allocatedPeriods: val } : t));
                            }}
                            className="w-full accent-amber-500 cursor-pointer"
                          />
                        </div>

                        {/* Delete topic button */}
                        <button
                          onClick={() => {
                            if (frameworkTopics.length <= 1) {
                              showToast(language === "vi" ? "Cần giữ lại ít nhất 1 chủ đề!" : "Must keep at least 1 topic!");
                              return;
                            }
                            const updated = frameworkTopics.filter(t => t.id !== activeTopic.id);
                            setFrameworkTopics(updated);
                            setActiveFrameworkTopicId(updated[0].id);
                          }}
                          className="w-full py-1.5 border border-red-200 text-red-700 bg-red-50/20 hover:bg-red-50 hover:text-red-800 text-[10px] font-bold rounded-lg transition-colors cursor-pointer text-center"
                        >
                          {language === "vi" ? "Xóa chủ đề này" : "Delete this Topic"}
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Right Column: AI Audit & Standards Pool Mapping (7/12 cols) */}
                <div className="col-span-7 space-y-4">
                  
                  {/* Standards Mapper Board */}
                  {(() => {
                    const activeTopic = frameworkTopics.find(t => t.id === activeFrameworkTopicId);
                    if (!activeTopic) return null;
                    return (
                      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
                        <div className="space-y-1">
                          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider font-mono">
                            {language === "vi" ? "Kho chuẩn Cambridge & Tích hợp TWS" : "Cambridge Standards & TWS Mapper"}
                          </h3>
                          <p className="text-[10px] text-gray-550">
                            {language === "vi" 
                              ? `Đánh dấu tích để gán các chuẩn học thuật Cambridge cho: ${activeTopic.nameVi}`
                              : `Select standards to allocate to: ${activeTopic.name}`}
                          </p>
                        </div>

                        {/* Standards checkbox grid */}
                        <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50 space-y-3.5 max-h-[250px] overflow-y-auto">
                          
                          {/* Biology Standards */}
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-bold text-gray-400 font-mono block uppercase">Sinh học (Biology)</span>
                            <div className="grid grid-cols-3 gap-2">
                              {standards.filter(s => s.strand === "Biology").map(s => {
                                const isMapped = activeTopic.mappedStandardCodes.includes(s.code);
                                return (
                                  <button
                                    key={s.code}
                                    onClick={() => {
                                      const updatedCodes = isMapped
                                        ? activeTopic.mappedStandardCodes.filter((c: string) => c !== s.code)
                                        : [...activeTopic.mappedStandardCodes, s.code];
                                      setFrameworkTopics(prev => prev.map(t => t.id === activeTopic.id ? { ...t, mappedStandardCodes: updatedCodes } : t));
                                    }}
                                    className={`p-1.5 rounded-lg border text-left text-[10px] transition-all cursor-pointer flex items-center justify-between gap-1 ${
                                      isMapped 
                                        ? "bg-amber-50 text-amber-900 border-amber-300 font-bold" 
                                        : "bg-white text-gray-500 border-gray-200 hover:border-amber-200"
                                    }`}
                                    title={s.description}
                                  >
                                    <span className="truncate">{s.code}</span>
                                    <span className="text-[8px] font-normal opacity-70 shrink-0">{isMapped ? "✔" : "+"}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Chemistry & Physics Standards */}
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-bold text-gray-400 font-mono block uppercase">Hóa học & Vật lý (Chemistry & Physics)</span>
                            <div className="grid grid-cols-3 gap-2">
                              {standards.filter(s => s.strand === "Chemistry" || s.strand === "Physics").map(s => {
                                const isMapped = activeTopic.mappedStandardCodes.includes(s.code);
                                return (
                                  <button
                                    key={s.code}
                                    onClick={() => {
                                      const updatedCodes = isMapped
                                        ? activeTopic.mappedStandardCodes.filter((c: string) => c !== s.code)
                                        : [...activeTopic.mappedStandardCodes, s.code];
                                      setFrameworkTopics(prev => prev.map(t => t.id === activeTopic.id ? { ...t, mappedStandardCodes: updatedCodes } : t));
                                    }}
                                    className={`p-1.5 rounded-lg border text-left text-[10px] transition-all cursor-pointer flex items-center justify-between gap-1 ${
                                      isMapped 
                                        ? "bg-amber-50 text-amber-900 border-amber-300 font-bold" 
                                        : "bg-white text-gray-500 border-gray-200 hover:border-amber-200"
                                    }`}
                                    title={s.description}
                                  >
                                    <span className="truncate">{s.code}</span>
                                    <span className="text-[8px] font-normal opacity-70 shrink-0">{isMapped ? "✔" : "+"}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* TWS Skills Checkboxes */}
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-bold text-gray-400 font-mono block uppercase">Tích hợp Tư duy & Làm việc Khoa học (TWS)</span>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { code: "5TWSm.01", desc: "Trình bày mô hình cốt lõi" },
                                { code: "5TWSm.02", desc: "Sử dụng sơ đồ/mô hình" },
                                { code: "5TWSp.03", desc: "Đưa ra dự đoán khoa học" },
                                { code: "5TWSc.08", desc: "Thu thập ghi chép bằng bảng" },
                                { code: "5TWSa.01", desc: "Đánh giá dự đoán khoa học" },
                                { code: "5TWSa.05", desc: "Vẽ biểu đồ biểu diễn số liệu" }
                              ].map(s => {
                                const isMapped = activeTopic.twsFocus.includes(s.code);
                                return (
                                  <button
                                    key={s.code}
                                    onClick={() => {
                                      const updatedTWS = isMapped
                                        ? activeTopic.twsFocus.filter((c: string) => c !== s.code)
                                        : [...activeTopic.twsFocus, s.code];
                                      setFrameworkTopics(prev => prev.map(t => t.id === activeTopic.id ? { ...t, twsFocus: updatedTWS } : t));
                                    }}
                                    className={`p-1.5 rounded-lg border text-left text-[10px] transition-all cursor-pointer flex items-center justify-between gap-1 ${
                                      isMapped 
                                        ? "bg-sky-50 text-sky-900 border-sky-300 font-bold" 
                                        : "bg-white text-gray-500 border-gray-200 hover:border-sky-200"
                                    }`}
                                    title={s.desc}
                                  >
                                    <span className="truncate">{s.code}</span>
                                    <span className="text-[8px] font-normal opacity-70 shrink-0">{isMapped ? "✔" : "+"}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })()}

                  {/* AI Framework Audit Display Panel */}
                  {isAuditingFramework ? (
                    <div className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
                      <RefreshCw className="w-10 h-10 text-amber-500 animate-spin mb-3" />
                      <h4 className="text-xs font-bold text-gray-700">{language === "vi" ? "AI đang đánh giá cân bằng số tiết và chuẩn..." : "AI Auditing Framework Balance..."}</h4>
                      <p className="text-[10px] text-gray-400 mt-1 max-w-sm">
                        Gemini đang kiểm tra mức độ phủ sóng của chuẩn Cambridge, mật độ phân phối số tiết (periods) và phân phối kỹ năng TWS theo chuẩn Vinschool.
                      </p>
                    </div>
                  ) : frameworkAuditResult ? (
                    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4 select-text">
                      <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider font-mono border-b border-gray-100 pb-2 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        {language === "vi" ? "KẾT QUẢ KIỂM ĐỊNH KHUNG CHƯƠNG TRÌNH AI" : "AI FRAMEWORK DESIGN AUDIT REPORT"}
                      </h3>

                      <div className="space-y-3.5 text-xs text-gray-700 leading-relaxed">
                        
                        {/* Period Balance Analysis */}
                        <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100/60">
                          <span className="font-bold text-amber-900 block font-mono text-[9px] uppercase mb-1">CÂN ĐỐI QUỸ THỜI GIAN (PERIOD BALANCE AUDIT)</span>
                          <p>{frameworkAuditResult.periodBalanceAudit}</p>
                        </div>

                        {/* Standards Coverage Analysis */}
                        <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/60 text-emerald-950">
                          <span className="font-bold text-emerald-900 block font-mono text-[9px] uppercase mb-1">MỨC ĐỘ PHỦ CHUẨN CAMBRIDGE (STANDARDS COVERAGE)</span>
                          <p>{frameworkAuditResult.coverageAudit}</p>
                        </div>

                        {/* TWS pedagogical advice */}
                        <div className="bg-sky-55/60 p-3 rounded-xl border border-sky-100 text-sky-955">
                          <span className="font-bold text-sky-900 block font-mono text-[9px] uppercase mb-1">TÍCH HỢP TƯ DUY TWS (TWS INTEGRATION ADVICE)</span>
                          <p>{frameworkAuditResult.twsMappingAdvice}</p>
                        </div>

                        {/* Suggested Adjustments */}
                        {frameworkAuditResult.suggestedAdjustments && frameworkAuditResult.suggestedAdjustments.length > 0 && (
                          <div className="space-y-2">
                            <span className="font-bold text-gray-500 block font-mono text-[9px] uppercase">HÀNH ĐỘNG ĐỀ XUẤT CHO VIẾT CHƯƠNG TRÌNH (RECOMMENDED ACTIONS)</span>
                            <div className="space-y-2">
                              {frameworkAuditResult.suggestedAdjustments.map((adj: any, aIdx: number) => (
                                <div key={aIdx} className="bg-white border border-gray-150 p-3 rounded-xl flex gap-2">
                                  <span className="px-2 py-0.5 bg-[#18181b] text-white rounded font-mono text-[8px] font-bold h-fit shrink-0 uppercase">
                                    {adj.action}
                                  </span>
                                  <div>
                                    <span className="font-bold text-gray-800 text-[11px] block">{adj.topicName}</span>
                                    <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{adj.details}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
                      <Sparkles className="w-10 h-10 text-amber-500 mb-3 animate-pulse" />
                      <h4 className="text-xs font-bold text-gray-700">{language === "vi" ? "Thẩm định thiết kế khung bằng AI" : "AI Design Validator"}</h4>
                      <p className="text-[10px] text-gray-550 mt-1 max-w-sm">
                        Thiết lập các chủ đề ở cột trái, liên kết chuẩn Cambridge tương ứng, sau đó bấm **"AI Thẩm định Khung"** ở trên để kiểm tra thiết kế của bạn có bị khoảng trống kiến thức hay thiếu quỹ thời gian không.
                      </p>
                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

          {/* TAB 10: STUDENT REMEDIATION & INTERVENTION PLANNER */}
          {currentTab === "remediation" && (
            <div className="max-w-5xl mx-auto h-full grid grid-cols-12 gap-6 items-start font-sans animate-fade-in">
              
              {/* Left Column: Diagnostic input (4/12 cols) */}
              <div className="col-span-4 space-y-4">
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider font-mono">
                      {language === "vi" ? "Báo cáo Đánh giá Học sinh" : "Diagnostic Assessment Input"}
                    </h3>
                    <p className="text-[10px] text-gray-550">
                      {language === "vi"
                        ? "Dán nhận xét bài thi, kết quả khảo sát định kỳ hoặc thống kê chuẩn học sinh còn yếu."
                        : "Paste assessment reports, mock test analytics, or class performance comments."}
                    </p>
                  </div>

                  {/* Diagnostic report input */}
                  <textarea
                    value={diagnosticReport}
                    onChange={(e) => setDiagnosticReport(e.target.value)}
                    required
                    rows={8}
                    placeholder="Paste diagnostic observations here..."
                    className="w-full bg-gray-55 border border-gray-200 rounded-xl p-3 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none font-sans"
                  />

                  {/* Run analysis button */}
                  <button
                    onClick={handleGenerateRemediation}
                    disabled={isAnalyzingRemediation || !diagnosticReport.trim()}
                    className="w-full py-2.5 bg-[#18181b] hover:bg-[#27272a] disabled:bg-gray-150 disabled:text-gray-400 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isAnalyzingRemediation ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{language === "vi" ? "AI đang lập phương án..." : "AI Planning..."}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                        <span>{language === "vi" ? "Phân tích & Lập câu hỏi" : "Analyze & Design Intervention"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Column: Remediation result output (8/12 cols) */}
              <div className="col-span-8 space-y-4">
                
                {isAnalyzingRemediation ? (
                  <div className="bg-white border border-gray-200 rounded-3xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
                    <RefreshCw className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                    <h4 className="text-sm font-bold text-gray-700">
                      {language === "vi" ? "AI đang lập kế hoạch can thiệp học thuật..." : "AI Building Remediation Plan..."}
                    </h4>
                    <p className="text-xs text-gray-400 mt-1 max-w-md leading-relaxed">
                      AI đang phân tích các lỗi sai/điểm yếu của học sinh, tự động định vị các bài dạy trong chương trình và thiết kế câu hỏi chất vấn định hướng "Làm sao ta biết chắc chắn".
                    </p>
                  </div>
                ) : remediationResult ? (
                  <div className="space-y-6 select-text">
                    
                    {/* Overall intervention strategy */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-2">
                      <span className="text-[9px] font-bold text-gray-400 font-mono block uppercase">CHIẾN LƯỢC CAN THIỆP TỔNG QUAN (OVERALL INTERVENTION STRATEGY)</span>
                      <p className="text-xs text-gray-700 leading-relaxed">
                        {remediationResult.overallInterventionStrategy}
                      </p>
                    </div>

                    {/* Identified Weaknesses list */}
                    <div className="space-y-4">
                      {remediationResult.identifiedWeaknesses.map((weakness: any, wIdx: number) => (
                        <div key={wIdx} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden">
                          
                          {/* Accent line */}
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500" />
                          
                          <div className="flex justify-between items-start font-mono pl-2">
                            <div className="space-y-1">
                              <span className="px-2 py-0.5 bg-red-600 text-white rounded font-mono text-[9px] font-bold">
                                {weakness.standardCode}
                              </span>
                              <span className="text-[10px] text-gray-800 font-semibold block font-sans">
                                {weakness.standardDesc}
                              </span>
                            </div>
                            <span className="text-[9px] tracking-wider text-red-500 font-bold uppercase shrink-0">
                              {language === "vi" ? "Khuyết kỹ năng" : "Weakness Identified"}
                            </span>
                          </div>

                          {/* Detail fields */}
                          <div className="text-xs space-y-3.5 pl-2">
                            
                            {/* Reason for failure */}
                            <div className="text-gray-700 bg-red-50/20 border border-red-100/50 p-3 rounded-xl">
                              <span className="font-bold text-red-900 block font-mono text-[9px] uppercase mb-1">NGUYÊN NHÂN GÂY LỖI / YẾU (DIAGNOSTIC ANALYSIS)</span>
                              {weakness.reason}
                            </div>

                            {/* Target lessons */}
                            <div className="flex gap-2 items-center">
                              <span className="font-bold text-gray-500 font-mono text-[9px] uppercase">{language === "vi" ? "ĐỊNH VỊ BÀI DẠY:" : "TARGET LESSONS:"}</span>
                              <div className="flex flex-wrap gap-1.5">
                                {weakness.targetLessons.map((lesId: string, lIdx: number) => {
                                  const targetL = lessons.find(l => l.id === lesId || l.title === lesId);
                                  return (
                                    <span key={lIdx} className="px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-200 rounded text-[9px] font-semibold">
                                      {targetL ? (language === "vi" ? targetL.titleVi || targetL.title : targetL.title) : lesId}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>

                            <hr className="border-gray-100" />

                            {/* Thinking Question */}
                            <div className="bg-amber-50/30 border border-amber-100 rounded-xl p-4 space-y-2">
                              <span className="font-bold text-amber-900 block font-mono text-[9px] uppercase">CÂU HỎI TƯ DUY KHẮC PHỤC (HOW DO WE KNOW REMEDIATION QUESTION)</span>
                              <p className="font-bold text-gray-800 text-xs font-serif leading-relaxed italic">
                                "{weakness.remediationQuestion}"
                              </p>
                              <div className="text-[10px] text-gray-500 mt-2 font-sans pt-1 border-t border-amber-150/40">
                                <span className="font-bold uppercase font-mono block text-[8px] text-amber-900 mb-0.5">Tiêu chí câu trả lời mong đợi (Expected Answer):</span>
                                {weakness.expectedAnswerGuide}
                              </div>
                            </div>

                            {/* Teacher exploitation guide */}
                            <div className="bg-sky-50/30 border border-sky-100 rounded-xl p-4 space-y-2">
                              <span className="font-bold text-sky-900 block font-mono text-[9px] uppercase">ĐỊNH HƯỚNG SƯ PHẠM CHO GIÁO VIÊN KHAI THÁC (TEACHER REMEDIATION GUIDE)</span>
                              <p className="text-gray-700 leading-relaxed font-sans">
                                {weakness.teacherExploitationGuide}
                              </p>
                            </div>

                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-3xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
                    <GraduationCap className="w-12 h-12 text-gray-300 stroke-1 mb-3 animate-pulse" />
                    <h4 className="text-sm font-bold text-gray-700">
                      {language === "vi" ? "Sẵn sàng lập kế hoạch can thiệp học thuật" : "Student Intervention Planner Ready"}
                    </h4>
                    <p className="text-xs text-gray-550 mt-1 max-w-sm">
                      {language === "vi"
                        ? "Dán kết quả khảo sát định kỳ hoặc nhận xét học sinh vào ô bên trái, sau đó bấm 'Phân tích & Lập câu hỏi' để AI thiết kế tài liệu can thiệp."
                        : "Enter diagnostic student performance metrics at the left, then click 'Analyze' to design targeted interventions."}
                    </p>
                  </div>
                )}

              </div>

            </div>
          )}

        </div>

        {/* Global Footer Credits */}
        <footer className="h-9 border-t border-gray-100 bg-white px-6 flex items-center justify-between text-[10px] text-gray-400 font-mono shrink-0 select-none">
          <span>{t.footerBranding}</span>
          <span className="font-semibold text-gray-500">
            {language === "vi" ? "Được phát triển bởi Ms.Ngọc Mai" : "Developed by Ms.Ngọc Mai"}
          </span>
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
        selectedDocId={selectedDocIdReader}
        setSelectedDocId={setSelectedDocIdReader}
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

      {/* Import Lesson Modal */}
      {showImportLessonModal && (
        <div className="fixed inset-0 z-50 bg-[#18181b]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl max-w-xl w-full shadow-2xl p-6 space-y-5 flex flex-col font-sans">
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-50 text-amber-500 border border-amber-200 rounded-xl flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 leading-snug">{t.importLessonTitle}</h3>
                  <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wide mt-0.5 font-sans">Vinschool Science Co-pilot</p>
                </div>
              </div>
              
              <button 
                onClick={() => { setShowImportLessonModal(false); setImportLessonError(null); }}
                className="text-gray-400 hover:text-gray-600 text-xs font-bold px-2 py-1 rounded hover:bg-gray-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed font-sans">
              {t.importLessonInstructions}
            </p>

            {isImportingLesson ? (
              <div className="py-12 flex flex-col items-center justify-center font-sans">
                <RefreshCw className="w-10 h-10 text-amber-500 animate-spin mb-4" />
                <p className="text-xs font-semibold text-gray-700">{t.importingLesson}</p>
                <p className="text-[10px] text-gray-400 mt-1 font-mono">Calling Gemini Structural Extraction</p>
              </div>
            ) : (
              <div className="space-y-4 font-sans">
                
                {/* File Import Drag Zone */}
                <label className="border border-dashed border-gray-300 hover:border-amber-500 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-amber-50/5 transition-all relative cursor-pointer">
                  <UploadCloud className="w-8 h-8 text-gray-400 mb-2 stroke-1.5" />
                  <span className="text-xs font-semibold text-gray-700">Tải lên tệp giáo án (.docx, .pdf, .txt)</span>
                  <input 
                    type="file" 
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={handleImportLessonFile}
                    className="hidden"
                  />
                </label>

                <div className="text-center text-[10px] font-bold text-gray-400 uppercase font-mono">— {language === "vi" ? "HOẶC DÁN VĂN BẢN THÔ" : "OR PASTE RAW TEXT"} —</div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase font-mono">{t.labelPasteLesson}</label>
                  <textarea
                    placeholder="Dán nội dung giáo án (Ví dụ bao gồm: tên bài học, thời lượng, mục tiêu bài học, chuỗi hoạt động)..."
                    value={importLessonText}
                    onChange={(e) => setImportLessonText(e.target.value)}
                    className="w-full h-40 bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-xs text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {importLessonError && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex gap-2 items-start text-xs text-red-800">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{language === "vi" ? "Lỗi nhập giáo án" : "Import Failed"}</p>
                      <p className="text-[10px] text-red-700/80 mt-0.5">{importLessonError}</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowImportLessonModal(false); setImportLessonError(null); }}
                    className="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-50 cursor-pointer"
                  >
                    {language === "vi" ? "Hủy" : "Cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={() => performLessonTextImport(importLessonText)}
                    disabled={!importLessonText.trim()}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-150 disabled:text-gray-400 text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                  >
                    {t.btnImportText}
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
