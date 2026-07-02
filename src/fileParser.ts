// Dynamic CDN Injectors to load heavy parsing libraries only when needed
function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.head.appendChild(script);
  });
}

// 1. PDF.js Loader & Parser
async function parsePDF(file: File): Promise<string> {
  // Load PDF.js from Cloudflare CDN
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
  
  const pdfjsLib = (window as any).pdfjsLib;
  if (!pdfjsLib) {
    throw new Error("PDF.js library failed to initialize.");
  }
  
  // Set workerSrc
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");
    fullText += `[Page ${i}]\n${pageText}\n\n`;
  }
  return fullText;
}

// 2. Mammoth (DOCX) Loader & Parser
async function parseDOCX(file: File): Promise<string> {
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js");
  
  const mammoth = (window as any).mammoth;
  if (!mammoth) {
    throw new Error("Mammoth.js library failed to initialize.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value || "";
}

// 3. SheetJS (XLSX/XLS) Loader & Parser
async function parseXLSX(file: File): Promise<string> {
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
  
  const XLSX = (window as any).XLSX;
  if (!XLSX) {
    throw new Error("SheetJS (XLSX) library failed to initialize.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  
  let fullText = "";
  workbook.SheetNames.forEach((sheetName: string) => {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    fullText += `[Sheet: ${sheetName}]\n${csv}\n\n`;
  });
  return fullText;
}

// 4. Plain Text/CSV/JSON Reader
function parseText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string || "");
    reader.onerror = () => reject(new Error("Failed to read text file."));
    reader.readAsText(file);
  });
}

// Main parser orchestrator
export async function parseDocumentFile(file: File): Promise<{ textContent: string; docType: "PDF" | "Excel" | "Word" }> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  
  let textContent = "";
  let docType: "PDF" | "Excel" | "Word" = "PDF";

  switch (extension) {
    case "pdf":
      textContent = await parsePDF(file);
      docType = "PDF";
      break;
    case "docx":
    case "doc":
      textContent = await parseDOCX(file);
      docType = "Word";
      break;
    case "xlsx":
    case "xls":
    case "csv":
      textContent = await parseXLSX(file);
      docType = "Excel";
      break;
    case "txt":
    case "md":
    case "json":
      textContent = await parseText(file);
      docType = "Word"; // Treat general notes as Word format in the UI
      break;
    default:
      // Try parsing as raw text as fallback
      textContent = await parseText(file);
      docType = "Word";
  }

  if (!textContent.trim()) {
    throw new Error("No text could be extracted from this document.");
  }

  return { textContent, docType };
}
