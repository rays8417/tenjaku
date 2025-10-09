import EmptyState from "../ui/EmptyState";

interface Holding {
  id: string;
  playerName: string;
  team: string;
  position: "BAT" | "BWL" | "AR" | "WK";
  price: number;
  change1h: number;
  shares: number;
  holdings: number;
  avatar: string;
}

interface HoldingsTableProps {
  holdings: Holding[];
  className?: string;
}

export default function HoldingsTable({ holdings, className = "" }: HoldingsTableProps) {
  return (
    <div className={`mt-8 bg-card border border-border rounded-lg shadow-sm overflow-hidden ${className}`}>
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-border bg-surface">
        <div className="col-span-4 text-xs uppercase tracking-wider text-foreground-muted font-medium">
          PLAYER
        </div>
        <div className="col-span-2 text-xs uppercase tracking-wider text-foreground-muted font-medium text-right">
          PRICE (BOSON)
        </div>
        <div className="col-span-2 text-xs uppercase tracking-wider text-foreground-muted font-medium text-right">
          1H
        </div>
        <div className="col-span-2 text-xs uppercase tracking-wider text-foreground-muted font-medium text-right">
          SHARES
        </div>
        <div className="col-span-2 text-xs uppercase tracking-wider text-foreground-muted font-medium text-right">
          HOLDINGS (BOSON)
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-border">
        {holdings.length === 0 ? (
          <EmptyState
            title="No players found matching your search."
            className="py-12"
          />
        ) : (
          holdings.map((holding) => (
            <div key={holding.id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-surface-elevated/50 transition-colors">
              <div className="col-span-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                  {holding.avatar}
                </div>
                <div>
                  <div className="font-medium text-foreground">{holding.playerName}</div>
                  <div className="text-sm text-foreground-muted">
                    {holding.team} • {holding.position}
                  </div>
                </div>
              </div>
              <div className="col-span-2 text-right">
                <div className="flex items-center justify-end gap-1">
                  <span className="font-medium text-foreground">
                    {holding.price.toFixed(6)}
                  </span>
                </div>
              </div>
              <div className="col-span-2 text-right">
                <span
                  className={`text-sm font-medium ${
                    holding.change1h >= 0 ? "text-success" : "text-error"
                  }`}
                >
                  {holding.change1h >= 0 ? "↑" : "↓"}
                  {Math.abs(holding.change1h).toFixed(2)}%
                </span>
              </div>
              <div className="col-span-2 text-right">
                <span className="font-medium text-foreground">
                  {holding.shares.toFixed(2)}
                </span>
              </div>
              <div className="col-span-2 text-right">
                <div className="flex items-center justify-end gap-1">
                  <span className="font-medium text-foreground">
                    {holding.holdings.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

