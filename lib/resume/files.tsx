import type { FinalResume } from "./final";

// Builds the Word or PDF file in the browser. The renderers are loaded only
// when needed, so they don't slow down the page.
export async function buildResumeFile(final: FinalResume, ext: "docx" | "pdf"): Promise<Blob> {
  if (ext === "docx") {
    const [{ Packer }, { buildDocx }] = await Promise.all([import("docx"), import("./docx")]);
    return Packer.toBlob(buildDocx(final));
  }
  const [{ pdf }, { ResumePdf }] = await Promise.all([import("@react-pdf/renderer"), import("./pdf")]);
  return pdf(<ResumePdf resume={final} />).toBlob();
}

export function saveFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// How many pages the PDF download would be. Each page is one "/Type /Page" object.
export async function countPdfPages(final: FinalResume): Promise<number> {
  const text = await (await buildResumeFile(final, "pdf")).text();
  return text.match(/\/Type\s*\/Page(?!s)/g)?.length ?? 1;
}
