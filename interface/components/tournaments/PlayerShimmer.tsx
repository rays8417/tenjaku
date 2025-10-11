export default function PlayerShimmer() {
  return (
    <div className="flex items-center justify-between py-5 px-5 border-b border-border/50 last:border-b-0 animate-pulse">
      <div className="flex items-center gap-4 flex-1">
        <div className="h-4 w-16 bg-surface-elevated rounded"></div>
        <div className="h-12 w-12 bg-surface-elevated rounded-xl"></div>
        <div className="flex-1">
          <div className="h-5 w-32 bg-surface-elevated rounded"></div>
        </div>
      </div>
      <div className="flex items-center gap-8">
        <div className="h-9 w-20 bg-surface-elevated rounded-xl"></div>
        <div className="h-8 w-20 bg-surface-elevated rounded-lg"></div>
      </div>
    </div>
  );
}

