import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Lazy initializer for Google GenAI SDK
let aiInstance: GoogleGenAI | null = null;
function getGoogleGenAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please configure it under Settings > Secrets.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// In-memory virtual database for documents
let virtualDocuments = [
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

// Helper to search virtual documents for relevant context
function searchKnowledgeBase(query: string): string {
  // Simple keyword matching across virtual documents to ground the model
  const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  let context = "";
  for (const doc of virtualDocuments) {
    let score = 0;
    for (const kw of keywords) {
      if (doc.extractedText.toLowerCase().includes(kw)) {
        score++;
      }
    }
    if (score > 0) {
      context += `[Source: ${doc.name}]\n${doc.extractedText.slice(0, 1000)}...\n\n`;
    }
  }
  return context || "No highly specific matching source text found. Using general Cambridge Primary Science curriculum standards.";
}

// 1. Analyze Lesson Endpoint
app.post("/api/analyze-lesson", async (req, res) => {
  try {
    const { lesson } = req.body;
    if (!lesson) {
      return res.status(400).json({ error: "Lesson plan data is required" });
    }

    const ai = getGoogleGenAI();
    const docContext = searchKnowledgeBase(lesson.title + " " + lesson.unitTitle);

    const prompt = `
      You are an expert Cambridge Primary Science curriculum specialist and educational auditor.
      Analyze the following Vinschool Science Lesson Plan against the Cambridge standards and pedagogical guidelines.
      
      Lesson Title: ${lesson.title}
      Unit: ${lesson.unitTitle}
      Learning Objectives: ${JSON.stringify(lesson.learningObjectives)}
      Mapped Cambridge Standards: ${JSON.stringify(lesson.mappedCambridgeStandards)}
      TWS Elements: ${JSON.stringify(lesson.twsElements)}
      Activities: ${JSON.stringify(lesson.activities)}

      Knowledge Base Source Context:
      ${docContext}

      Provide your review output in JSON format with the following schema:
      {
        "lessonId": "${lesson.id}",
        "alignmentScore": <number from 0 to 100 representing how well mapped objectives match Cambridge standards>,
        "cognitiveDepthRating": "<depth assessment like: Remembering/Understanding or Analyzing/Creating>",
        "twsIntegrationAudit": "<detailed analysis of how effectively Thinking & Working Scientifically is mapped>",
        "strengths": ["list of structural strengths of this lesson plan"],
        "gaps": ["list of identified curriculum gaps, cognitive omissions, or unmapped requirements"],
        "actionableImprovements": ["specific, concrete improvements teachers can implement"],
        "referencedSources": ["list of referenced sources from the provided knowledge base context"]
      }

      Avoid generic responses. Ground every finding in specific standard mappings and the provided source files. Do not invent details.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lessonId: { type: Type.STRING },
            alignmentScore: { type: Type.INTEGER },
            cognitiveDepthRating: { type: Type.STRING },
            twsIntegrationAudit: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
            actionableImprovements: { type: Type.ARRAY, items: { type: Type.STRING } },
            referencedSources: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["lessonId", "alignmentScore", "cognitiveDepthRating", "twsIntegrationAudit", "strengths", "gaps", "actionableImprovements", "referencedSources"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to analyze lesson plan." });
  }
});

// 2. Generate Higher-Order Thinking Questions Endpoint
app.post("/api/generate-questions", async (req, res) => {
  try {
    const { lesson } = req.body;
    if (!lesson) {
      return res.status(400).json({ error: "Lesson plan is required" });
    }

    const ai = getGoogleGenAI();
    const docContext = searchKnowledgeBase(lesson.title + " " + lesson.unitTitle);

    const prompt = `
      You are an expert curriculum designer. Generate exactly three (3) high-quality higher-order thinking questions (Bloom's Taxonomy: Analyzing, Evaluating, or Creating levels) for this specific lesson.
      
      Lesson Title: ${lesson.title}
      Learning Objectives: ${JSON.stringify(lesson.learningObjectives)}
      Mapped Cambridge Standards: ${JSON.stringify(lesson.mappedCambridgeStandards)}
      
      Referenced context:
      ${docContext}

      Provide your output as a JSON object containing an array of questions:
      {
        "questions": [
          {
            "level": "Analyzing" | "Evaluating" | "Creating",
            "question": "The actual question prompt",
            "pedagogicalIntent": "What cognitive mechanism or concept this is checking",
            "expectedAnswerGuide": "What a model or highly competent student answer should include",
            "sourceReference": "Specific Cambridge standard or guidance chapter this is traceable to"
          }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  level: { type: Type.STRING },
                  question: { type: Type.STRING },
                  pedagogicalIntent: { type: Type.STRING },
                  expectedAnswerGuide: { type: Type.STRING },
                  sourceReference: { type: Type.STRING },
                },
                required: ["level", "question", "pedagogicalIntent", "expectedAnswerGuide", "sourceReference"],
              },
            },
          },
          required: ["questions"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to generate questions." });
  }
});

// 3. Generate Teacher Guidance Endpoint
app.post("/api/generate-guidance", async (req, res) => {
  try {
    const { lesson } = req.body;
    if (!lesson) {
      return res.status(400).json({ error: "Lesson plan is required" });
    }

    const ai = getGoogleGenAI();
    const docContext = searchKnowledgeBase(lesson.title + " " + lesson.unitTitle);

    const prompt = `
      You are an expert Cambridge Primary Science Mentor. Generate detailed, lesson-specific teacher guidance, pedagogical warnings, and active inquiry-based instructions for the Vinschool Science curriculum.

      Lesson Title: ${lesson.title}
      Objectives: ${JSON.stringify(lesson.learningObjectives)}
      Activities: ${JSON.stringify(lesson.activities)}

      Context:
      ${docContext}

      Return a JSON object containing structured sections:
      {
        "pedagogicalFramework": "Detailed strategy for guiding student inquiry",
        "misconceptionAlerts": [
          {
            "misconception": "The wrong student belief",
            "scientificCorrection": "The proper physics/chemistry/biology correction",
            "interventionStrategy": "A rapid class activity or visual to fix it"
          }
        ],
        "practicalLabGuidelines": "Clear, hands-on cell/matter/forces lab advice including equipment safety and setup",
        "differentiationTips": "Concrete instructions for supporting lower-ability and extending high-ability researchers",
        "curriculumTraceability": "Quote references from uploaded texts"
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pedagogicalFramework: { type: Type.STRING },
            misconceptionAlerts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  misconception: { type: Type.STRING },
                  scientificCorrection: { type: Type.STRING },
                  interventionStrategy: { type: Type.STRING },
                },
                required: ["misconception", "scientificCorrection", "interventionStrategy"],
              },
            },
            practicalLabGuidelines: { type: Type.STRING },
            differentiationTips: { type: Type.STRING },
            curriculumTraceability: { type: Type.STRING },
          },
          required: ["pedagogicalFramework", "misconceptionAlerts", "practicalLabGuidelines", "differentiationTips", "curriculumTraceability"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to generate teacher guidance." });
  }
});

// 4. Gap Analysis Endpoint
app.post("/api/gap-analysis", async (req, res) => {
  try {
    const { grade, lessons, standards } = req.body;
    const ai = getGoogleGenAI();
    const docContext = searchKnowledgeBase(`Grade ${grade} Science Curriculum Framework Standards Gaps`);

    const prompt = `
      You are an expert Cambridge and Vinschool Science Curriculum Architect. Perform a rigorous, deep gap analysis between:
      1. The active Vinschool Lesson Plans:
         ${JSON.stringify(lessons)}
      2. The official Cambridge Primary Science framework standards for Stage ${grade}:
         ${JSON.stringify(standards)}

      Look specifically for:
      - Cambridge learning objectives completely unmapped or unaddressed by any Vinschool lessons.
      - Cognitive depth mismatches (e.g. Cambridge requires 'Analyzing' or 'Evaluating' but Vinschool only implements 'Remembering/Understanding' lectures).
      - Under-represented TWS (Thinking & Working Scientifically) skills.

      Ground the findings using uploaded material context:
      ${docContext}

      Provide your gap audit in JSON format:
      {
        "id": "gap_audit_g${grade}",
        "title": "Grade ${grade} Vinschool-Cambridge Gap Analysis Report",
        "grade": ${grade},
        "runDate": "${new Date().toISOString()}",
        "summary": "Overall summary of framework alignment and coverage percentage",
        "identifiedGaps": [
          {
            "standardCode": "Code of the gap standard (e.g. 5Bi.02)",
            "standardDesc": "Description of the standard",
            "gapType": "Missing Objective" | "Cognitive Mismatch" | "TWS Under-represented",
            "severity": "High" | "Medium" | "Low",
            "description": "Clear explanation of how the Vinschool lessons fail to meet this standard",
            "recommendation": "Step-by-step revision recommendation for curriculum writers"
          }
        ],
        "traceabilityNotes": "Cite specific chapters or documents analyzed"
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            grade: { type: Type.INTEGER },
            runDate: { type: Type.STRING },
            summary: { type: Type.STRING },
            identifiedGaps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  standardCode: { type: Type.STRING },
                  standardDesc: { type: Type.STRING },
                  gapType: { type: Type.STRING },
                  severity: { type: Type.STRING },
                  description: { type: Type.STRING },
                  recommendation: { type: Type.STRING },
                },
                required: ["standardCode", "standardDesc", "gapType", "severity", "description", "recommendation"],
              },
            },
            traceabilityNotes: { type: Type.STRING },
          },
          required: ["id", "title", "grade", "runDate", "summary", "identifiedGaps", "traceabilityNotes"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to perform gap analysis." });
  }
});

