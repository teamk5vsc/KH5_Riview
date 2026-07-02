import { CambridgeStandard, LessonPlan } from "./types";

export const CAMBRIDGE_STANDARDS_DB: CambridgeStandard[] = [
  // Grade 5 Biology
  {
    id: "5Bi_01",
    code: "5Bi.01",
    strand: "Biology",
    substrand: "Structure and Function",
    stage: 5,
    description: "Know that plants and animals are made of cells and outline the basic parts of cells, including cell wall, cell membrane, cytoplasm, and nucleus.",
    bloomCognitiveLevel: "Remembering"
  },
  {
    id: "5Bi_02",
    code: "5Bi.02",
    strand: "Biology",
    substrand: "Structure and Function",
    stage: 5,
    description: "Describe and explain the differences between plant cells and animal cells (inclusion of cell wall, large central vacuole, and chloroplasts in plant cells).",
    bloomCognitiveLevel: "Understanding"
  },
  {
    id: "5Bi_03",
    code: "5Bi.03",
    strand: "Biology",
    substrand: "Life Processes",
    stage: 5,
    description: "Describe the primary functions of cell components and relate cellular structures to their specific roles (e.g. chloroplasts for photosynthesis).",
    bloomCognitiveLevel: "Analyzing"
  },
  // Grade 5 Chemistry
  {
    id: "5Ch_01",
    code: "5Ch.01",
    strand: "Chemistry",
    substrand: "States of Matter",
    stage: 5,
    description: "Describe the differences in properties and behavior of particles in solids, liquids, and gases using the particle model.",
    bloomCognitiveLevel: "Understanding"
  },
  {
    id: "5Ch_02",
    code: "5Ch.02",
    strand: "Chemistry",
    substrand: "States of Matter",
    stage: 5,
    description: "Explain how evaporation and condensation can be used to separate mixtures and relate these processes to everyday water cycle phenomena.",
    bloomCognitiveLevel: "Applying"
  },
  {
    id: "5Ch_03",
    code: "5Ch.03",
    strand: "Chemistry",
    substrand: "Chemical and Physical Changes",
    stage: 5,
    description: "Identify physical changes (such as melting and boiling) and distinguish them from irreversible chemical reactions (such as burning).",
    bloomCognitiveLevel: "Analyzing"
  },
  // Grade 5 Physics
  {
    id: "5Ps_01",
    code: "5Ps.01",
    strand: "Physics",
    substrand: "Forces and Motion",
    stage: 5,
    description: "Identify gravity as a non-contact force that pulls objects towards the center of the Earth and describe its constant effect.",
    bloomCognitiveLevel: "Remembering"
  },
  {
    id: "5Ps_02",
    code: "5Ps.02",
    strand: "Physics",
    substrand: "Forces and Motion",
    stage: 5,
    description: "Measure forces in Newtons using spring balances (newtonmeters) and explain how friction acts to oppose sliding motion.",
    bloomCognitiveLevel: "Applying"
  },
  // Grade 5 Earth & Space
  {
    id: "5Es_01",
    code: "5Es.01",
    strand: "Earth & Space",
    substrand: "Earth and the Universe",
    stage: 5,
    description: "Describe the rotation of the Earth on its axis and explain how this leads to the apparent movement of the Sun and the cycle of day and night.",
    bloomCognitiveLevel: "Understanding"
  },
  // Grade 5 Thinking & Working Scientifically
  {
    id: "5Tw_01",
    code: "5Tw.01",
    strand: "Thinking & Working Scientifically",
    substrand: "Planning and Conducting Experiments",
    stage: 5,
    description: "Identify and describe the variables in an experiment, explaining which variables should be changed, measured, or kept the same (fair test).",
    bloomCognitiveLevel: "Evaluating"
  },
  {
    id: "5Tw_02",
    code: "5Tw.02",
    strand: "Thinking & Working Scientifically",
    substrand: "Data Analysis and Conclusions",
    stage: 5,
    description: "Present results in structured tables and line graphs, identify trends in data, and draw scientific conclusions grounded in evidence.",
    bloomCognitiveLevel: "Analyzing"
  }
];

