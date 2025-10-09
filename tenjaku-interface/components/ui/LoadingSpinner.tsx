interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export default function LoadingSpinner({
  size = "md",
  text,
  className = "",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className={`text-center py-12 ${className}`}>
      <div
        className={`inline-block animate-spin rounded-full border-b-2 border-primary ${sizeClasses[size]}`}
      ></div>
      {text && <div className="text-foreground-muted mt-2">{text}</div>}
    </div>
  );
}

