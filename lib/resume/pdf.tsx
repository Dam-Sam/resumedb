import { Document, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { FinalItem, FinalResume } from "./final";
import { bulletConfig, colors, fontSizes, page, pt, spacing } from "./theme";

// The PDF twin of docx.ts: same FinalResume, same theme tokens.
// Built-in Times fonts stand in for Times New Roman.
const hex = (c: string) => `#${c}`;
const size = pt.fromHalfPoints;
const gap = pt.fromTwips;

const s = StyleSheet.create({
  page: {
    fontFamily: "Times-Roman",
    fontSize: size(fontSizes.body),
    color: hex(colors.dark1),
    paddingTop: gap(page.marginTop),
    paddingBottom: gap(page.marginBottom),
    paddingLeft: gap(page.marginLeft),
    paddingRight: gap(page.marginRight),
  },
  name: { fontFamily: "Times-Bold", fontSize: size(fontSizes.name), textAlign: "center" },
  contact: {
    fontSize: size(fontSizes.meta),
    color: hex(colors.dark2),
    textAlign: "center",
    marginTop: 2,
    marginBottom: gap(spacing.afterContact),
  },
  separator: { color: hex(colors.accent3) },
  sectionHead: {
    fontFamily: "Times-Bold",
    fontSize: size(fontSizes.sectionHead),
    color: hex(colors.accent1),
    borderBottomWidth: 0.75,
    borderBottomColor: hex(colors.accent1),
    paddingBottom: 1,
    marginTop: gap(spacing.beforeSection),
    marginBottom: gap(spacing.afterSection),
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: gap(spacing.beforeJobTitle),
    marginBottom: gap(spacing.afterJobTitle),
  },
  title: { fontFamily: "Times-Bold", fontSize: size(fontSizes.jobTitle) },
  link: { color: hex(colors.hyperlink), textDecoration: "underline" },
  dates: { fontFamily: "Times-Italic", fontSize: size(fontSizes.meta), color: hex(colors.accent3) },
  meta: {
    fontFamily: "Times-Italic",
    fontSize: size(fontSizes.meta),
    color: hex(colors.dark2),
    marginBottom: gap(spacing.afterJobTitle),
  },
  bullet: {
    flexDirection: "row",
    paddingLeft: gap(bulletConfig.indent.left - bulletConfig.indent.hanging),
    marginTop: gap(spacing.bullet.before),
    marginBottom: gap(spacing.bullet.after),
  },
  bulletDot: { width: gap(bulletConfig.indent.hanging) },
  bulletText: { flex: 1 },
  paragraph: { marginBottom: gap(spacing.afterSummary) },
  skillsRow: { marginBottom: gap(spacing.afterSkillRow) },
  skillsLabel: { fontFamily: "Times-Bold", fontSize: size(fontSizes.label), color: hex(colors.dark2) },
});

export function ResumePdf({ resume }: { resume: FinalResume }) {
  return (
    <Document title={resume.name}>
      <Page size="LETTER" style={s.page}>
        <Text style={s.name}>{resume.name}</Text>
        <Text style={s.contact}>
          {resume.contactParts.map((part, i) => (
            <Text key={i}>
              {part}
              {i < resume.contactParts.length - 1 && <Text style={s.separator}>{"  |  "}</Text>}
            </Text>
          ))}
        </Text>

        {resume.sections.map((section, i) => (
          <View key={i}>
            <Text style={s.sectionHead} minPresenceAhead={40}>
              {section.title}
            </Text>
            {section.kind === "summary" && <Text style={s.paragraph}>{section.text}</Text>}
            {section.kind === "skills" &&
              section.groups.map((g) => (
                <Text key={g.label} style={s.skillsRow}>
                  <Text style={s.skillsLabel}>{g.label}: </Text>
                  {g.names.join(", ")}
                </Text>
              ))}
            {section.kind === "items" && section.items.map((item, j) => <Item key={j} item={item} />)}
          </View>
        ))}
      </Page>
    </Document>
  );
}

function Item({ item }: { item: FinalItem }) {
  let title;
  let meta: string | null = null;
  if (item.type === "education") {
    title = <Text style={s.title}>{item.title}</Text>;
    meta = [item.organization, item.location].filter(Boolean).join(" — ") || null;
  } else if ((item.type === "project" || item.type === "open_source") && item.url) {
    title = (
      <Link src={item.url} style={[s.title, s.link]}>
        {item.title}
      </Link>
    );
  } else {
    const label =
      item.type === "project" || item.type === "open_source"
        ? item.title
        : [item.title, item.organization, item.location].filter(Boolean).join(" | ");
    title = <Text style={s.title}>{label}</Text>;
  }

  return (
    <View>
      <View style={s.titleRow} minPresenceAhead={30}>
        {title}
        {item.dates && <Text style={s.dates}>{item.dates}</Text>}
      </View>
      {meta && <Text style={s.meta}>{meta}</Text>}
      {item.tech.length > 0 && <Text style={s.meta}>{item.tech.join(", ")}</Text>}
      {item.description && <Text style={s.paragraph}>{item.description}</Text>}
      {item.bullets.map((b, i) => (
        <View key={i} style={s.bullet} wrap={false}>
          <Text style={s.bulletDot}>•</Text>
          <Text style={s.bulletText}>{b}</Text>
        </View>
      ))}
    </View>
  );
}
