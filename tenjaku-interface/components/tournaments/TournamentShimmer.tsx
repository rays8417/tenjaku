export default function TournamentShimmer() {
  return (
    <div className="flex flex-col gap-2 p-4 border border-border rounded-lg animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-surface-elevated rounded"></div>
            <div className="h-4 w-16 bg-surface-elevated rounded"></div>
          </div>
          <div className="h-3 w-6 bg-surface-elevated rounded"></div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-16 bg-surface-elevated rounded"></div>
            <div className="h-6 w-6 bg-surface-elevated rounded"></div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-3 w-24 bg-surface-elevated rounded"></div>
          <div className="h-3 w-32 bg-surface-elevated rounded"></div>
        </div>
        <div className="h-6 w-16 bg-surface-elevated rounded-full"></div>
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
        <div className="h-3 w-20 bg-surface-elevated rounded"></div>
      </div>
    </div>
  );
}

