export default function ErrorAlert({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rdb-notice rdb-notice--error" style={{ alignItems: "center", maxWidth: 680 }}>
      <div style={{ flex: 1 }}>{message}</div>
      {onRetry && (
        <button onClick={onRetry} className="rdb-btn rdb-btn--secondary rdb-btn--sm">
          Try again
        </button>
      )}
    </div>
  );
}
