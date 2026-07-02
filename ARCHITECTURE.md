# Vinschool Science Curriculum Review Platform
## System Architecture & Design Proposal

This document defines the complete system architecture, data models, AI workflow, and user interface design for the **Vinschool Science Curriculum Review Platform**, an internal research tool mapping Vinschool Science lessons against the **Cambridge Primary Science** framework.

---

## 1. System Architecture

The application is built on a robust **Full-Stack React + Express** architecture designed to keep sensitive API keys hidden, execute performant text analyses, and deliver a smooth, high-fidelity client-side interface.

```
┌────────────────────────────────────────────────────────┐
│                   VIRTUAL BROWSER                      │
│  ┌───────────────────────┐   ┌──────────────────────┐  │
│  │   Sidebar Navigation  │   │   Split-Screen       │  │
│  │   & App State         │   │   Document Viewer    │  │
│  └───────────┬───────────┘   └──────────┬───────────┘  │
└──────────────┼──────────────────────────┼──────────────┘
               │ JSON API                 │ Static Assets
               ▼                          ▼
┌────────────────────────────────────────────────────────┐
│                  EXPRESS BACKEND                       │
│  ┌───────────────────────┐   ┌──────────────────────┐  │
│  │  API Routes & Proxies  │◄──►  Document Parser    │  │
│  │  (Analysis / Queries)  │   │  (PDF/Excel/Word)    │  │
│  └───────────┬───────────┘   └──────────────────────┘  │
│              │ @google/genai SDK                       │
│              ▼                                         │
│  ┌───────────────────────┐                             │
│  │   Gemini API Proxy    │                             │
│  │   (3.5-flash / Pro)   │                             │
│  └───────────────────────┘                             │
└────────────────────────────────────────────────────────┘
```

### Server (`server.ts`)
- **Runtime Environment:** Node.js (with Native TypeScript stripping or tsx execution).
- **Web Framework:** Express.js serving JSON API endpoints and acting as a static asset server in production.
- **Port Binding:** Binds strictly to `0.0.0.0:3000` for container compatibility.
- **AI Integration:** Uses `@google/genai` (SDK version `^2.4.0`) server-side, securing the `GEMINI_API_KEY`.
- **Telemetry:** Injects the `User-Agent: aistudio-build` header on all outbound requests to Google GenAI.

### Client (`src/App.tsx` & `/src/components/*`)
- **Framework:** React 19 + Vite 6 + Tailwind CSS.
- **State Management:** Client-side React context for active lesson workspaces, active analytical models, search indexing, and local document caches.
- **Visuals & Transitions:** Controlled animations using `motion` (imported from `motion/react`) for Apple-like page sliding and split-screen expansions.
- **Iconography:** Strictly standard vector icons imported from `lucide-react`.

---

## 2. Page Structure & Navigation Flow

