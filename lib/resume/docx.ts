import {
  AlignmentType,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  Paragraph,
  Tab,
  TabStopType,
  TextRun,
  type ParagraphChild,
} from "docx";
import type { FinalItem, FinalResume } from "./final";
import { bulletConfig, colors, fonts, fontSizes, page, sectionBorder, spacing } from "./theme";

// FinalResume → Word document, laid out like resume-generator/build.js.
export function buildDocx(resume: FinalResume): Document {
  const children: Paragraph[] = [nameHeading(resume.name), contactLine(resume.contactParts)];

  for (const section of resume.sections) {
    children.push(sectionHeading(section.title));
    if (section.kind === "summary") children.push(summaryParagraph(section.text));
    if (section.kind === "skills") {
      for (const g of section.groups) children.push(skillsRow(g.label, g.names));
    }
    if (section.kind === "items") {
      for (const item of section.items) children.push(...itemParagraphs(item));
    }
  }

  return new Document({
    styles: {
      default: { document: { run: { font: fonts.minor, size: fontSizes.body, color: colors.dark1 } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: fonts.major, size: fontSizes.name, bold: true, color: colors.dark1 },
          paragraph: { spacing: { before: 0, after: spacing.afterContact }, outlineLevel: 0 },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: fonts.major, size: fontSizes.sectionHead, bold: true, color: colors.accent1 },
          paragraph: {
            spacing: { before: spacing.beforeSection, after: spacing.afterSection },
            outlineLevel: 1,
            border: { bottom: sectionBorder },
          },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: fonts.minor, size: fontSizes.jobTitle, bold: true, color: colors.dark1 },
          paragraph: { spacing: { before: spacing.beforeJobTitle, after: spacing.afterJobTitle }, outlineLevel: 2 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: bulletConfig.reference,
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: bulletConfig.indent, spacing: spacing.bullet } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: page.width, height: page.height },
            margin: { top: page.marginTop, bottom: page.marginBottom, left: page.marginLeft, right: page.marginRight },
          },
        },
        children,
      },
    ],
  });
}

function itemParagraphs(item: FinalItem): Paragraph[] {
  const out: Paragraph[] = [];

  if (item.type === "education") {
    out.push(titleRow(titleRun(item.title), item.dates));
    const where = [item.organization, item.location].filter(Boolean).join(" — ");
    if (where) out.push(metaLine(where));
  } else if (item.type === "project" || item.type === "open_source") {
    const title = item.url
      ? [new ExternalHyperlink({ link: item.url, children: [titleRun(item.title, colors.hyperlink, true)] })]
      : [titleRun(item.title)];
    out.push(titleRow(title, item.dates));
  } else {
    const label = [item.title, item.organization, item.location].filter(Boolean).join(" | ");
    out.push(titleRow([titleRun(label)], item.dates));
  }

  if (item.tech.length) out.push(metaLine(item.tech.join(", ")));
  if (item.description) out.push(summaryParagraph(item.description));
  for (const b of item.bullets) out.push(bullet(b));
  return out;
}

function nameHeading(name: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: name, font: fonts.major, size: fontSizes.name, bold: true, color: colors.dark1 })],
  });
}

// Email | Phone | links
function contactLine(parts: string[]) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: spacing.afterContact },
    children: parts.flatMap((part, i) => {
      const runs = [new TextRun({ text: part, font: fonts.minor, size: fontSizes.meta, color: colors.dark2 })];
      if (i < parts.length - 1) {
        runs.push(new TextRun({ text: "  |  ", font: fonts.minor, size: fontSizes.meta, color: colors.accent3 }));
      }
      return runs;
    }),
  });
}

function sectionHeading(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, font: fonts.major, size: fontSizes.sectionHead, bold: true, color: colors.accent1 })],
  });
}

function titleRun(text: string, color = colors.dark1, underline = false) {
  return new TextRun({
    text,
    font: fonts.minor,
    size: fontSizes.jobTitle,
    bold: true,
    color,
    ...(underline ? { underline: {} } : {}),
  });
}

// Title on the left, dates right-aligned via a tab stop.
function titleRow(left: ParagraphChild | ParagraphChild[], dates: string | null) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    tabStops: [{ type: TabStopType.RIGHT, position: page.width - page.marginLeft - page.marginRight }],
    children: [
      ...(Array.isArray(left) ? left : [left]),
      ...(dates
        ? [
            new TextRun({ children: [new Tab()] }),
            new TextRun({ text: dates, font: fonts.minor, size: fontSizes.meta, color: colors.accent3, italics: true }),
          ]
        : []),
    ],
  });
}

// Italic slate line: tech stack, or school — location.
function metaLine(text: string) {
  return new Paragraph({
    spacing: { before: 0, after: spacing.afterJobTitle },
    children: [new TextRun({ text, font: fonts.minor, size: fontSizes.meta, italics: true, color: colors.dark2 })],
  });
}

function bullet(text: string) {
  return new Paragraph({
    numbering: { reference: bulletConfig.reference, level: 0 },
    children: [new TextRun({ text, font: fonts.minor, size: fontSizes.body, color: colors.dark1 })],
  });
}

function skillsRow(label: string, names: string[]) {
  return new Paragraph({
    spacing: { before: 0, after: spacing.afterSkillRow },
    children: [
      new TextRun({ text: `${label}: `, font: fonts.minor, size: fontSizes.label, bold: true, color: colors.dark2 }),
      new TextRun({ text: names.join(", "), font: fonts.minor, size: fontSizes.body, color: colors.dark1 }),
    ],
  });
}

function summaryParagraph(text: string) {
  return new Paragraph({
    spacing: { before: 0, after: spacing.afterSummary },
    children: [new TextRun({ text, font: fonts.minor, size: fontSizes.body, color: colors.dark1 })],
  });
}
