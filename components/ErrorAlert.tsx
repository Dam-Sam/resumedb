export default function ErrorAlert({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-4 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900">
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="shrink-0 rounded-md border border-red-300 bg-white px-3 py-1.5">
          Retry
        </button>
      )}
    </div>
  );
}
