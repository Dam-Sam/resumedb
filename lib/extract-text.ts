import mammoth from "mammoth";
import { extractText as extractPdfText, getDocumentProxy } from "unpdf";

// Below this many characters we treat the resume as unreadable (e.g. a scanned image).
export const MIN_RESUME_CHARS = 200;

export type ResumeKind = "pdf" | "docx";

// Works out the file type from its name. Old .doc files aren't supported.
export function resumeKind(fileName: string): ResumeKind | null {
  const name = fileName.toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx")) return "docx";
  return null;
}

// Pulls the plain text out of a PDF or Word resume.
export async function extractText(data: ArrayBuffer, kind: ResumeKind): Promise<string> {
  if (kind === "pdf") {
    const pdf = await getDocumentProxy(new Uint8Array(data));
    const { text } = await extractPdfText(pdf, { mergePages: true });
    return text.trim();
  }
  const { value } = await mammoth.extractRawText({ buffer: Buffer.from(data) });
  return value.trim();
}
