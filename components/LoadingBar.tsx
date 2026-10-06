// An indeterminate progress bar for while the AI is working.
export default function LoadingBar({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-2">
      <p className="text-sm text-gray-600">{label}</p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div className="h-full w-1/3 animate-[loading_1.2s_ease-in-out_infinite] rounded-full bg-gray-900" />
      </div>
    </div>
  );
}
