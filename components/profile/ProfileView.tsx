import { redirect } from "next/navigation";
import Link from "next/link";
import OnboardingSteps from "@/components/onboarding/OnboardingSteps";
import AddSection from "@/components/profile/AddSection";
import ImportResume from "@/components/profile/ImportResume";
import ContactEditor from "@/components/profile/ContactEditor";
import ItemEditor from "@/components/profile/ItemEditor";
import { OpenEntryProvider } from "@/components/profile/OpenEntry";
import SkillsEditor from "@/components/profile/SkillsEditor";
import { loadProfile } from "@/lib/profile/repository";
import { SECTIONS } from "@/lib/profile/sections";
import { createClient } from "@/lib/supabase/server";

// Always shown, even when empty, so there's somewhere to start typing.
const CORE_SECTIONS = ["experience", "projects", "education"];

const SECTION_BLURBS: Record<string, string> = {
  experience: "Work, volunteer and research.",
  projects: "Projects and open source.",
  education: "Degrees and schools.",
  certifications: "Certifications and licenses.",
  awards: "Awards and honours.",
  publications: "Papers and articles.",
  languages: "Languages you speak.",
  other: "Anything else worth showing.",
};

// The profile editor. During onboarding (step 2) it drops the import section and ends with a Continue button.
export default async function ProfileView({ onboarding = false }: { onboarding?: boolean }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const profile = await loadProfile(supabase, user.id);

  const sections = SECTIONS.map((section) => ({
    ...section,
    items: profile.items.filter((i) => section.types.includes(i.type)),
  })).filter((s) => s.items.length || CORE_SECTIONS.includes(s.key));

  const toc: { id: string; label: string; count?: number }[] = [
    ...(onboarding ? [] : [{ id: "import", label: "Import a resume" }]),
    { id: "personal", label: "Personal information" },
    ...sections.map((s) => ({ id: s.key, label: s.title, count: s.items.length })),
    { id: "skills", label: "Skills", count: profile.skills.length },
    { id: "add-section", label: "Add a section" },
  ];

  const layout = (
    <div className="pf-layout">
      <aside className="pf-side">
        <p className="rdb-eyebrow">On this page</p>
        <ul className="pf-toc">
          {toc.map((t) => (
            <li key={t.id}>
              <a href={`#${t.id}`}>
                {t.label}
                <span>{t.count}</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="pf-tip">
          <b>Tip</b>
          <p>The more you put here, the better each tailoring. Tailoring only ever picks from this page.</p>
        </div>
      </aside>

      <main className="pf-main">
        <div className="rdb-pagehead">
          <div>
            <h1 className="rdb-h1">{onboarding ? "Check your profile" : "Your profile"}</h1>
            <p className="rdb-lede">Everything tailoring draws from. {onboarding ? "This is what we read from your resume. " : ""}Fix anything that&apos;s wrong; most fields save when you leave them.</p>
          </div>
        </div>

        <OpenEntryProvider>
          {!onboarding && (
            <Section id="import" title="Import a resume" sub="Have a newer resume? Add its entries to your profile, or start over from it.">
              <ImportResume />
            </Section>
          )}

          <Section id="personal" title="Personal information">
            <ContactEditor profile={profile} />
          </Section>

          {sections.map((section) => (
            <Section key={section.key} id={section.key} title={section.title} sub={SECTION_BLURBS[section.key]}>
              {section.items.map((item) => (
                <ItemEditor key={item.id} item={item} />
              ))}
              {!section.items.length && <p className="rdb-muted" style={{ margin: 0 }}>Nothing here yet.</p>}
              <AddSection types={section.types} label="Add entry" />
            </Section>
          ))}

          <Section id="skills" title="Skills" sub="Every skill you have, grouped by category. Tailoring sorts them for each job.">
            <SkillsEditor skills={profile.skills} />
          </Section>

          <Section id="add-section" title="Add a section" sub="Certifications, awards, publications, languages and more.">
            <AddSection label="Add entry" />
          </Section>
        </OpenEntryProvider>

        {onboarding && (
          <div className="rdb-actions" style={{ marginTop: 32 }}>
            <Link href="/onboarding/tailor" className="rdb-btn rdb-btn--primary">
              Looks good, continue
            </Link>
            <span className="rdb-small rdb-muted">You can edit your profile any time from the Profile tab.</span>
          </div>
        )}
      </main>
    </div>
  );

  if (!onboarding) return layout;
  return (
    <>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 32px 0" }}>
        <OnboardingSteps current={1} />
      </div>
      {layout}
    </>
  );
}

function Section({ id, title, sub, children }: { id: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="rdb-section">
      <div className="rdb-section__head">
        <div>
          <h2 className="rdb-h2">{title}</h2>
          {sub && <p className="rdb-sub">{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
