export default function TournamentShimmer() {
  return (
    <div className="flex flex-col gap-4 p-5 border-2 border-border rounded-xl animate-pulse bg-gradient-to-br from-surface to-card shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="h-10 w-10 bg-surface-elevated rounded-lg"></div>
          <div className="h-5 flex-1 bg-surface-elevated rounded"></div>
        </div>
        <div className="h-4 w-8 bg-surface-elevated rounded-lg"></div>
        <div className="flex items-center gap-3 flex-1">
          <div className="h-5 flex-1 bg-surface-elevated rounded"></div>
          <div className="h-10 w-10 bg-surface-elevated rounded-lg"></div>
        </div>
      </div>
      <div className="flex flex-col gap-3 pt-3 border-t border-border/50">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 bg-surface-elevated rounded"></div>
          <div className="h-7 w-20 bg-surface-elevated rounded-full"></div>
        </div>
        <div className="h-4 w-full bg-surface-elevated rounded-lg"></div>
        <div className="h-4 w-3/4 bg-surface-elevated rounded-lg"></div>
        <div className="flex items-center justify-between mt-1 pt-3 border-t border-border/50">
          <div className="h-6 w-32 bg-surface-elevated rounded"></div>
        </div>
      </div>
    </div>
  );
}

