export default function PlayerShimmer() {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-4 w-8 bg-surface-elevated rounded"></div>
        <div className="h-9 w-9 bg-surface-elevated rounded"></div>
        <div className="space-y-1">
          <div className="h-4 w-24 bg-surface-elevated rounded"></div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-8 bg-surface-elevated rounded"></div>
            <div className="h-3 w-16 bg-surface-elevated rounded"></div>
            <div className="h-3 w-12 bg-surface-elevated rounded"></div>
            <div className="h-3 w-10 bg-surface-elevated rounded"></div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="h-4 w-12 bg-surface-elevated rounded"></div>
        <div className="h-8 w-12 bg-surface-elevated rounded"></div>
      </div>
    </div>
  );
}

