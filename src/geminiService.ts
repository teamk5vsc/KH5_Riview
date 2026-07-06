import { LessonPlan, CambridgeStandard, UploadedDocument, GapAnalysisReport, AIReviewResult } from "./types";

// The ordered list of models for automatic fallback retry
export const FALLBACK_MODELS = [
  "gemini-3-flash-preview",
  "gemini-3-pro-preview",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-1.5-flash"
];

// Helper to map UI/future model names to currently active Google Developer API models
export function mapModelName(modelName: string): string {
  switch (modelName) {
    case "gemini-3-flash-preview":
      return "gemini-2.5-flash"; // Map to working fast model
    case "gemini-3-pro-preview":
      return "gemini-2.5-pro"; // Map to working pro model
    case "gemini-2.5-flash":
      return "gemini-2.5-flash";
    case "gemini-2.5-pro":
      return "gemini-2.5-pro";
    case "gemini-1.5-flash":
      return "gemini-1.5-flash";
    default:
      return "gemini-2.5-flash";
  }
}

// Search utility to look up relevant text across loaded documents
export function searchKnowledgeBase(query: string, documents: UploadedDocument[]): string {
  if (documents.length === 0) {
    return "No reference documents loaded in the knowledge base.";
  }
  
  // Combine all reference documents into a single curriculum context since Gemini has a huge context window
  let context = "";
  for (const doc of documents) {
    if (doc.status !== "ready") continue;
    context += `[DOCUMENT: ${doc.name}]\n${doc.extractedText}\n\n`;
  }
  return context;
}

interface RequestConfig {
  apiKey: string;
  selectedModel: string;
  language: "vi" | "en";
  onProgress?: (modelUsed: string, attempt: number, status: string) => void;
}

