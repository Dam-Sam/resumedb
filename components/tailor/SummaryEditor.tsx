"use client";

export default function SummaryEditor({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  return (
    <textarea
      aria-label="Tailored summary"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="field-sizing-content w-full resize-none rounded-md border border-gray-300 bg-white p-3 text-sm"
    />
  );
}
