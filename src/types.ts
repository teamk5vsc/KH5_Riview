export type GradeLevel = 1 | 2 | 3 | 4 | 5;

export interface CambridgeStandard {
  id: string; // e.g. 5Bi_01
  code: string; // e.g. 5Bi.01
  strand: "Biology" | "Chemistry" | "Physics" | "Earth & Space" | "Thinking & Working Scientifically" | "Science in Context";
  substrand: string; // e.g. Cells and Organisms, Properties of Materials
  stage: GradeLevel;
  description: string;
  bloomCognitiveLevel: "Remembering" | "Understanding" | "Applying" | "Analyzing" | "Evaluating" | "Creating";
}

export interface TWSElement {
  id: string;
  stage: "Planning" | "Obtaining & Presenting Evidence" | "Analysis, Evaluation & Conclusions";
  description: string;
  bloomCognitiveLevel: string;
}

export interface LessonPlan {
  id: string; // vsc_g5_u1_l1
  grade: GradeLevel;
  unitId: string; // e.g. U1
  unitTitle: string; // e.g. Life Processes and Cells
  lessonNumber: number;
  title: string;
  durationMinutes: number;
  learningObjectives: string[];
  mappedCambridgeStandards: string[]; // array of codes like '5Bi.01'
  twsElements: TWSElement[];
  activities: string[];
  thinkingQuestions: string[];
  teacherGuidance: string;
  updatedAt: string;
}

export interface UploadedDocument {
  id: string;
  name: string;
  type: "PDF" | "Excel" | "Word";
  uploadedAt: string;
  fileSize: number;
  extractedText: string;
  status: "parsing" | "ready" | "error";
  targetGrade?: GradeLevel;
}

export interface GapAnalysisReport {
  id: string;
  title: string;
  grade: GradeLevel;
  runDate: string;
  summary: string;
  identifiedGaps: {
    standardCode: string;
    standardDesc: string;
    gapType: "Missing Objective" | "Cognitive Mismatch" | "TWS Under-represented";
    severity: "High" | "Medium" | "Low";
    description: string;
    recommendation: string;
  }[];
  traceabilityNotes: string;
}

export interface AIReviewResult {
  lessonId: string;
  alignmentScore: number; // 0 to 100
  cognitiveDepthRating: string;
  twsIntegrationAudit: string;
  strengths: string[];
  gaps: string[];
  actionableImprovements: string[];
  referencedSources: string[];
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  contextLessonId?: string;
}
