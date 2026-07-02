import { CambridgeStandard, LessonPlan } from "./types";

export const CAMBRIDGE_STANDARDS_DB: CambridgeStandard[] = [
  // Grade 5 Biology
  {
    id: "5Bi_01",
    code: "5Bi.01",
    strand: "Biology",
    strandVi: "Sinh học",
    substrand: "Structure and Function",
    substrandVi: "Cấu trúc và Chức năng",
    stage: 5,
    description: "Know that plants and animals are made of cells and outline the basic parts of cells, including cell wall, cell membrane, cytoplasm, and nucleus.",
    descriptionVi: "Biết rằng thực vật và động vật được cấu tạo từ các tế bào và phác thảo các phần cơ bản của tế bào, bao gồm thành tế bào, màng tế bào, tế bào chất và nhân.",
    bloomCognitiveLevel: "Remembering"
  },
  {
    id: "5Bi_02",
    code: "5Bi.02",
    strand: "Biology",
    strandVi: "Sinh học",
    substrand: "Structure and Function",
    substrandVi: "Cấu trúc và Chức năng",
    stage: 5,
    description: "Describe and explain the differences between plant cells and animal cells (inclusion of cell wall, large central vacuole, and chloroplasts in plant cells).",
    descriptionVi: "Mô tả và giải thích sự khác biệt giữa tế bào thực vật và tế bào động vật (bao gồm thành tế bào, không bào trung tâm lớn và lục lạp ở tế bào thực vật).",
    bloomCognitiveLevel: "Understanding"
  },
  {
    id: "5Bi_03",
    code: "5Bi.03",
    strand: "Biology",
    strandVi: "Sinh học",
    substrand: "Life Processes",
    substrandVi: "Các quá trình sống",
    stage: 5,
    description: "Describe the primary functions of cell components and relate cellular structures to their specific roles (e.g. chloroplasts for photosynthesis).",
    descriptionVi: "Mô tả chức năng chính của các thành phần tế bào và liên hệ cấu trúc tế bào với vai trò cụ thể của chúng (ví dụ: lục lạp cho quá trình quang hợp).",
    bloomCognitiveLevel: "Analyzing"
  },
  // Grade 5 Chemistry
  {
    id: "5Ch_01",
    code: "5Ch.01",
    strand: "Chemistry",
    strandVi: "Hóa học",
    substrand: "States of Matter",
    substrandVi: "Các trạng thái của chất",
    stage: 5,
    description: "Describe the differences in properties and behavior of particles in solids, liquids, and gases using the particle model.",
    descriptionVi: "Mô tả sự khác biệt về tính chất và hành vi của các hạt trong chất rắn, chất lỏng và chất khí bằng mô hình hạt.",
    bloomCognitiveLevel: "Understanding"
  },
  {
    id: "5Ch_02",
    code: "5Ch.02",
    strand: "Chemistry",
    strandVi: "Hóa học",
    substrand: "States of Matter",
    substrandVi: "Các trạng thái của chất",
    stage: 5,
    description: "Explain how evaporation and condensation can be used to separate mixtures and relate these processes to everyday water cycle phenomena.",
    descriptionVi: "Giải thích cách quá trình bay hơi và ngưng tụ có thể được sử dụng để tách các hỗn hợp và liên hệ các quá trình này với các hiện tượng vòng tuần hoàn nước hàng ngày.",
    bloomCognitiveLevel: "Applying"
  },
  {
    id: "5Ch_03",
    code: "5Ch.03",
    strand: "Chemistry",
    strandVi: "Hóa học",
    substrand: "Chemical and Physical Changes",
    substrandVi: "Các biến đổi Hóa học và Vật lý",
    stage: 5,
    description: "Identify physical changes (such as melting and boiling) and distinguish them from irreversible chemical reactions (such as burning).",
    descriptionVi: "Xác định các biến đổi vật lý (như nóng chảy và sôi) và phân biệt chúng với các phản ứng hóa học không thuận nghịch (như đốt cháy).",
    bloomCognitiveLevel: "Analyzing"
  },
  // Grade 5 Physics
  {
    id: "5Ps_01",
    code: "5Ps.01",
    strand: "Physics",
    strandVi: "Vật lý",
    substrand: "Forces and Motion",
    substrandVi: "Lực và Chuyển động",
    stage: 5,
    description: "Identify gravity as a non-contact force that pulls objects towards the center of the Earth and describe its constant effect.",
    descriptionVi: "Xác định trọng lực là một lực không tiếp xúc hút các vật về phía tâm Trái Đất và mô tả tác dụng không đổi của nó.",
    bloomCognitiveLevel: "Remembering"
  },
  {
    id: "5Ps_02",
    code: "5Ps.02",
    strand: "Physics",
    strandVi: "Vật lý",
    substrand: "Forces and Motion",
    substrandVi: "Lực và Chuyển động",
    stage: 5,
    description: "Measure forces in Newtons using spring balances (newtonmeters) and explain how friction acts to oppose sliding motion.",
    descriptionVi: "Đo lực bằng đơn vị Newton sử dụng lực kế lò xo và giải thích cách ma sát hoạt động để chống lại chuyển động trượt.",
    bloomCognitiveLevel: "Applying"
  },
  // Grade 5 Earth & Space
  {
    id: "5Es_01",
    code: "5Es.01",
    strand: "Earth & Space",
    strandVi: "Trái đất & Vũ trụ",
    substrand: "Earth and the Universe",
    substrandVi: "Trái đất và Vũ trụ",
    stage: 5,
    description: "Describe the rotation of the Earth on its axis and explain how this leads to the apparent movement of the Sun and the cycle of day and night.",
    descriptionVi: "Mô tả sự tự quay của Trái Đất quanh trục của nó và giải thích cách điều này dẫn đến chuyển động biểu kiến của Mặt Trời và chu kỳ ngày đêm.",
    bloomCognitiveLevel: "Understanding"
  },
  // Grade 5 Thinking & Working Scientifically
  {
    id: "5Tw_01",
    code: "5Tw.01",
    strand: "Thinking & Working Scientifically",
    strandVi: "Tư duy & Làm việc Khoa học",
    substrand: "Planning and Conducting Experiments",
    substrandVi: "Lên kế hoạch và Tiến hành Thí nghiệm",
    stage: 5,
    description: "Identify and describe the variables in an experiment, explaining which variables should be changed, measured, or kept the same (fair test).",
    descriptionVi: "Xác định và mô tả các biến trong một thí nghiệm, giải thích biến nào cần thay đổi, đo lường hoặc giữ nguyên (thử nghiệm công bằng).",
    bloomCognitiveLevel: "Evaluating"
  },
  {
    id: "5Tw_02",
    code: "5Tw.02",
    strand: "Thinking & Working Scientifically",
    strandVi: "Tư duy & Làm việc Khoa học",
    substrand: "Data Analysis and Conclusions",
    substrandVi: "Phân tích Dữ liệu và Kết luận",
    stage: 5,
    description: "Present results in structured tables and line graphs, identify trends in data, and draw scientific conclusions grounded in evidence.",
    descriptionVi: "Trình bày kết quả trong các bảng có cấu trúc và biểu đồ đường, xác định các xu hướng trong dữ liệu và rút ra các kết luận khoa học dựa trên bằng chứng.",
    bloomCognitiveLevel: "Analyzing"
  }
];