The interface adopts a high-density, **Apple-like desktop workspace** optimized for researchers. A persistent sidebar controls navigation, with workspace actions utilizing split-screens and double-panel layouts.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ LOGO  VINSCHOOL SCIENCE REVIEW PLATFORM                                    │
├─────────┬──────────────────────────────────────────────────────────────────┤
│         │ Top Bar: Search Everywhere | Grade Filter [1-5] | Theme Accent   │
│ SIDEBAR ├──────────────────────────────────────────────────────────────────┤
│         │                                                                  │
│ [Explorer]  Curriculum Explorer                                            │
│ [Lesson]    - Selected Lesson Panel (Interactive Objectives & TWS)          │
│ [Standard]  - Cambridge Standard Mapper & Standards Tree                   │
│         │                                                                  │
│ [Analyze]   AI Analytical Engines                                          │
│ [TWS]       - TWS & Bloom's Taxonomy Analyzer                              │
│ [Review]    - Full AI Curriculum Specialist Review                         │
│ [Query]     - High-Order Thinking Question Generator                       │
│ [Guidance]  - Lesson-Specific Teacher Guidance Document Generator          │
│         │                                                                  │
│ [Research]  Research & Intelligence                                         │
│ [Compare]   - Side-by-Side Lesson Comparator                               │
│ [Gaps]      - Cambridge Framework Gap Analysis                             │
│ [Docs]      - Document Repository & Split-Screen Reader                    │
│         │                                                                  │
├─────────┴──────────────────────────────────────────────────────────────────┤
│ FLOATING AI ASSISTANT PANEL (Stays docked or expanded, context-aware)       │
└────────────────────────────────────────────────────────────────────────────┘
```

### Multi-Panel Workspace Layouts
- **Split-Screen Reading:** When reviewing a lesson, a secondary canvas expands from the right displaying the imported Cambridge Science Learner Book or Vinschool Curriculum Excel sheet, allowing the developer to trace facts directly.
- **Floating AI Assistant:** Interactive companion panel that inherits the current lesson or gap-report state, acting as a real-time coprocessor.

---

## 3. Data Model & Database Schema (Firestore Collections)

Since Firestore is our cloud persistence system, we use a flattened, highly indexable document schema optimized for quick querying of standards and lessons.

### `uploaded_documents` (Collection)
Defines metadata and parsed structure of ingested books, Excel sheets, and guidance briefs.
```json
{
  "id": "doc_cambridge_g5_ch1",
  "name": "Cambridge_Primary_Science_Learner_Book_5_Chapter_1.pdf",
  "type": "PDF",
  "uploadedAt": "2026-07-02T10:38:00Z",
  "fileSize": 2450000,
  "extractedText": "Chapter 1: Life Processes... Key Standards: 5Bi.01..."
}
```

### `cambridge_standards` (Collection)
Stores Cambridge Primary Science learning objectives and code mapping.
```json
{
  "id": "5Bi_01",
  "code": "5Bi.01",
  "strand": "Biology",
  "substrand": "Structure and Function",
  "stage": 5,
  "description": "Know that plants and animals are made of cells and outline the basic parts of cells.",
  "bloomCognitiveLevel": "Remembering/Understanding"
}
```

### `lessons` (Collection)
The atomic lesson units inside the Vinschool Curriculum framework.
```json
{
  "id": "vsc_g5_u1_l2",
  "grade": 5,
  "unitId": "U1_Cells",
  "unitTitle": "Cells and Organisms",
  "lessonNumber": 2,
  "title": "Structure of Plant and Animal Cells",
  "durationMinutes": 80,
  "learningObjectives": [
    "Identify cell wall, cell membrane, cytoplasm, and nucleus under a micro-viewer.",
    "Contrast plant cells with animal cells."
  ],
  "mappedCambridgeStandards": ["5Bi.01", "5Bi.02"],
  "twsElements": [
    {"stage": "Planning", "description": "Suggest how to make and use a wet mount slide."},
    {"stage": "Analysis", "description": "Record observations of onion skin cells using sketches."}
  ],
  "activities": [
    "Introduction to micro-viewer components",
    "Onion skin cell specimen preparation",
    "Comparative analysis of plant vs animal cells diagram"
  ],
  "thinkingQuestions": [
    "Why does a plant cell require a rigid cell wall, whereas animal cells do not?"
  ],
  "teacherGuidance": "Focus on ensuring specimen slides are sliced thin enough for light transmission...",
  "updatedAt": "2026-07-02T10:38:00Z"
}
```

---

## 4. File Processing & AI Reasoning Pipeline

Every generated insight must avoid hallucination and strictly ground itself on imported documents or pre-loaded frameworks.

```
┌────────────────────────────────────────────────────────┐
│                 INGESTION STAGE                        │
│  User uploads Cambridge Book (PDF), Framework (Excel)   │
│  or Word Guidance Document.                            │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│                 PARSING & EMBEDDING                    │
│  - Extract structure, text passages, and tables.       │
│  - Map extracted blocks to specific Grade Levels &     │
│    Cambridge standard codes.                           │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│                 AI REASONING CORE                      │
│  - Model: gemini-3.5-flash / gemini-3.1-pro-preview   │
│  - Config: Structured responseSchema, Temperature=0.2  │
│  - Context: Injected system instructions + raw source   │
│    texts (Cambridge + Vinschool).                      │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│                 OUTPUT & METADATA                      │
│  Outputs structured GAP analyses, thinking questions, │
│  and guidance with traceability annotations.           │
└────────────────────────────────────────────────────────┘
```

- **System Instruction Strategy:** We train the model to output academic-grade curriculum audits:
  > *"You are an expert Cambridge Primary Science curriculum specialist. Evaluate the Vinschool Science Lesson plans based strictly on the provided Cambridge Framework objectives. Identify gaps where Vinschool lessons fail to address TWS (Thinking and Working Scientifically) skills or fail to reach the requested Bloom's taxonomy cognitive depth."*
- **Traceability Guarantee:** All AI outputs must explicitly quote the Cambridge Standard Code (e.g. `[5Bi.01]`) or the chapter page reference of the uploaded book to guarantee non-invented, reliable data for academic leaders.

---

## 5. Main Screen Interactive Layouts

We will build the following specialized views, switching smoothly via the elegant vertical sidebar:
1. **Dashboard & Import Center:** Clean file uploader with status badges and overall metrics (number of active lessons, standards mapped, gaps identified).
2. **Curriculum Explorer:** Expandable tree index of Grade levels, units, and lesson plans.
3. **Lesson Workspace (with Split-Screen PDF/Excel viewer):** Inspecting lessons, learning objectives, TWS indicators, and active materials.
4. **Interactive Mapping & Standard Tree:** Interactive view linking Vinschool lessons directly to the Cambridge standards tree.
5. **AI Workspace (Taxonomy, Questions, & Guidance Generator):** Triggers specific, structural Gemini prompts and renders beautiful, copyable document results.
6. **Analytical Engines (Gap Analysis & Side-by-Side Comparison):** Fully comparative, multi-column analytics showing misalignment between frameworks.
