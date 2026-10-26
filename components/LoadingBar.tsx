// An indeterminate progress line for while the AI is working, with words for what's happening.
export default function LoadingBar({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite">
      <p className="rdb-muted" style={{ margin: "0 0 12px" }}>
        {label}
      </p>
      <div className="rdb-progress" />
    </div>
  );
}