export const VINSCHOOL_LESSONS_DB: LessonPlan[] = [
  {
    id: "vsc_g5_u1_l1",
    grade: 5,
    unitId: "U1_Cells",
    unitTitle: "Life Processes and Cells",
    unitTitleVi: "Quá trình sống và Tế bào",
    lessonNumber: 1,
    title: "Introduction to Living Organisms and Cells",
    titleVi: "Giới thiệu về Sinh vật sống và Tế bào",
    durationMinutes: 40,
    learningObjectives: [
      "Define the cell as the basic structural and functional unit of all living organisms.",
      "List the characteristics of life (movement, respiration, sensitivity, growth, reproduction, excretion, nutrition)."
    ],
    learningObjectivesVi: [
      "Định nghĩa tế bào là đơn vị cấu trúc và chức năng cơ bản của mọi sinh vật sống.",
      "Liệt kê các đặc điểm của sự sống (sự vận động, hô hấp, độ nhạy cảm, sinh trưởng, sinh sản, bài tiết, dinh dưỡng)."
    ],
    mappedCambridgeStandards: ["5Bi.01"],
    twsElements: [
      {
        id: "tws_1",
        stage: "Planning",
        stageVi: "Lên kế hoạch",
        description: "Formulate simple questions about how cell structures enable life processes.",
        descriptionVi: "Đặt các câu hỏi đơn giản về cách cấu trúc tế bào hỗ trợ các quá trình sống.",
        bloomCognitiveLevel: "Applying"
      }
    ],
    activities: [
      "Hook: Grouping living things vs non-living things.",
      "Direct Instruction: Explaining cells using building blocks as an analogy.",
      "Guided Inquiry: Researching single-celled vs multi-celled organisms using short reading cards."
    ],
    activitiesVi: [
      "Khởi động: Phân loại vật sống và vật không sống.",
      "Giảng dạy trực tiếp: Giải thích về tế bào bằng cách sử dụng mô hình khối xây dựng làm tương tự.",
      "Tìm tòi có hướng dẫn: Nghiên cứu sinh vật đơn bào so với sinh vật đa bào bằng thẻ đọc ngắn."
    ],
    thinkingQuestions: [
      "Is a flame a living thing? It grows, moves, and consumes oxygen. Discuss cell structure's role in defining life.",
      "How would life differ if organisms were comprised of only one massive cell instead of trillions of tiny cells?"
    ],
    thinkingQuestionsVi: [
      "Ngọn lửa có phải là một vật sống không? Nó lớn lên, chuyển động và tiêu thụ oxy. Hãy thảo luận về vai trò của cấu trúc tế bào trong việc định nghĩa sự sống.",
      "Sự sống sẽ khác biệt thế nào nếu các sinh vật chỉ được cấu tạo từ một tế bào khổng lồ thay vì hàng nghìn tỷ tế bào nhỏ bé?"
    ],
    teacherGuidance: "Ensure students focus on cell theory. Avoid talking about specific cell parts yet, as this will be covered in Lesson 2. Address the misconception that cells grow to be giant; instead, organisms grow by cell division.",
    teacherGuidanceVi: "Đảm bảo học sinh tập trung vào thuyết tế bào. Tránh nói về các bộ phận cụ thể của tế bào lúc này, vì nội dung đó sẽ được học trong Bài 2. Giải quyết quan niệm sai lầm rằng các tế bào phát triển thành khổng lồ; thay vào đó, các sinh vật lớn lên bằng cách phân chia tế bào.",
    updatedAt: "2026-07-02T10:38:00Z"
  },
  {
    id: "vsc_g5_u1_l2",
    grade: 5,
    unitId: "U1_Cells",
    unitTitle: "Life Processes and Cells",
    unitTitleVi: "Quá trình sống và Tế bào",
    lessonNumber: 2,
    title: "Structure of Plant and Animal Cells",
    titleVi: "Cấu trúc Tế bào Thực vật và Động vật",
    durationMinutes: 80,
    learningObjectives: [
      "Identify the cell wall, cell membrane, cytoplasm, and nucleus on diagrams and micrographs.",
      "Explain the primary function of each cellular part.",
      "Compare and contrast the structural features of plant cells and animal cells."
    ],
    learningObjectivesVi: [
      "Xác định thành tế bào, màng tế bào, tế bào chất và nhân trên sơ đồ và ảnh chụp kính hiển vi.",
      "Giải thích chức năng chính của từng bộ phận tế bào.",
      "So sánh và đối chiếu các đặc điểm cấu trúc của tế bào thực vật và tế bào động vật."
    ],
    mappedCambridgeStandards: ["5Bi.01", "5Bi.02", "5Bi.03"],
    twsElements: [
      {
        id: "tws_2",
        stage: "Obtaining & Presenting Evidence",
        stageVi: "Thu thập & Trình bày Bằng chứng",
        description: "Make clear drawings of plant cells observed via microscopic diagrams, labeling parts accurately.",
        descriptionVi: "Vẽ rõ ràng các tế bào thực vật quan sát được qua sơ đồ kính hiển vi, dán nhãn các bộ phận một cách chính xác.",
        bloomCognitiveLevel: "Applying"
      }
    ],
    activities: [
      "Inquiry Lab: Analyzing diagrams and micrographs of cheek cells (animal) and onion skin cells (plant).",
      "Interactive Card Sort: Match cellular components (cell wall, nucleus, etc.) with their definitions and roles.",
      "Venn Diagram Workshop: Students work in pairs to compare plant vs animal cells, highlighting vacuole size, cell wall, and chloroplasts."
    ],
    activitiesVi: [
      "Phòng thực hành Tìm tòi: Phân tích sơ đồ và ảnh chụp kính hiển vi của tế bào má (động vật) và tế bào biểu bì hành tây (thực vật).",
      "Phân loại thẻ tương tác: Ghép các thành phần tế bào (thành tế bào, nhân tế bào, v.v.) với định nghĩa và vai trò của chúng.",
      "Hội thảo Sơ đồ Venn: Học sinh làm việc theo cặp để so sánh tế bào thực vật và tế bào động vật, làm nổi bật kích thước không bào, thành tế bào và lục lạp."
    ],
    thinkingQuestions: [
      "Why do plants require a rigid cell wall, while animals do not? How does this relate to their motility and skeletal structures?",
      "If you removed the nucleus from a cell, what immediate consequences would the cell experience?"
    ],
    thinkingQuestionsVi: [
      "Tại sao thực vật cần có thành tế bào cứng cáp, trong khi động vật thì không? Điều này liên quan thế nào đến khả năng vận động và cấu trúc xương của chúng?",
      "Nếu bạn loại bỏ nhân ra khỏi tế bào, tế bào sẽ phải chịu những hậu quả tức thời nào?"
    ],
    teacherGuidance: "This is an 80-minute double lesson. Focus heavily on specimen micrographs. Students often confuse cell walls and cell membranes in plant cells. Explain that the wall is the outer protective layer, while the membrane is the internal gatekeeper.",
    teacherGuidanceVi: "Đây là một bài học kép kéo dài 80 phút. Tập trung nhiều vào ảnh chụp kính hiển vi của mẫu vật. Học sinh thường nhầm lẫn giữa thành tế bào và màng tế bào ở tế bào thực vật. Giải thích rằng thành tế bào là lớp bảo vệ bên ngoài, trong khi màng tế bào là người gác cổng bên trong.",
    updatedAt: "2026-07-02T10:38:00Z"
  },
  {
    id: "vsc_g5_u1_l3",
    grade: 5,
    unitId: "U1_Cells",
    unitTitle: "Life Processes and Cells",
    unitTitleVi: "Quá trình sống và Tế bào",
    lessonNumber: 3,
    title: "Cell Specialization and Functions",
    titleVi: "Sự chuyên hóa và Chức năng của Tế bào",
    durationMinutes: 40,
    learningObjectives: [
      "Explain the concept of specialized cells and why multicellular organisms have them.",
      "Detail the structures and specific adaptations of root hair cells, palisade cells, red blood cells, and nerve cells."
    ],
    learningObjectivesVi: [
      "Giải thích khái niệm về tế bào chuyên hóa và lý do tại sao các sinh vật đa bào có chúng.",
      "Chi tiết cấu trúc và sự thích nghi cụ thể của tế bào lông hút, tế bào giậu, hồng cầu và tế bào thần kinh."
    ],
    mappedCambridgeStandards: ["5Bi.03"],
    twsElements: [
      {
        id: "tws_3",
        stage: "Analysis, Evaluation & Conclusions",
        stageVi: "Phân tích, Đánh giá & Kết luận",
        description: "Formulate claims and evidence relating cell structure surface area to absorption rate.",
        descriptionVi: "Đưa ra các khẳng định và bằng chứng liên quan giữa diện tích bề mặt cấu trúc tế bào với tốc độ hấp thụ.",
        bloomCognitiveLevel: "Analyzing"
      }
    ],
    activities: [
      "Matching Activity: Match 4 specialized cells with their micro-anatomy and functional environments.",
      "Case Study: Investigate how a root hair cell uses its extended structure to maximize water uptake.",
      "3D Model Creation: Sketch or mold specialized cells using clay to highlight anatomical adaptations."
    ],
    activitiesVi: [
      "Hoạt động nối ghép: Nối ghép 4 loại tế bào chuyên hóa với cấu trúc vi mô và môi trường chức năng của chúng.",
      "Nghiên cứu tình huống: Tìm hiểu cách tế bào lông hút sử dụng cấu trúc kéo dài của nó để tối đa hóa lượng nước hấp thụ.",
      "Tạo mô hình 3D: Phác thảo hoặc nặn các tế bào chuyên hóa bằng đất sét để làm nổi bật các đặc điểm thích nghi giải phẫu."
    ],
    thinkingQuestions: [
      "Why would a root hair cell lack chloroplasts? Relate this directly to its underground micro-environment and functional purpose.",
      "Red blood cells lack a nucleus. How does this adaptation serve their function, and what sacrifice does it make regarding the cell's lifespan?"
    ],
    thinkingQuestionsVi: [
      "Tại sao tế bào lông hút lại không có lục lạp? Liên hệ điều này trực tiếp với môi trường sống dưới lòng đất và mục đích chức năng của nó.",
      "Tế bào hồng cầu không có nhân. Sự thích nghi này phục vụ chức năng của chúng như thế nào, và nó phải đánh đổi gì về tuổi thọ của tế bào?"
    ],
    teacherGuidance: "Guide students to understand that specialized cells are still cells but have 'tweaked' features. Make sure they understand palisade cells are situated on the upper leaf surface to capture sunlight.",
    teacherGuidanceVi: "Hướng dẫn học sinh hiểu rằng các tế bào chuyên hóa vẫn là tế bào nhưng có các đặc tính được 'tinh chỉnh'. Hãy đảm bảo học sinh hiểu rằng các tế bào giậu nằm ở bề mặt trên của lá để thu nhận tối đa ánh sáng mặt trời.",
    updatedAt: "2026-07-02T10:38:00Z"
  },
  {
    id: "vsc_g5_u2_l1",
    grade: 5,
    unitId: "U2_Matter",
    unitTitle: "States and Behavior of Matter",
    unitTitleVi: "Các trạng thái và Hành vi của Chất",
    lessonNumber: 1,
    title: "Properties of Solids, Liquids, and Gases",
    titleVi: "Tính chất của Chất rắn, Chất lỏng và Chất khí",
    durationMinutes: 80,
    learningObjectives: [
      "Differentiate between solids, liquids, and gases by measuring volume and examining compressibility.",
      "Apply the Particle Model of Matter to explain fixed shapes, flow, and compressibility differences."
    ],
    learningObjectivesVi: [
      "Phân biệt giữa chất rắn, chất lỏng và chất khí bằng cách đo thể tích và kiểm tra tính chịu nén.",
      "Áp dụng Mô hình Hạt của Chất để giải thích hình dạng cố định, dòng chảy và sự khác biệt về tính nén."
    ],
    mappedCambridgeStandards: ["5Ch.01", "5Tw.01"],
    twsElements: [
      {
        id: "tws_4",
        stage: "Planning",
        stageVi: "Lên kế hoạch",
        description: "Design a fair test investigating how fluid viscosity changes under applied mechanical forces.",
        descriptionVi: "Thiết kế một thử nghiệm công bằng để nghiên cứu độ nhớt của chất lỏng thay đổi như thế nào dưới các lực cơ học tác dụng.",
        bloomCognitiveLevel: "Evaluating"
      }
    ],
    activities: [
      "Interactive Syringe Lab: Fill one syringe with sand (solid), one with water (liquid), and one with air (gas). Students compress each to measure resistance.",
      "Role-play Activity: Students stand close together, vibrate, glide, or run freely around the room to simulate particle behavior across the three states.",
      "Comparison Grid: Compile physical attributes (compressibility, shape, spacing, motion) into a research matrix."
    ],
    activitiesVi: [
      "Thí nghiệm bơm tiêm tương tác: Đổ đầy một bơm tiêm bằng cát (chất rắn), một bằng nước (chất lỏng) và một bằng không khí (chất khí). Học sinh nén từng cái để đo lực cản.",
      "Hoạt động đóng vai: Học sinh đứng sát nhau, rung động, trượt hoặc chạy tự do khắp phòng để mô phỏng hành vi của các hạt qua ba trạng thái.",
      "Bảng so sánh: Tổng hợp các thuộc tính vật lý (tính chịu nén, hình dạng, khoảng cách, chuyển động) vào một ma trận nghiên cứu."
    ],
    thinkingQuestions: [
      "Sand can flow out of a bottle like water, and it takes the shape of its container. Explain why sand is still classified as a solid using particle principles.",
      "Why does a gas expand to fill any container it is placed in, whereas liquids only fill the bottom?"
    ],
    thinkingQuestionsVi: [
      "Cát có thể chảy ra khỏi chai như nước và có hình dạng của bình chứa. Giải thích tại sao cát vẫn được phân loại là chất rắn bằng cách sử dụng các nguyên lý hạt.",
      "Tại sao chất khí lại giãn nở để lấp đầy bất kỳ bình chứa nào chứa nó, trong khi chất lỏng chỉ lấp đầy phần đáy?"
    ],
    teacherGuidance: "Be prepared for the misconception that particles themselves expand or shrink. Reinforce that only the spaces between the particles change. Emphasize that gas compressibility is possible because of the vast empty spaces.",
    teacherGuidanceVi: "Hãy chuẩn bị cho quan niệm sai lầm rằng bản thân các hạt tự nở ra hoặc co lại. Củng cố rằng chỉ có khoảng cách giữa các hạt thay đổi. Nhấn mạnh rằng tính nén của chất khí có thể thực hiện được là nhờ có những khoảng trống rỗng khổng lồ.",
    updatedAt: "2026-07-02T10:38:00Z"
  }
];