export const VINSCHOOL_LESSONS_DB: LessonPlan[] = [
  {
    id: "vsc_g5_u1_l1",
    grade: 5,
    unitId: "U1_Cells",
    unitTitle: "Life Processes and Cells",
    lessonNumber: 1,
    title: "Introduction to Living Organisms and Cells",
    durationMinutes: 40,
    learningObjectives: [
      "Define the cell as the basic structural and functional unit of all living organisms.",
      "List the characteristics of life (movement, respiration, sensitivity, growth, reproduction, excretion, nutrition)."
    ],
    mappedCambridgeStandards: ["5Bi.01"],
    twsElements: [
      {
        id: "tws_1",
        stage: "Planning",
        description: "Formulate simple questions about how cell structures enable life processes.",
        bloomCognitiveLevel: "Applying"
      }
    ],
    activities: [
      "Hook: Grouping living things vs non-living things.",
      "Direct Instruction: Explaining cells using building blocks as an analogy.",
      "Guided Inquiry: Researching single-celled vs multi-celled organisms using short reading cards."
    ],
    thinkingQuestions: [
      "Is a flame a living thing? It grows, moves, and consumes oxygen. Discuss cell structure's role in defining life.",
      "How would life differ if organisms were comprised of only one massive cell instead of trillions of tiny cells?"
    ],
    teacherGuidance: "Ensure students focus on cell theory. Avoid talking about specific cell parts yet, as this will be covered in Lesson 2. Address the misconception that cells grow to be giant; instead, organisms grow by cell division.",
    updatedAt: "2026-07-02T10:38:00Z"
  },
  {
    id: "vsc_g5_u1_l2",
    grade: 5,
    unitId: "U1_Cells",
    unitTitle: "Life Processes and Cells",
    lessonNumber: 2,
    title: "Structure of Plant and Animal Cells",
    durationMinutes: 80,
    learningObjectives: [
      "Identify the cell wall, cell membrane, cytoplasm, and nucleus on diagrams and micrographs.",
      "Explain the primary function of each cellular part.",
      "Compare and contrast the structural features of plant cells and animal cells."
    ],
    mappedCambridgeStandards: ["5Bi.01", "5Bi.02", "5Bi.03"],
    twsElements: [
      {
        id: "tws_2",
        stage: "Obtaining & Presenting Evidence",
        description: "Make clear drawings of plant cells observed via microscopic diagrams, labeling parts accurately.",
        bloomCognitiveLevel: "Applying"
      }
    ],
    activities: [
      "Inquiry Lab: Analyzing diagrams and micrographs of cheek cells (animal) and onion skin cells (plant).",
      "Interactive Card Sort: Match cellular components (cell wall, nucleus, etc.) with their definitions and roles.",
      "Venn Diagram Workshop: Students work in pairs to compare plant vs animal cells, highlighting vacuole size, cell wall, and chloroplasts."
    ],
    thinkingQuestions: [
      "Why do plants require a rigid cell wall, while animals do not? How does this relate to their motility and skeletal structures?",
      "If you removed the nucleus from a cell, what immediate consequences would the cell experience?"
    ],
    teacherGuidance: "This is an 80-minute double lesson. Focus heavily on specimen micrographs. Students often confuse cell walls and cell membranes in plant cells. Explain that the wall is the outer protective layer, while the membrane is the internal gatekeeper.",
    updatedAt: "2026-07-02T10:38:00Z"
  },
  {
    id: "vsc_g5_u1_l3",
    grade: 5,
    unitId: "U1_Cells",
    unitTitle: "Life Processes and Cells",
    lessonNumber: 3,
    title: "Cell Specialization and Functions",
    durationMinutes: 40,
    learningObjectives: [
      "Explain the concept of specialized cells and why multicellular organisms have them.",
      "Detail the structures and specific adaptations of root hair cells, palisade cells, red blood cells, and nerve cells."
    ],
    mappedCambridgeStandards: ["5Bi.03"],
    twsElements: [
      {
        id: "tws_3",
        stage: "Analysis, Evaluation & Conclusions",
        description: "Formulate claims and evidence relating cell structure surface area to absorption rate.",
        bloomCognitiveLevel: "Analyzing"
      }
    ],
    activities: [
      "Matching Activity: Match 4 specialized cells with their micro-anatomy and functional environments.",
      "Case Study: Investigate how a root hair cell uses its extended structure to maximize water uptake.",
      "3D Model Creation: Sketch or mold specialized cells using clay to highlight anatomical adaptations."
    ],
    thinkingQuestions: [
      "Why would a root hair cell lack chloroplasts? Relate this directly to its underground micro-environment and functional purpose.",
      "Red blood cells lack a nucleus. How does this adaptation serve their function, and what sacrifice does it make regarding the cell's lifespan?"
    ],
    teacherGuidance: "Guide students to understand that specialized cells are still cells but have 'tweaked' features. Make sure they understand palisade cells are situated on the upper leaf surface to capture sunlight.",
    updatedAt: "2026-07-02T10:38:00Z"
  },
  {
    id: "vsc_g5_u2_l1",
    grade: 5,
    unitId: "U2_Matter",
    unitTitle: "States and Behavior of Matter",
    lessonNumber: 1,
    title: "Properties of Solids, Liquids, and Gases",
    durationMinutes: 80,
    learningObjectives: [
      "Differentiate between solids, liquids, and gases by measuring volume and examining compressibility.",
      "Apply the Particle Model of Matter to explain fixed shapes, flow, and compressibility differences."
    ],
    mappedCambridgeStandards: ["5Ch.01", "5Tw.01"],
    twsElements: [
      {
        id: "tws_4",
        stage: "Planning",
        description: "Design a fair test investigating how fluid viscosity changes under applied mechanical forces.",
        bloomCognitiveLevel: "Evaluating"
      }
    ],
    activities: [
      "Interactive Syringe Lab: Fill one syringe with sand (solid), one with water (liquid), and one with air (gas). Students compress each to measure resistance.",
      "Role-play Activity: Students stand close together, vibrate, glide, or run freely around the room to simulate particle behavior across the three states.",
      "Comparison Grid: Compile physical attributes (compressibility, shape, spacing, motion) into a research matrix."
    ],
    thinkingQuestions: [
      "Sand can flow out of a bottle like water, and it takes the shape of its container. Explain why sand is still classified as a solid using particle principles.",
      "Why does a gas expand to fill any container it is placed in, whereas liquids only fill the bottom?"
    ],
    teacherGuidance: "Be prepared for the misconception that particles themselves expand or shrink. Reinforce that only the spaces between the particles change. Emphasize that gas compressibility is possible because of the vast empty spaces.",
    updatedAt: "2026-07-02T10:38:00Z"
  }
];
