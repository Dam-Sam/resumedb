import { redirect } from "next/navigation";
import AddSection from "@/components/profile/AddSection";
import ImportResume from "@/components/profile/ImportResume";
import ContactEditor from "@/components/profile/ContactEditor";
import ItemEditor from "@/components/profile/ItemEditor";
import SkillsEditor from "@/components/profile/SkillsEditor";
import { loadProfile } from "@/lib/profile/repository";
import { SECTIONS } from "@/lib/profile/sections";
import { createClient } from "@/lib/supabase/server";

// Always shown, even when empty, so there's somewhere to start typing.
const CORE_SECTIONS = ["experience", "projects", "education"];

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { unreadable } = await searchParams;
  const profile = await loadProfile(supabase, user.id);

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="mt-1 text-sm text-gray-600">
          Everything tailoring draws from. Fix anything that&apos;s wrong; changes save as you go.
        </p>
      </div>

      {unreadable && (
        <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          We couldn&apos;t read your resume — please enter your information.
        </div>
      )}

      <Section title="Import a resume">
        <ImportResume />
      </Section>

      <Section title="Personal Information">
        <ContactEditor profile={profile} />
      </Section>

      {SECTIONS.map((section) => {
        const items = profile.items.filter((i) => section.types.includes(i.type));
        if (!items.length && !CORE_SECTIONS.includes(section.key)) return null;
        return (
          <Section key={section.key} title={section.title}>
            <div className="space-y-4">
              {items.map((item) => (
                <ItemEditor key={item.id} item={item} />
              ))}
              {!items.length && <p className="text-sm text-gray-500">Nothing here yet.</p>}
              <AddSection types={section.types} label="Add entry" />
            </div>
          </Section>
        );
      })}

      <Section title="Skills">
        <SkillsEditor skills={profile.skills} />
      </Section>

      <Section title="Add a section">
        <p className="mb-3 text-sm text-gray-600">Certifications, awards, publications, languages and more.</p>
        <AddSection label="Add" />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
