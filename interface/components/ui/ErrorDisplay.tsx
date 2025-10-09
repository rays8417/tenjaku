interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorDisplay({
  message,
  onRetry,
  className = "",
}: ErrorDisplayProps) {
  return (
    <div className={`text-center py-12 text-error ${className}`}>
      <svg
        className="mx-auto h-12 w-12 text-error mb-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <div className="font-medium">{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

