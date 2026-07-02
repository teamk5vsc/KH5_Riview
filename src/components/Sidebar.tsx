import React from "react";
import { 
  Layers, 
  Map, 
  Sparkles, 
  HelpCircle, 
  BookOpen, 
  Activity, 
  FileText, 
  Database, 
  GitCompare, 
  GraduationCap
} from "lucide-react";
import { TRANSLATIONS } from "../translations";

export type TabType = 
  | "explorer" 
  | "mapping" 
  | "ai-review" 
  | "question-gen" 
  | "guidance-gen" 
  | "gap-analysis" 
  | "comparator" 
  | "documents";

interface SidebarProps {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  activeLessonId?: string;
  uploadedCount: number;
  language: "vi" | "en";
}

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  activeLessonId, 
  uploadedCount,
  language
}: SidebarProps) {
  const t = TRANSLATIONS[language];
  
  const navItems = [
    {
      id: "explorer" as TabType,
      label: t.tabExplorer,
      icon: Layers,
      section: "FRAMEWORKS"
    },
    {
      id: "mapping" as TabType,
      label: t.tabMapping,
      icon: Map,
      section: "FRAMEWORKS"
    },
    {
      id: "ai-review" as TabType,
      label: t.tabAuditor,
      icon: Sparkles,
      section: "AI COPROCESSOR"
    },
    {
      id: "question-gen" as TabType,
      label: t.tabQuestionGen,
      icon: HelpCircle,
      section: "AI COPROCESSOR"
    },
    {
      id: "guidance-gen" as TabType,
      label: t.tabGuidanceGen,
      icon: FileText,
      section: "AI COPROCESSOR"
    },
    {
      id: "gap-analysis" as TabType,
      label: t.tabGapAnalysis,
      icon: Activity,
      section: "CURRICULUM INTEL"
    },
    {
      id: "comparator" as TabType,
      label: t.tabComparator,
      icon: GitCompare,
      section: "CURRICULUM INTEL"
    },
    {
      id: "documents" as TabType,
      label: t.tabDocuments,
      icon: Database,
      section: "CURRICULUM INTEL",
      badge: uploadedCount
    }
  ];

  const sections = [
    { id: "FRAMEWORKS", label: t.sectionFrameworks },
    { id: "AI COPROCESSOR", label: t.sectionAiCoprocessor },
    { id: "CURRICULUM INTEL", label: t.sectionCurriculumIntel }
  ];

  return (
    <div className="w-68 bg-[#18181b] border-r border-[#27272a] h-full flex flex-col select-none text-gray-300">
      {/* Platform Title */}
      <div className="p-5 border-b border-[#27272a] flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-bold text-white shadow-sm shadow-amber-500/20">
          V
        </div>
        <div>
          <h1 className="text-xs font-semibold tracking-wide text-white leading-tight">
            {language === "vi" ? "Vinschool Science" : "Vinschool Science"}
          </h1>
          <p className="text-[9px] text-gray-400 tracking-wider uppercase font-mono mt-0.5">
            {language === "vi" ? "HỘI ĐỒNG KHẢO THÍ" : "Curriculum Review"}
          </p>
        </div>
      </div>

      {/* Navigation Scroll */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {sections.map((section) => (
          <div key={section.id} className="space-y-1">
            <h3 className="px-3 text-[10px] font-bold tracking-widest text-gray-500 uppercase font-mono mb-2">
              {section.label}
            </h3>
            <div className="space-y-0.5">
              {navItems
                .filter((item) => item.section === section.id)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`nav-${item.id}`}
                      onClick={() => setCurrentTab(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all duration-150 group ${
                        isActive
                          ? "bg-[#27272a] text-white font-semibold"
                          : "text-gray-400 hover:bg-[#202023] hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon 
                          className={`w-4 h-4 transition-colors ${
                            isActive ? "text-amber-500" : "text-gray-500 group-hover:text-gray-300"
                          }`} 
                        />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#27272a] text-gray-400 border border-[#3f3f46]">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Branding */}
      <div className="p-4 border-t border-[#27272a] bg-[#141416] flex items-center gap-2">
        <GraduationCap className="w-5 h-5 text-gray-500" />
        <div>
          <div className="text-[10px] text-gray-400">
            {language === "vi" ? "Hội đồng Học thuật" : "Academic Review Panel"}
          </div>
          <div className="text-[9px] font-mono text-gray-600">
            {language === "vi" ? "Đối chiếu chuẩn Cambridge" : "Cambridge Standard Matcher"}
          </div>
        </div>
      </div>
    </div>
  );
}
