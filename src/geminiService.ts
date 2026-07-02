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
  const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  let context = "";
  for (const doc of documents) {
    if (doc.status !== "ready") continue;
    let score = 0;
    for (const kw of keywords) {
      if (doc.extractedText.toLowerCase().includes(kw)) {
        score++;
      }
    }
    if (score > 0) {
      context += `[Source: ${doc.name}]\n${doc.extractedText.slice(0, 1200)}...\n\n`;
    }
  }
  return context || "No highly specific matching source text found in the research repository. Relying on default Cambridge Primary Science and Thinking and Working Scientifically (TWS) frameworks.";
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
    You are an expert science curriculum designer. 
    You create inquiry-oriented higher-order thinking questions (Bloom's Taxonomy: Analyzing, Evaluating, or Creating levels) following the "How do we know?" philosophy rather than simple fact-recall questions.
    Your output must be in ${langLabel} language.
  `;

  const prompt = `
    Generate exactly three (3) high-quality questions for this lesson:
    
    Lesson Title: ${lesson.title}
    Objectives: ${JSON.stringify(lesson.learningObjectives)}
    Mapped Standards: ${JSON.stringify(lesson.mappedCambridgeStandards)}
    
    Reference Grounding Context:
    ${docContext}

    Guideline:
    Each question must align with the "How do we know?" (Làm sao chúng ta biết?) philosophy. For example, instead of asking "What are the parts of a cell?", ask "How do we know plant cells have a rigid cell wall while animal cells only have a membrane? What evidence can we gather under a microscope to prove this?".
    
    Provide your output as a JSON object matching the following schema:
    {
      "questions": [
        {
          "level": "Analyzing" | "Evaluating" | "Creating",
          "question": "The actual inquiry question prompt in ${langLabel}",
          "pedagogicalIntent": "What cognitive mechanism or scientific concept this checks in ${langLabel}",
          "expectedAnswerGuide": "What a model student answer should include in ${langLabel}",
          "sourceReference": "Specific Cambridge standard or guidance chapter this is traceable to"
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
    You are an expert Cambridge Primary Science Mentor and Curriculum Advisor.
    You generate detailed, lesson-specific teacher guidance, pedagogical warnings, and active inquiry-based instructions.
    All outputs must be written in ${langLabel} language.
  `;

  const prompt = `
    Create structured, professional teacher guidance for this lesson:
    
    Lesson Title: ${lesson.title}
    Objectives: ${JSON.stringify(lesson.learningObjectives)}
    Activities: ${JSON.stringify(lesson.activities)}

    Knowledge Base Context:
    ${docContext}

    Ensure your output contains warning flags for student misconceptions, lab setup instructions, and differentiation options.

    Provide your output in JSON matching the following schema:
    {
      "pedagogicalFramework": "Detailed strategy for guiding student inquiry in ${langLabel}",
      "misconceptionAlerts": [
        {
          "misconception": "The wrong student belief in ${langLabel}",
          "scientificCorrection": "The proper scientific correction in ${langLabel}",
          "interventionStrategy": "A rapid class activity or visual check to address it in ${langLabel}"
        }
      ],
      "practicalLabGuidelines": "Clear, hands-on lab setup and safety guidelines in ${langLabel}",
      "differentiationTips": "Concrete instructions for supporting lower-ability and extending high-ability researchers in ${langLabel}",
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