// Universal fetch post to Google Gemini API
async function callGeminiRaw(
  model: string,
  apiKey: string,
  systemInstruction: string,
  prompt: string,
  responseSchema?: any
): Promise<any> {
  const modelIdentifier = mapModelName(model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelIdentifier}:generateContent?key=${apiKey}`;

  const payload: any = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.2,
    }
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  if (responseSchema) {
    payload.generationConfig.responseMimeType = "application/json";
    payload.generationConfig.responseSchema = responseSchema;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    let errMsg = `HTTP Error ${response.status}`;
    try {
      const errJSON = JSON.parse(errText);
      errMsg = errJSON.error?.message || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Empty response received from Gemini API.");
  }
  return text;
}

// Executes a Gemini request with automatic fallback and retry
async function executeWithFallback(
  config: RequestConfig,
  systemInstruction: string,
  prompt: string,
  responseSchema?: any
): Promise<string> {
  const modelsToTry = [
    config.selectedModel,
    ...FALLBACK_MODELS.filter(m => m !== config.selectedModel)
  ];

  let lastError: Error | null = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const currentModel = modelsToTry[i];
    if (config.onProgress) {
      config.onProgress(currentModel, i + 1, "processing");
    }

    try {
      const result = await callGeminiRaw(currentModel, config.apiKey, systemInstruction, prompt, responseSchema);
      if (config.onProgress) {
        config.onProgress(currentModel, i + 1, "success");
      }
      return result;
    } catch (err: any) {
      console.warn(`Model ${currentModel} failed on attempt ${i + 1}: ${err.message}`);
      lastError = err;
      if (config.onProgress) {
        config.onProgress(currentModel, i + 1, `failed: ${err.message}`);
      }
    }
  }

  throw lastError || new Error("All fallback models failed.");
}

// 1. Analyze Lesson for Alignment & Opportunity Gaps
export async function analyzeLesson(
  lesson: LessonPlan,
  documents: UploadedDocument[],
  selectedGaps: {
    prediction: boolean;
    evidence: boolean;
    modeling: boolean;
    dataEvaluation: boolean;
  },
  config: RequestConfig
): Promise<AIReviewResult> {
  const docContext = searchKnowledgeBase(lesson.title + " " + lesson.unitTitle, documents);
  const langLabel = config.language === "vi" ? "Vietnamese" : "English";

  const systemInstruction = `
    You are an expert Cambridge Primary Science curriculum specialist and educational auditor.
    Your task is to analyze the Vinschool Science Lesson Plan for alignment with Cambridge and TWS standards.
    You must output your findings in ${langLabel} language.
  `;

  // Construct details on what gaps the user wants us to audit
  const checkedGaps = [];
  if (selectedGaps.prediction) checkedGaps.push("- Opportunities for Prediction (dự đoán)");
  if (selectedGaps.evidence) checkedGaps.push("- Opportunities for Verifying Evidence (kiểm chứng bằng chứng)");
  if (selectedGaps.modeling) checkedGaps.push("- Opportunities for Modeling (mô hình hóa)");
  if (selectedGaps.dataEvaluation) checkedGaps.push("- Opportunities for Data Evaluation (đánh giá dữ liệu)");

  const prompt = `
    Perform a complete curriculum review on the following lesson plan:
    
    Lesson Title: ${lesson.title}
    Unit: ${lesson.unitTitle}
    Grade Level: Stage ${lesson.grade}
    Learning Objectives: ${JSON.stringify(lesson.learningObjectives)}
    Mapped Cambridge Standards: ${JSON.stringify(lesson.mappedCambridgeStandards)}
    TWS Elements: ${JSON.stringify(lesson.twsElements)}
    Activities: ${JSON.stringify(lesson.activities)}

    Knowledge Base Source Context:
    ${docContext}

    Special Auditing Instructions:
    Evaluate if there are opportunity gaps in the lesson design. Specifically check for:
    ${checkedGaps.join("\n")}
    Report any omissions under the "gaps" array and suggest improvements under "actionableImprovements".
    Ensure the alignmentScore reflects the integration of TWS objectives and overall objectives matching standard guidelines.

    Provide your review output in JSON format with the following schema:
    {
      "lessonId": "${lesson.id}",
      "alignmentScore": <number from 0 to 100 representing how well mapped objectives match Cambridge standards>,
      "cognitiveDepthRating": "<depth assessment like: Remembering/Understanding or Analyzing/Creating>",
      "twsIntegrationAudit": "<detailed analysis of how effectively Thinking & Working Scientifically is mapped>",
      "strengths": ["list of structural strengths of this lesson plan in ${langLabel}"],
      "gaps": ["list of identified curriculum gaps, cognitive omissions, or unmapped requirements in ${langLabel}"],
      "actionableImprovements": ["specific, concrete improvements teachers can implement in ${langLabel}"],
      "referencedSources": ["list of referenced sources from the provided knowledge base context"]
    }

    Respond ONLY with the JSON document. Keep all texts in ${langLabel}.
  `;

  const schema = {
    type: "OBJECT",
    properties: {
      lessonId: { type: "STRING" },
      alignmentScore: { type: "INTEGER" },
      cognitiveDepthRating: { type: "STRING" },
      twsIntegrationAudit: { type: "STRING" },
      strengths: { type: "ARRAY", items: { type: "STRING" } },
      gaps: { type: "ARRAY", items: { type: "STRING" } },
      actionableImprovements: { type: "ARRAY", items: { type: "STRING" } },
      referencedSources: { type: "ARRAY", items: { type: "STRING" } }
    },
    required: ["lessonId", "alignmentScore", "cognitiveDepthRating", "twsIntegrationAudit", "strengths", "gaps", "actionableImprovements", "referencedSources"]
  };

  const responseText = await executeWithFallback(config, systemInstruction, prompt, schema);
  return JSON.parse(responseText);
}

// 2. Generate "How Do We Know?" Higher-Order Thinking Questions
export async function generateQuestions(
  lesson: LessonPlan,
  documents: UploadedDocument[],
  config: RequestConfig
): Promise<any> {
  const docContext = searchKnowledgeBase(lesson.title + " " + lesson.unitTitle, documents);
  const langLabel = config.language === "vi" ? "Vietnamese" : "English";

  const systemInstruction = `
    You are an expert internal Vinschool Science Curriculum Designer.
    You create inquiry-oriented higher-order thinking questions (Bloom's Taxonomy: Analyzing, Evaluating, or Creating levels) following the "How do we know?" (Làm sao chúng ta biết chắc chắn) philosophy.
    
    You MUST strictly adhere to these Vinschool Thinking Question guidelines:
    1. Tạo mâu thuẫn nhận thức (Cognitive Dissonance): Create situations where students realize there is uncertainty, conflict, or a puzzle that forces their brains to think.
    2. Dịch chuyển trọng tâm (Methodological Shift): Move away from asking "What" (Cái gì) or recall questions with predefined answers (e.g. AVOID questions like "What conditions do seeds need to germinate?" or "Do plants need light to make organic matter?"). Instead, ask "How do we know it is true?" (Làm sao chúng ta biết chắc chắn).
    3. Kích hoạt năng lực TWS: Open-ended questions that force students to design procedures, control variables, predict, measure, evaluate data, or verify models using evidence.
    4. Độ dài: Keep the question prompt concise and punchy (under 100 Vietnamese words / 80 English words).
    
    Respond in ${langLabel} language.
  `;

  const prompt = `
    Generate exactly three (3) high-quality thinking questions for this Vinschool lesson:
    
    Lesson Title: ${lesson.title}
    Objectives: ${JSON.stringify(lesson.learningObjectives)}
    Mapped Standards: ${JSON.stringify(lesson.mappedCambridgeStandards)}
    
    Reference Grounding Context:
    ${docContext}

    Ensure each question meets the Vinschool criteria above.
    
    Provide your output as a JSON object matching the following schema:
    {
      "questions": [
        {
          "level": "Analyzing" | "Evaluating" | "Creating",
          "question": "The actual inquiry question prompt in ${langLabel} (strictly under 100 words, starting with a cognitive dissonance or how-do-we-know setup)",
          "pedagogicalIntent": "What cognitive mechanism, TWS skill, or scientific concept this checks in ${langLabel}",
          "expectedAnswerGuide": "What a model student answer / evidence-grounded response should include in font of scientific reasoning in ${langLabel}",
          "sourceReference": "Specific Cambridge standard code (e.g. 5Bi.01) this connects to"
        }
      ]
    }
    
    Respond ONLY with the JSON document. Keep all texts in ${langLabel}.
  `;

  const schema = {
    type: "OBJECT",
    properties: {
      questions: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            level: { type: "STRING" },
            question: { type: "STRING" },
            pedagogicalIntent: { type: "STRING" },
            expectedAnswerGuide: { type: "STRING" },
            sourceReference: { type: "STRING" }
          },
          required: ["level", "question", "pedagogicalIntent", "expectedAnswerGuide", "sourceReference"]
        }
      }
    },
    required: ["questions"]
  };

  const responseText = await executeWithFallback(config, systemInstruction, prompt, schema);
  return JSON.parse(responseText);
}

// 3. Generate Teacher Guidance
export async function generateGuidance(
  lesson: LessonPlan,
  documents: UploadedDocument[],
  config: RequestConfig
): Promise<any> {
  const docContext = searchKnowledgeBase(lesson.title + " " + lesson.unitTitle, documents);
  const langLabel = config.language === "vi" ? "Vietnamese" : "English";

  const systemInstruction = `
    You are an expert Vinschool Science Mentor and Curriculum Specialist.
    You generate detailed, lesson-specific teacher guidance, pedagogical warnings, and active inquiry-based instructions.
    
    You MUST strictly adhere to these Vinschool Teacher Guidance guidelines:
    1. Định hướng concept sư phạm: 'Đào tạo ngầm' (indirect training) for teachers on correct inquiry approaches. Avoid mechanical procedures (e.g. AVOID writing: 'Teacher divides class, conducts experiment, records data...'). Instead, explain HOW student scientific thinking is revealed, giving concepts, logical reasoning, and arguments.
    2. Xử lý số liệu bất thường & lỗi thực nghiệm (Anomalies & Errors): Specify scenarios when students encounter anomalies, experimental errors, or unexpected results. E.g. 'If a seed germinates without water due to mold, guide teachers to ask: Does this reject or extend our initial hypothesis? What hidden variable did we fail to control?' instead of repeating the experiment.
    3. Hoài nghi khoa học lành mạnh (Healthy Skepticism): Focus on questions that challenge the reliability of measuring tools, source of errors, or adjust model explanations based on new evidence.
    4. Trọng tâm và Độ dài: Under 400 words. Do not write a full detailed lesson plan. Select the core scientific touchpoints. Focus on handling unexpected situations and scientific skepticism over safe, step-by-step procedures.
    
    All outputs must be written in ${langLabel} language.
  `;

  const prompt = `
    Create structured, professional teacher guidance for this lesson:
    
    Lesson Title: ${lesson.title}
    Objectives: ${JSON.stringify(lesson.learningObjectives)}
    Activities: ${JSON.stringify(lesson.activities)}

    Knowledge Base Context:
    ${docContext}

    Ensure your output contains warnings for misconceptions, lab guidelines handling anomalies, and conceptual touchpoints.

    Provide your output in JSON matching the following schema:
    {
      "pedagogicalFramework": "Detailed strategy for guiding student inquiry, concept-based reasoning, and touchpoints in ${langLabel} (under 150 words)",
      "misconceptionAlerts": [
        {
          "misconception": "The wrong student belief in ${langLabel}",
          "scientificCorrection": "The proper scientific correction in ${langLabel}",
          "interventionStrategy": "A rapid class activity, cognitive conflict check, or visual challenge to address it in ${langLabel}"
        }
      ],
      "practicalLabGuidelines": "Clear, hands-on lab guidelines detailing safety, handling anomalies, and questions for experimental errors in ${langLabel} (under 150 words)",
      "differentiationTips": "Concrete instructions for supporting lower-ability and extending high-ability researchers using evidence and modeling in ${langLabel}",
      "curriculumTraceability": "Specific references from uploaded texts"
    }

    Respond ONLY with the JSON document. Keep all texts in ${langLabel}.
  `;

  const schema = {
    type: "OBJECT",
    properties: {
      pedagogicalFramework: { type: "STRING" },
      misconceptionAlerts: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            misconception: { type: "STRING" },
            scientificCorrection: { type: "STRING" },
            interventionStrategy: { type: "STRING" }
          },
          required: ["misconception", "scientificCorrection", "interventionStrategy"]
        }
      },
      practicalLabGuidelines: { type: "STRING" },
      differentiationTips: { type: "STRING" },
      curriculumTraceability: { type: "STRING" }
    },
    required: ["pedagogicalFramework", "misconceptionAlerts", "practicalLabGuidelines", "differentiationTips", "curriculumTraceability"]
  };

  const responseText = await executeWithFallback(config, systemInstruction, prompt, schema);
  return JSON.parse(responseText);
}

// 4. Perform Grade-Level Gap Analysis
export async function performGapAnalysis(
  grade: number,
  lessons: LessonPlan[],
  standards: CambridgeStandard[],
  documents: UploadedDocument[],
  config: RequestConfig
): Promise<GapAnalysisReport> {
  const docContext = searchKnowledgeBase(`Grade ${grade} Science Curriculum Framework Standards Gaps`, documents);
  const langLabel = config.language === "vi" ? "Vietnamese" : "English";

  const systemInstruction = `
    You are an expert Cambridge and Vinschool Science Curriculum Architect.
    Perform a rigorous, deep gap analysis between active Vinschool lessons and official Cambridge standards.
    Your output must be in ${langLabel} language.
  `;

  const prompt = `
    Perform a complete gap report for Stage ${grade}:
    
    Active Lessons: ${JSON.stringify(lessons)}
    Cambridge Standards: ${JSON.stringify(standards)}

    Grounding Source Context:
    ${docContext}

    Analyze:
    1. Unmapped standards (objectives not addressed by any lesson).
    2. Cognitive depth mismatches (e.g. standard requires "Applying" or "Analyzing" but lessons only do lecture-based "Remembering").
    3. TWS omissions (lack of fair tests, data plotting, drawing, etc.).

    Provide your gap audit in JSON matching the following schema:
    {
      "id": "gap_audit_g${grade}",
      "title": "Grade ${grade} Vinschool-Cambridge Gap Analysis Report",
      "grade": ${grade},
      "runDate": "${new Date().toISOString()}",
      "summary": "Overall summary of framework alignment, coverage percentage, and general recommendations in ${langLabel}",
      "identifiedGaps": [
        {
          "standardCode": "Code of the standard with a gap (e.g. 5Bi.02)",
          "standardDesc": "Description of the standard",
          "gapType": "Missing Objective" | "Cognitive Mismatch" | "TWS Under-represented",
          "severity": "High" | "Medium" | "Low",
          "description": "Clear explanation of how the Vinschool lessons fail to meet this standard in ${langLabel}",
          "recommendation": "Step-by-step revision recommendation for curriculum writers in ${langLabel}"
        }
      ],
      "traceabilityNotes": "Cite specific chapters or documents analyzed in ${langLabel}"
    }

    Respond ONLY with the JSON document. Keep all texts in ${langLabel}.
  `;

  const schema = {
    type: "OBJECT",
    properties: {
      id: { type: "STRING" },
      title: { type: "STRING" },
      grade: { type: "INTEGER" },
      runDate: { type: "STRING" },
      summary: { type: "STRING" },
      identifiedGaps: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            standardCode: { type: "STRING" },
            standardDesc: { type: "STRING" },
            gapType: { type: "STRING" },
            severity: { type: "STRING" },
            description: { type: "STRING" },
            recommendation: { type: "STRING" }
          },
          required: ["standardCode", "standardDesc", "gapType", "severity", "description", "recommendation"]
        }
      },
      traceabilityNotes: { type: "STRING" }
    },
    required: ["id", "title", "grade", "runDate", "summary", "identifiedGaps", "traceabilityNotes"]
  };

  const responseText = await executeWithFallback(config, systemInstruction, prompt, schema);
  return JSON.parse(responseText);
}

// 5. Compare Lessons Side-by-Side and Generate Comparison Review
export async function compareLessonsAI(
  lessonA: LessonPlan,
  lessonB: LessonPlan,
  documents: UploadedDocument[],
  config: RequestConfig
): Promise<any> {
  const docContext = searchKnowledgeBase(lessonA.title + " vs " + lessonB.title, documents);
  const langLabel = config.language === "vi" ? "Vietnamese" : "English";

  const systemInstruction = `
    You are an expert Cambridge Primary Science curriculum auditor.
    Compare two Vinschool lesson plans side-by-side. Focus on differences in cognitive level, TWS integration, and lesson flow.
    Your output must be in ${langLabel} language.
  `;

  const prompt = `
    Perform a side-by-side comparative analysis of:
    
    Lesson A:
    - Title: ${lessonA.title}
    - Objectives: ${JSON.stringify(lessonA.learningObjectives)}
    - Standards: ${JSON.stringify(lessonA.mappedCambridgeStandards)}
    - Activities: ${JSON.stringify(lessonA.activities)}

    Lesson B:
    - Title: ${lessonB.title}
    - Objectives: ${JSON.stringify(lessonB.learningObjectives)}
    - Standards: ${JSON.stringify(lessonB.mappedCambridgeStandards)}
    - Activities: ${JSON.stringify(lessonB.activities)}

    Knowledge Base Context:
    ${docContext}

    Provide your output in JSON format with the following schema:
    {
      "comparisonSummary": "Overview of differences and curriculum value of each lesson in ${langLabel}",
      "cognitiveDepthAnalysis": "Compare the Bloom's depth of Lesson A vs Lesson B in ${langLabel}",
      "twsIntegrationComparison": "Detailed evaluation of how scientific working methods differ in ${langLabel}",
      "recommendedRevisions": "Suggestions on how to align or adjust these lessons for maximum framework synergy in ${langLabel}"
    }

    Respond ONLY with the JSON document. Keep all texts in ${langLabel}.
  `;

  const schema = {
    type: "OBJECT",
    properties: {
      comparisonSummary: { type: "STRING" },
      cognitiveDepthAnalysis: { type: "STRING" },
      twsIntegrationComparison: { type: "STRING" },
      recommendedRevisions: { type: "STRING" }
    },
    required: ["comparisonSummary", "cognitiveDepthAnalysis", "twsIntegrationComparison", "recommendedRevisions"]
  };

  const responseText = await executeWithFallback(config, systemInstruction, prompt, schema);
  return JSON.parse(responseText);
}

// 6. In-context Chat Assistant
export async function chatSpecialistAI(
  messages: any[],
  activeLesson: LessonPlan | null,
  activeStandard: CambridgeStandard | null,
  documents: UploadedDocument[],
  config: RequestConfig
): Promise<string> {
  const latestMessage = messages[messages.length - 1]?.text || "";
  const docContext = searchKnowledgeBase(latestMessage + (activeLesson ? " " + activeLesson.title : ""), documents);
  const langLabel = config.language === "vi" ? "Vietnamese" : "English";

  const systemInstruction = `
    You are an elite, highly professional Cambridge Primary Science Curriculum Advisor working internally for Vinschool.
    You assist curriculum developers, teachers, and coordinators in reviewing, auditing, and restructuring lessons to meet international standards.
    Your voice is analytical, precise, and authoritative. Respond strictly in ${langLabel} language.
    Always cite specific Cambridge objective codes (e.g. [5Bi.01], [5Tw.01]) and ground answers in standard frameworks.
    
    Active Lesson context: ${activeLesson ? `"${activeLesson.title}" (Stage ${activeLesson.grade})` : "None"}
    Active Standard context: ${activeStandard ? `[${activeStandard.code}] - ${activeStandard.description}` : "None"}
  `;

  const chatContents = messages.map(m => ({
    role: m.sender === "user" ? "user" : "model",
    parts: [{ text: m.text }]
  }));

  chatContents.unshift({
    role: "user",
    parts: [{ text: `Knowledge base context to ground your knowledge:\n${docContext}` }]
  });

  return await executeWithFallback(config, systemInstruction, latestMessage);
}

// 7. Auto-extract raw curriculum text to a structured Vinschool LessonPlan
export async function importLessonFromText(
  rawText: string,
  grade: number,
  config: RequestConfig
): Promise<LessonPlan> {
  const langLabel = config.language === "vi" ? "Vietnamese" : "English";
  const systemInstruction = `
    You are a curriculum builder assistant. Your job is to extract, translate, and structure the raw text of a Vinschool Science lesson plan into a clean JSON format matching the schema.
    Ensure that:
    1. You generate both English (standard) and Vietnamese (Vi) properties.
    2. The lesson plan is for Grade ${grade}.
    3. The mapped Cambridge standards are listed as codes (e.g., '5Bi.01') that are mentioned or related.
    4. TWS elements are structured with valid TWS stages: 'Planning', 'Obtaining & Presenting Evidence', or 'Analysis, Evaluation & Conclusions'.
    5. Respond ONLY with the JSON matching the schema. Translate all texts accurately to Vietnamese for all "Vi" fields.
  `;

  const prompt = `
    Here is the raw Vinschool Science lesson plan content:
    ---
    ${rawText}
    ---
  `;

  const schema = {
    type: "OBJECT",
    properties: {
      unitId: { type: "STRING" },
      unitTitle: { type: "STRING" },
      unitTitleVi: { type: "STRING" },
      lessonNumber: { type: "INTEGER" },
      title: { type: "STRING" },
      titleVi: { type: "STRING" },
      durationMinutes: { type: "INTEGER" },
      learningObjectives: {
        type: "ARRAY",
        items: { type: "STRING" }
      },
      learningObjectivesVi: {
        type: "ARRAY",
        items: { type: "STRING" }
      },
      mappedCambridgeStandards: {
        type: "ARRAY",
        items: { type: "STRING" }
      },
      twsElements: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            id: { type: "STRING" },
            stage: { type: "STRING" },
            stageVi: { type: "STRING" },
            description: { type: "STRING" },
            descriptionVi: { type: "STRING" },
            bloomCognitiveLevel: { type: "STRING" }
          },
          required: ["id", "stage", "description", "bloomCognitiveLevel"]
        }
      },
      activities: {
        type: "ARRAY",
        items: { type: "STRING" }
      },
      activitiesVi: {
        type: "ARRAY",
        items: { type: "STRING" }
      },
      thinkingQuestions: {
        type: "ARRAY",
        items: { type: "STRING" }
      },
      thinkingQuestionsVi: {
        type: "ARRAY",
        items: { type: "STRING" }
      },
      teacherGuidance: { type: "STRING" },
      teacherGuidanceVi: { type: "STRING" }
    },
    required: [
      "title",
      "titleVi",
      "unitId",
      "unitTitle",
      "unitTitleVi",
      "lessonNumber",
      "durationMinutes",
      "learningObjectives",
      "learningObjectivesVi",
      "mappedCambridgeStandards",
      "twsElements",
      "activities",
      "activitiesVi",
      "thinkingQuestions",
      "thinkingQuestionsVi",
      "teacherGuidance",
      "teacherGuidanceVi"
    ]
  };

  const responseText = await executeWithFallback(config, systemInstruction, prompt, schema);
  const parsed = JSON.parse(responseText);

  return {
    ...parsed,
    id: `vsc_g${grade}_u${parsed.unitId.replace(/[^a-zA-Z0-9]/g, "")}_l${parsed.lessonNumber}_${Date.now()}`,
    grade: grade as any,
    updatedAt: new Date().toISOString()
  };
}

// 8. Audit and Optimize Curriculum Framework using AI
export async function auditCurriculumFramework(
  topics: any[],
  totalPeriodsBudget: number,
  standards: CambridgeStandard[],
  documents: UploadedDocument[],
  config: RequestConfig
): Promise<any> {
  const docContext = searchKnowledgeBase("Vinschool Science Curriculum Framework Guidance", documents);
  const langLabel = config.language === "vi" ? "Vietnamese" : "English";

  const systemInstruction = `
    You are an expert internal Vinschool Science Curriculum Architect.
    You audit the macro-level Curriculum Framework designed by the user.
    The total annual teaching periods budget is ${totalPeriodsBudget} periods.
    
    Adhere strictly to:
    1. Vinschool Science principles: Emphasis on Thinking and Working Scientifically (TWS).
    2. Check the balance between allocated periods and the density/complexity of mapped standards.
    3. Check for standards coverage: Identify which grade-level standards are unmapped (not taught).
    4. Advise on TWS integration touchpoints and period adjustments.
    
    Respond in ${langLabel} language in valid JSON format.
  `;

  const prompt = `
    Analyze this Curriculum Framework Draft:
    Total Period Budget: ${totalPeriodsBudget} periods
    
    User-defined Topics:
    ${JSON.stringify(topics.map(t => ({
      name: t.name,
      allocatedPeriods: t.allocatedPeriods,
      mappedStandardCodes: t.mappedStandardCodes,
      twsFocus: t.twsFocus
    })))}
    
    All Cambridge Standards for this Grade Level:
    ${JSON.stringify(standards.map(s => ({ code: s.code, description: s.description })))}

    Knowledge Base Context:
    ${docContext}
  `;

  const schema = {
    type: "OBJECT",
    properties: {
      periodBalanceAudit: { type: "STRING" },
      coverageAudit: { type: "STRING" },
      twsMappingAdvice: { type: "STRING" },
      suggestedAdjustments: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            topicName: { type: "STRING" },
            action: { type: "STRING" },
            details: { type: "STRING" }
          },
          required: ["topicName", "action", "details"]
        }
      }
    },
    required: ["periodBalanceAudit", "coverageAudit", "twsMappingAdvice", "suggestedAdjustments"]
  };

  const responseText = await executeWithFallback(config, systemInstruction, prompt, schema);
  return JSON.parse(responseText);
}

// 9. Generate Student Remediation & Intervention Plan based on Diagnostic Report
export async function generateRemediationPlan(
  diagnosticReport: string,
  lessons: LessonPlan[],
  standards: CambridgeStandard[],
  documents: UploadedDocument[],
  config: RequestConfig
): Promise<any> {
  const docContext = searchKnowledgeBase(diagnosticReport, documents);
  const langLabel = config.language === "vi" ? "Vietnamese" : "English";

  const systemInstruction = `
    You are an expert internal Vinschool Science Pedagogical Diagnostician and Curriculum Advisor.
    You analyze student diagnostic test reports, assessment feedback, or academic gap summaries.
    
    Your task is to:
    1. Identify which Cambridge Primary Science or TWS standards student are weak at from the diagnostic input.
    2. Map these weak standard codes directly to corresponding Vinschool active lessons from the provided list.
    3. Generate custom Vinschool-aligned "How do we know?" (Làm sao chúng ta biết chắc chắn) thinking questions (Bloom higher-order, under 100 words, cognitive dissonance) specifically designed to target and fix this weak standard in those lessons.
    4. Draft Teacher Pedagogical Exploitation Guidance (under 450 words, handling experimental errors/anomalies, healthy skepticism) instructing teachers exactly how to deploy these questions to remediate the weak points in class.
    
    Respond in ${langLabel} language in valid JSON format.
  `;

  const prompt = `
    Student Diagnostic Feedback/Report:
    "${diagnosticReport}"
    
    Active Vinschool Lessons:
    ${JSON.stringify(lessons.map(l => ({ 
      id: l.id, 
      title: config.language === "vi" ? l.titleVi || l.title : l.title, 
      mappedCambridgeStandards: l.mappedCambridgeStandards 
    })))}
    
    Cambridge Grade Standards Reference:
    ${JSON.stringify(standards.map(s => ({ code: s.code, description: s.description })))}

    Knowledge Base Guidance Context:
    ${docContext}
  `;

  const schema = {
    type: "OBJECT",
    properties: {
      identifiedWeaknesses: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            standardCode: { type: "STRING" },
            standardDesc: { type: "STRING" },
            reason: { type: "STRING" },
            targetLessons: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            remediationQuestion: { type: "STRING" },
            expectedAnswerGuide: { type: "STRING" },
            teacherExploitationGuide: { type: "STRING" }
          },
          required: [
            "standardCode", 
            "standardDesc", 
            "reason", 
            "targetLessons", 
            "remediationQuestion", 
            "expectedAnswerGuide", 
            "teacherExploitationGuide"
          ]
        }
      },
      overallInterventionStrategy: { type: "STRING" }
    },
    required: ["identifiedWeaknesses", "overallInterventionStrategy"]
  };

  const responseText = await executeWithFallback(config, systemInstruction, prompt, schema);
  return JSON.parse(responseText);
}

// 10. NotebookLM Grounded Q&A Chat
export async function chatNotebookLM(
  messages: ChatMessage[],
  selectedDocuments: UploadedDocument[],
  promptText: string,
  config: RequestConfig
): Promise<string> {
  const langLabel = config.language === "vi" ? "Vietnamese" : "English";

  // Build the source context
  let sourceContext = "";
  for (const doc of selectedDocuments) {
    if (doc.status !== "ready") continue;
    sourceContext += `[DOCUMENT: ${doc.name}]\n${doc.extractedText}\n\n`;
  }

  const systemInstruction = `
    You are an advanced NotebookLM-style Research and Curriculum Specialist Assistant.
    Your primary goal is to help teachers and curriculum designers analyze and query the uploaded reference documents.
    
    CRITICAL RULES:
    1. Answer the user's question using ONLY the facts and data present in the provided source documents.
    2. If the answer cannot be found in the documents, state politely that the provided source documents do not contain this information. Do not make up facts.
    3. You MUST provide inline citations in your text referencing the document name in brackets, e.g., "[DOCUMENT: filename.pdf]" or "[filename.pdf]", whenever you reference a fact or guideline from that document.
    4. Respond in ${langLabel} language in a clear, professional, and well-structured markdown format.
  `;

  // Format message history
  const chatHistory = messages.map(m => `${m.sender.toUpperCase()}: ${m.text}`).join("\n");

  const prompt = `
    Source Documents Context:
    ${sourceContext || "No documents selected. Please advise the user to select at least one source."}

    Chat History:
    ${chatHistory}

    USER: ${promptText}
    ASSISTANT:
  `;

  return callGeminiRaw(
    config.selectedModel || "gemini-3-flash-preview",
    config.apiKey,
    systemInstruction,
    prompt
  );
}

// 11. NotebookLM Synthesized Notes/Study Guide Generator
export async function generateNotebookNotes(
  selectedDocuments: UploadedDocument[],
  synthesisType: "summary" | "faq" | "study-guide",
  config: RequestConfig
): Promise<string> {
  const langLabel = config.language === "vi" ? "Vietnamese" : "English";

  let sourceContext = "";
  for (const doc of selectedDocuments) {
    if (doc.status !== "ready") continue;
    sourceContext += `[DOCUMENT: ${doc.name}]\n${doc.extractedText}\n\n`;
  }

  let taskDescription = "";
  if (synthesisType === "summary") {
    taskDescription = "Generate a comprehensive, structural synthesis of all key concepts, standards, and guidelines found in the selected documents. Group them by topic.";
  } else if (synthesisType === "faq") {
    taskDescription = "Create a detailed FAQ (at least 5-8 questions & answers) addressing the most important teacher pain points, curriculum standards, and pedagogical guidelines mentioned in the documents. Cite sources in answers.";
  } else {
    taskDescription = "Design a structured Pedagogical Study & Lesson Design Guide based on the documents. Focus on identifying potential student misconceptions, active TWS inquiry lab ideas, and page-specific instructions.";
  }

  const systemInstruction = `
    You are an expert curriculum editor. You synthesize complex documents into clean, action-oriented teacher materials.
    You MUST rely ONLY on the provided source documents. Provide citations referencing document names in brackets, e.g., "[filename.pdf]".
    Write in ${langLabel} language in high-quality markdown format.
  `;

  const prompt = `
    Source Documents:
    ${sourceContext}

    Your Task:
    ${taskDescription}

    Format your output beautifully in markdown, using headings, tables, bullet points, and highlight warnings/important notes.
  `;

  return callGeminiRaw(
    config.selectedModel || "gemini-3-flash-preview",
    config.apiKey,
    systemInstruction,
    prompt
  );
}

// 12. Generate Lesson Plan based on sample document, objectives and custom prompts
export async function generateCustomLessonPlan(
  objectives: string,
  sampleLessonPlanText: string,
  customPrompt: string,
  config: RequestConfig
): Promise<string> {
  const langLabel = config.language === "vi" ? "Vietnamese" : "English";

  const systemInstruction = `
    You are an elite Vinschool Science Lesson Designer. Your goal is to draft a comprehensive, high-quality, professional lesson plan in Word document format (outputted as markdown).
    
    IMPORTANT RULES:
    1. Base the formatting, structure, and depth on the provided Sample Lesson Plan.
    2. Incorporate the specified Learning Objectives.
    3. Strictly follow the user's Custom Prompts and requests (e.g., duration, specific TWS labs, activities).
    4. Write in ${langLabel} language in structured, publication-grade markdown format.
  `;

  const prompt = `
    Learning Objectives:
    ${objectives}

    Sample Lesson Plan Structure Reference:
    ${sampleLessonPlanText || "No sample provided. Use standard high-quality Vinschool lesson plan formatting (Unit, Objectives, TWS elements, Activity sequence, Plenary)."}

    Custom Requests / Pedagogical Prompt:
    ${customPrompt}

    Please write the complete lesson plan now. Include clear headers, time allocation (e.g. 5m Hook, 15m Direct Instruction, 20m Lab), TWS mapping, and expected answers.
  `;

  return callGeminiRaw(
    config.selectedModel || "gemini-3-flash-preview",
    config.apiKey,
    systemInstruction,
    prompt
  );
}

// 13. Convert Lesson Plan text into Structured Presentation Slides (JSON)
export async function generateSlidesFromLesson(
  lessonPlanText: string,
  config: RequestConfig
): Promise<{ slides: { title: string; subtitle?: string; slideNumber: number; contentPoints: string[]; visualCues?: string; twsFocus?: string }[] }> {
  const langLabel = config.language === "vi" ? "Vietnamese" : "English";

  const systemInstruction = `
    You are an expert presentation designer. Your task is to transform a detailed lesson plan text into a structured, highly engaging slide deck.
    Analyze the lesson plan, extract key milestones (Hook, Lesson Objectives, Core Concepts, Activity steps, TWS Lab instructions, Assessment, Plenary), and map them to slides.
    
    Strictly output in JSON schema format matching the requested structure. Keep bullet points concise and slide-friendly. Write in ${langLabel} language.
  `;

  const prompt = `
    Lesson Plan Text to convert:
    ${lessonPlanText}

    Please generate a structured slide deck (ideally 5 to 8 slides) summarizing the lesson plan. For each slide, write a title, optional subtitle, list of concise content bullets, and optional visual cues (suggestions for graphics) or TWS scientific skills highlighted on that slide.
  `;

  const schema = {
    type: "OBJECT",
    properties: {
      slides: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            subtitle: { type: "STRING" },
            slideNumber: { type: "INTEGER" },
            contentPoints: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            visualCues: { type: "STRING" },
            twsFocus: { type: "STRING" }
          },
          required: ["title", "slideNumber", "contentPoints"]
        }
      }
    },
    required: ["slides"]
  };

  const responseText = await executeWithFallback(config, systemInstruction, prompt, schema);
  return JSON.parse(responseText);
}

// 14. Extract active lessons and standards list from uploaded document
export async function extractCurriculumFromDocument(
  documentText: string,
  targetGrade: number,
  config: RequestConfig
): Promise<{ standards: any[]; lessons: any[] }> {
  const langLabel = config.language === "vi" ? "Vietnamese" : "English";

  const systemInstruction = `
    You are an expert AI curriculum extraction service. 
    Your task is to analyze the provided curriculum document, textbook content, or syllabus text for Grade ${targetGrade} (Stage ${targetGrade}), and extract the structured list of Vinschool Lessons and Cambridge Standards.
    
    RULES:
    1. Extract official or implied Cambridge Standards. For each standard, provide code, strand (e.g., Biology, Chemistry, Physics, Thinking & Working Scientifically), substrand, description, and bloom level.
    2. Extract Vinschool Lessons. For each lesson, provide unitId, unitTitle, lessonNumber, title, durationMinutes, learningObjectives, mappedCambridgeStandards (must refer to codes in the standards list), sample activities, thinking questions, and teacher guidance.
    3. Make sure to generate detailed, realistic content in ${langLabel} matching the document context.
    4. Return ONLY a valid JSON output matching the requested schema.
  `;

  const prompt = `
    Document Text (Stage ${targetGrade}):
    ${documentText.substring(0, 100000)} // limit size to prevent context overflow but cover a large chunk

    Please extract all lessons and standards found in this text. If it is a full textbook, extract a representative sample of at least 3-5 main lessons and corresponding standards mentioned in the chapters.
  `;

  const schema = {
    type: "OBJECT",
    properties: {
      standards: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            code: { type: "STRING" },
            strand: { type: "STRING" },
            substrand: { type: "STRING" },
            description: { type: "STRING" },
            descriptionVi: { type: "STRING" },
            bloomCognitiveLevel: { type: "STRING" }
          },
          required: ["code", "strand", "description"]
        }
      },
      lessons: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            unitId: { type: "STRING" },
            unitTitle: { type: "STRING" },
            unitTitleVi: { type: "STRING" },
            lessonNumber: { type: "INTEGER" },
            title: { type: "STRING" },
            titleVi: { type: "STRING" },
            durationMinutes: { type: "INTEGER" },
            learningObjectives: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            learningObjectivesVi: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            mappedCambridgeStandards: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            activities: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            activitiesVi: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            thinkingQuestions: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            thinkingQuestionsVi: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            teacherGuidance: { type: "STRING" },
            teacherGuidanceVi: { type: "STRING" }
          },
          required: ["unitId", "unitTitle", "lessonNumber", "title", "learningObjectives", "mappedCambridgeStandards"]
        }
      }
    },
    required: ["standards", "lessons"]
  };

  const responseText = await executeWithFallback(config, systemInstruction, prompt, schema);
  return JSON.parse(responseText);
}
