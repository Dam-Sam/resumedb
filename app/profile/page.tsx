import { redirect } from "next/navigation";
import { loadProfile, type ProfileItem } from "@/lib/profile/repository";
import { SECTIONS, formatRange } from "@/lib/profile/sections";
import { createClient } from "@/lib/supabase/server";

// Read-only for now; editing arrives in a later build step.
export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { unreadable } = await searchParams;
  const profile = await loadProfile(supabase, user.id);
  const { contact } = profile;

  const skillsByCategory = new Map<string, string[]>();
  for (const s of profile.skills) {
    const key = s.category ?? "Skills";
    skillsByCategory.set(key, [...(skillsByCategory.get(key) ?? []), s.name]);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 space-y-10">
      <h1 className="text-2xl font-semibold">Profile</h1>

      {unreadable && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          We couldn&apos;t read your resume — please enter your information.
        </div>
      )}

      <Section title="Personal Information">
        <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
          <Field label="Name" value={contact?.full_name} />
          <Field label="Email" value={contact?.email} />
          <Field label="Phone" value={contact?.phone} />
          <Field label="Location" value={contact?.location} />
          {profile.links.map((l) => (
            <Field key={l.id} label={l.type} value={l.url} />
          ))}
        </dl>
        <h3 className="mt-6 text-sm font-medium">Background</h3>
        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
          {profile.background ?? <span className="text-gray-400">None yet</span>}
        </p>
      </Section>

      {SECTIONS.map((section) => {
        const items = profile.items.filter((i) => section.types.includes(i.type));
        if (!items.length) return null;
        return (
          <Section key={section.key} title={section.title}>
            <div className="space-y-6">
              {items.map((item) => (
                <Item key={item.id} item={item} />
              ))}
            </div>
          </Section>
        );
      })}

      {skillsByCategory.size > 0 && (
        <Section title="Skills">
          <dl className="space-y-2 text-sm">
            {[...skillsByCategory].map(([category, names]) => (
              <div key={category}>
                <dt className="font-medium">{category}</dt>
                <dd className="text-gray-700">{names.join(", ")}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}
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

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <>
      <dt className="capitalize text-gray-500">{label}</dt>
      <dd>{value || <span className="text-gray-400">—</span>}</dd>
    </>
  );
}

function Item({ item }: { item: ProfileItem }) {
  const dates = formatRange(item.start_date, item.end_date, item.is_current);
  const extras = Object.entries(item.details).map(([k, v]) => `${k}: ${v}`);
  return (
    <article>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-medium">
          {item.title}
          {item.organization && <span className="font-normal text-gray-600"> · {item.organization}</span>}
        </h3>
        {dates && <span className="text-sm text-gray-500">{dates}</span>}
      </div>
      {item.location && <p className="text-sm text-gray-500">{item.location}</p>}
      {extras.length > 0 && <p className="text-sm text-gray-500">{extras.join(" · ")}</p>}
      {item.description && <p className="mt-1 text-sm text-gray-700">{item.description}</p>}
      {item.bullets.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {item.bullets.map((b) => (
            <li key={b.id}>{b.body}</li>
          ))}
        </ul>
      )}
      {item.skills.length > 0 && (
        <p className="mt-2 text-xs text-gray-500">Skills: {item.skills.join(", ")}</p>
      )}
    </article>
  );
}