// 5. In-Context Floating AI Chat Specialist Endpoint
app.post("/api/chat-specialist", async (req, res) => {
  try {
    const { messages, activeLesson, activeStandard } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    const ai = getGoogleGenAI();
    const latestMessage = messages[messages.length - 1]?.text || "";
    const docContext = searchKnowledgeBase(latestMessage + (activeLesson ? " " + activeLesson.title : ""));

    let systemInstruction = `
      You are an elite, highly professional Cambridge Primary Science Curriculum Advisor and Researcher working internally for Vinschool.
      You are NOT a friendly classroom assistant or student tutor. Your voice is analytical, scholarly, precise, and authoritative.
      You assist curriculum developers, teachers, and coordinators in reviewing, auditing, and restructuring lessons to meet rigorous international standards.
      
      Always cite specific Cambridge objective codes (e.g. [5Bi.01], [5Ch.02], [5Tw.01]) and refer back to ingested source texts.
      Never fabricate standards, objectives, or activities. If something is missing, state it clearly as a gap.
    `;

    if (activeLesson) {
      systemInstruction += `\nYour conversation is currently contextualized to the Vinschool Lesson Plan: "${activeLesson.title}" (Grade ${activeLesson.grade}, Unit: ${activeLesson.unitTitle}). Objectives: ${JSON.stringify(activeLesson.learningObjectives)}. Mapped Standards: ${JSON.stringify(activeLesson.mappedCambridgeStandards)}.`;
    }
    if (activeStandard) {
      systemInstruction += `\nYour conversation is currently focused on Cambridge Standard: [${activeStandard.code}] - "${activeStandard.description}" (${activeStandard.strand}, Cognitive level: ${activeStandard.bloomCognitiveLevel}).`;
    }

    const contents = [
      { text: `Grounding Sources from the uploaded files:\n${docContext}\n\nChat History:\n` },
      ...messages.map((m: any) => ({
        role: m.sender === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      })),
    ];

    // Format chat contents according to GenerateContentParameters
    const chatContents = messages.map((m: any) => ({
      role: m.sender === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    }));

    // Insert the docContext as part of the first turn or system context
    chatContents.unshift({
      role: "user",
      parts: [{ text: `Knowledge base context to ground your knowledge (do not mention reading this explicitly unless asked):\n${docContext}` }],
    });
    chatContents.push({
      role: "user",
      parts: [{ text: "Provide your curriculum advice or answer to the query based on the above framework." }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: chatContents,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to communicate with AI specialist." });
  }
});

// File Upload endpoint (Knowledge Ingestion Simulation)
app.post("/api/upload-document", (req, res) => {
  const { name, type, textContent, targetGrade } = req.body;
  if (!name || !type || !textContent) {
    return res.status(400).json({ error: "name, type, and textContent are required parameters." });
  }

  const newDoc = {
    id: `doc_${Date.now()}`,
    name,
    type: type as "PDF" | "Excel" | "Word",
    uploadedAt: new Date().toISOString(),
    fileSize: textContent.length * 1.5,
    status: "ready" as const,
    extractedText: textContent,
    targetGrade: targetGrade || 5,
  };

  virtualDocuments.push(newDoc);
  res.json(newDoc);
});

// Get all uploaded documents
app.get("/api/documents", (req, res) => {
  res.json(virtualDocuments);
});

// Start server
async function start() {
  // Integrate Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
