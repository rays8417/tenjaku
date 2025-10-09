interface ShimmerProps {
  className?: string;
  count?: number;
  type?: "line" | "circle" | "rectangle";
}

export function Shimmer({ className = "", type = "line" }: ShimmerProps) {
  const baseClass = "bg-surface-elevated rounded animate-pulse";
  
  const typeClasses = {
    line: "h-4 w-full",
    circle: "h-10 w-10 rounded-full",
    rectangle: "h-24 w-full",
  };

  return <div className={`${baseClass} ${typeClasses[type]} ${className}`} />;
}

export function ShimmerGroup({ count = 3, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Shimmer key={i} />
      ))}
    </div>
  );
}

