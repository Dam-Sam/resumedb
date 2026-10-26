"use client";

import { X } from "lucide-react";
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
    <label>
      <span className="rdb-label">{label}</span>
      <input
        type={type}
        value={contact[key]}
        onChange={(e) => setContact({ ...contact, [key]: e.target.value })}
        onBlur={() => contactSave.save(() => actions.saveContact(contact))}
        className={inputClass}
      />
    </label>
  );

  return (
    <div>
      <div className="pf-g2">
        {field("full_name", "Name")}
        {field("email", "Email", "email")}
        {field("phone", "Phone", "tel")}
        {field("location", "Location")}
      </div>
      <div style={{ marginTop: 8 }}>
        <SaveStatus message={contactSave.message} isError={contactSave.isError} />
      </div>

      <div style={{ marginTop: 20 }}>
        <span className="rdb-label">Links</span>
        {profile.links.map((l) => (
          <LinkRow key={l.id} link={l} />
        ))}
        <NewLink />
      </div>

      <label style={{ display: "block", marginTop: 20 }}>
        <span className="rdb-label">About you</span>
        <span className="rdb-help">Who you are and what you&apos;re looking for. Used only for tailored summaries.</span>
        <textarea
          rows={3}
          value={background}
          onChange={(e) => setBackground(e.target.value)}
          onBlur={() => backgroundSave.save(() => actions.saveBackground(background))}
          className="rdb-textarea"
        />
      </label>
      <div style={{ marginTop: 8 }}>
        <SaveStatus message={backgroundSave.message} isError={backgroundSave.isError} />
      </div>
    </div>
  );
}

function LinkRow({ link }: { link: Profile["links"][number] }) {
  const [type, setType] = useState(link.type);
  const [url, setUrl] = useState(link.url);
  const { save, pending, message, isError } = useSave();
  const persist = (t = type) => save(() => actions.saveLink(link.id, t, url));

  return (
    <div className="pf-linkrow">
      <TypeSelect
        value={type}
        onChange={(t) => {
          setType(t);
          persist(t);
        }}
      />
      <input value={url} onChange={(e) => setUrl(e.target.value)} onBlur={() => persist()} className={inputClass} />
      <button disabled={pending} onClick={() => save(() => actions.removeLink(link.id))} className="rdb-iconbtn" aria-label="Remove link">
        <X className="rdb-icon" aria-hidden />
      </button>
      {isError && (
        <div style={{ gridColumn: "1 / -1" }}>
          <SaveStatus message={message} isError />
        </div>
      )}
    </div>
  );
}

function NewLink() {
  const [type, setType] = useState("github");
  const [url, setUrl] = useState("");
  const { save, pending, message, isError } = useSave();
  return (
    <div className="pf-linkrow">
      <TypeSelect value={type} onChange={setType} />
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className={inputClass} />
      <button disabled={pending} onClick={() => save(() => actions.addLink(type, url), () => setUrl(""))} className={smallButton}>
        Add link
      </button>
      {isError && (
        <div style={{ gridColumn: "1 / -1" }}>
          <SaveStatus message={message} isError />
        </div>
      )}
    </div>
  );
}

function TypeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="rdb-select">
      {LINK_TYPES.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}
