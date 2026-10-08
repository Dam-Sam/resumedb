// Ported from resume-generator/theme.js (Office theme, Times New Roman).
// Word sizes are half-points (pt × 2); spacing is in twips (1440 = 1 inch).
// The PDF renderer reads the same tokens, converted to points.

export const colors = {
  dark1: "000000", // primary text
  dark2: "44546A", // slate: contact line, labels, tech stack
  accent1: "4472C4", // blue: section headings and their rule
  accent3: "A5A5A5", // grey: dates, separators
  hyperlink: "0563C1",
};

export const fonts = {
  major: "Times New Roman",
  minor: "Times New Roman",
};

export const fontSizes = {
  name: 44, // 22pt
  sectionHead: 26, // 13pt
  jobTitle: 22, // 11pt
  body: 20, // 10pt
  meta: 18, // 9pt
  label: 18, // 9pt
};

export const spacing = {
  beforeSection: 160,
  afterSection: 60,
  beforeJobTitle: 100,
  afterJobTitle: 30,
  afterContact: 60,
  afterSummary: 80,
  afterSkillRow: 40,
  bullet: { before: 20, after: 20 },
};

// US Letter, 0.6" top/bottom and 0.7" side margins.
export const page = {
  width: 12240,
  height: 15840,
  marginTop: 864,
  marginBottom: 864,
  marginLeft: 1008,
  marginRight: 1008,
};

export const sectionBorder = { style: "single", size: 6, color: colors.accent1, space: 1 } as const;

export const bulletConfig = { reference: "bullets", indent: { left: 560, hanging: 280 } };

// Helpers for the PDF: Word units → points.
export const pt = {
  fromHalfPoints: (n: number) => n / 2,
  fromTwips: (n: number) => n / 20,
};
