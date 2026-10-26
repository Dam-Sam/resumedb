"use client";

export default function SummaryEditor({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  return <textarea aria-label="Tailored summary" className="ws-summary" value={value} onChange={(e) => onChange(e.target.value)} />;
}
