"use client";

import { useState } from "react";
import * as actions from "@/app/profile/actions";
import { LINK_TYPES } from "@/lib/ai/schemas";
import type { Profile } from "@/lib/profile/repository";
import { inputClass, SaveStatus, smallButton, useSave } from "./useSave";

// Personal Information: contact fields and background save when you leave the field.
export default function ContactEditor({ profile }: { profile: Profile }) {
  const [contact, setContact] = useState({
    full_name: profile.contact?.full_name ?? "",
    email: profile.contact?.email ?? "",
    phone: profile.contact?.phone ?? "",
    location: profile.contact?.location ?? "",
  });
  const [background, setBackground] = useState(profile.background ?? "");
  const contactSave = useSave();
  const backgroundSave = useSave();

  const field = (key: keyof typeof contact, label: string, type = "text") => (
    <label className="block text-sm">
      <span className="text-gray-600">{label}</span>
      <input
        type={type}
        value={contact[key]}
        onChange={(e) => setContact({ ...contact, [key]: e.target.value })}
        onBlur={() => contactSave.save(() => actions.saveContact(contact))}
        className={`mt-1 ${inputClass}`}
      />
    </label>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {field("full_name", "Name")}
        {field("email", "Email", "email")}
        {field("phone", "Phone", "tel")}
        {field("location", "Location")}
      </div>
      <SaveStatus message={contactSave.message} isError={contactSave.isError} />

      <div>
        <h3 className="text-sm font-medium">Links</h3>
        <div className="mt-2 space-y-2">
          {profile.links.map((l) => (
            <LinkRow key={l.id} link={l} />
          ))}
          <NewLink />
        </div>
      </div>

      <label className="block text-sm">
        <span className="font-medium">Background</span>
        <span className="block text-gray-600">Who you are and what you&apos;re looking for. Used for tailored summaries.</span>
        <textarea
          rows={4}
          value={background}
          onChange={(e) => setBackground(e.target.value)}
          onBlur={() => backgroundSave.save(() => actions.saveBackground(background))}
          className={`mt-1 ${inputClass}`}
        />
      </label>
      <SaveStatus message={backgroundSave.message} isError={backgroundSave.isError} />
    </div>
  );
}

function LinkRow({ link }: { link: Profile["links"][number] }) {
  const [type, setType] = useState(link.type);
  const [url, setUrl] = useState(link.url);
  const { save, pending, message, isError } = useSave();
  const persist = (t = type) => save(() => actions.saveLink(link.id, t, url));

  return (
    <div className="flex items-center gap-2">
      <TypeSelect
        value={type}
        onChange={(t) => {
          setType(t);
          persist(t);
        }}
      />
      <input value={url} onChange={(e) => setUrl(e.target.value)} onBlur={() => persist()} className={inputClass} />
      <button disabled={pending} onClick={() => save(() => actions.removeLink(link.id))} className={smallButton}>
        Remove
      </button>
      <SaveStatus message={isError ? message : null} isError={isError} />
    </div>
  );
}

function NewLink() {
  const [type, setType] = useState("github");
  const [url, setUrl] = useState("");
  const { save, pending, message, isError } = useSave();
  return (
    <div className="flex items-center gap-2">
      <TypeSelect value={type} onChange={setType} />
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className={inputClass} />
      <button disabled={pending} onClick={() => save(() => actions.addLink(type, url), () => setUrl(""))} className={smallButton}>
        Add link
      </button>
      <SaveStatus message={isError ? message : null} isError={isError} />
    </div>
  );
}

function TypeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm">
      {LINK_TYPES.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}
