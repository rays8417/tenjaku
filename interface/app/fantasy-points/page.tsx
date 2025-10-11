"use client";

export default function FantasyPointsPage() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            How Fantasy Points Work
          </h1>
          <p className="text-lg text-foreground-muted">
            Understand how your players earn points in every match
          </p>
        </div>

        {/* Introduction */}
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-2">The Basics</h3>
          <p className="text-foreground-muted leading-relaxed">
            Players earn fantasy points based on their real cricket performance in matches. 
            The better they perform with bat, ball, or in the field, the more points they score for your team!
          </p>
        </div>

        {/* Batting Points */}
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-6">Batting Points</h2>

          <div className="space-y-4">
            <div className="flex items-start justify-between py-3 border-b border-border">
              <div className="flex-1">
                <p className="font-medium text-foreground">Every run scored</p>
                <p className="text-sm text-foreground-muted mt-1">Each run adds to your score</p>
              </div>
              <span className="text-lg font-bold text-foreground">+1 point</span>
            </div>

            <div className="flex items-start justify-between py-3 border-b border-border">
              <div className="flex-1">
                <p className="font-medium text-foreground">Facing deliveries</p>
                <p className="text-sm text-foreground-muted mt-1">Every 2 balls faced</p>
              </div>
              <span className="text-lg font-bold text-foreground">+1 point</span>
            </div>

            <div className="bg-surface-elevated/50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground-muted uppercase tracking-wide">Milestone Bonuses</p>
              <div className="flex items-center justify-between">
                <span className="text-foreground">Half-century (50+ runs)</span>
                <span className="text-lg font-bold text-foreground">+8 bonus</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground">Century (100+ runs)</span>
                <span className="text-lg font-bold text-foreground">+16 bonus</span>
              </div>
            </div>

            <div className="bg-surface-elevated/50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground-muted uppercase tracking-wide">Strike Rate Bonuses (min. 10 balls)</p>
              <div className="flex items-center justify-between">
                <span className="text-foreground">Strike rate 100-149</span>
                <span className="text-lg font-bold text-foreground">+2 bonus</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground">Strike rate 150-199</span>
                <span className="text-lg font-bold text-foreground">+4 bonus</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground">Strike rate 200+</span>
                <span className="text-lg font-bold text-foreground">+6 bonus</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bowling Points */}
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-6">Bowling Points</h2>

          <div className="space-y-4">
            <div className="flex items-start justify-between py-3 border-b border-border">
              <div className="flex-1">
                <p className="font-medium text-foreground">Taking a wicket</p>
                <p className="text-sm text-foreground-muted mt-1">Each wicket is valuable!</p>
              </div>
              <span className="text-lg font-bold text-foreground">+25 points</span>
            </div>

            <div className="flex items-start justify-between py-3 border-b border-border">
              <div className="flex-1">
                <p className="font-medium text-foreground">Bowling overs</p>
                <p className="text-sm text-foreground-muted mt-1">Every 2 balls bowled (12 balls per over)</p>
              </div>
              <span className="text-lg font-bold text-foreground">+1 point</span>
            </div>

            <div className="bg-surface-elevated/50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground-muted uppercase tracking-wide">Wicket Haul Bonuses</p>
              <div className="flex items-center justify-between">
                <span className="text-foreground">3+ wickets in a match</span>
                <span className="text-lg font-bold text-foreground">+8 bonus</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground">5+ wickets (5-wicket haul)</span>
                <span className="text-lg font-bold text-foreground">+16 bonus</span>
              </div>
            </div>

            <div className="bg-surface-elevated/50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground-muted uppercase tracking-wide">Economy Rate Bonuses (min. 2 overs)</p>
              <div className="flex items-center justify-between">
                <span className="text-foreground">Economy under 8</span>
                <span className="text-lg font-bold text-foreground">+2 bonus</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground">Economy under 6</span>
                <span className="text-lg font-bold text-foreground">+4 bonus</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground">Economy under 4</span>
                <span className="text-lg font-bold text-foreground">+6 bonus</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fielding Points */}
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-6">Fielding Points</h2>

          <div className="space-y-4">
            <div className="flex items-start justify-between py-3 border-b border-border">
              <div className="flex-1">
                <p className="font-medium text-foreground">Catch taken</p>
                <p className="text-sm text-foreground-muted mt-1">Every catch counts</p>
              </div>
              <span className="text-lg font-bold text-foreground">+8 points</span>
            </div>

            <div className="flex items-start justify-between py-3 border-b border-border">
              <div className="flex-1">
                <p className="font-medium text-foreground">Stumping</p>
                <p className="text-sm text-foreground-muted mt-1">Quick wicket-keeping</p>
              </div>
              <span className="text-lg font-bold text-foreground">+10 points</span>
            </div>

            <div className="flex items-start justify-between py-3 border-b border-border">
              <div className="flex-1">
                <p className="font-medium text-foreground">Run out</p>
                <p className="text-sm text-foreground-muted mt-1">Direct hits or assists</p>
              </div>
              <span className="text-lg font-bold text-foreground">+6 points</span>
            </div>
          </div>
        </div>

        {/* Example Section */}
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Example Calculation</h2>
          <p className="text-foreground-muted mb-6">
            Let's see how a player's performance translates to fantasy points:
          </p>
          
          <div className="bg-surface-elevated/50 rounded-xl p-5 mb-4 border border-border">
            <p className="font-semibold text-foreground mb-3">Player Performance:</p>
            <ul className="space-y-2 text-foreground-muted">
              <li>• Scored 65 runs off 48 balls (strike rate: 135)</li>
              <li>• Took 2 wickets in 4 overs, conceding 28 runs (economy: 7)</li>
              <li>• Took 1 catch</li>
            </ul>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-foreground">
              <span>Batting: 65 runs + 24 balls bonus + 8 (50+) + 4 (SR 150+)</span>
              <span className="font-bold">= 101 pts</span>
            </div>
            <div className="flex items-center justify-between text-foreground">
              <span>Bowling: 50 wickets points + 8 overs bonus + 2 (economy)</span>
              <span className="font-bold">= 60 pts</span>
            </div>
            <div className="flex items-center justify-between text-foreground">
              <span>Fielding: 1 catch</span>
              <span className="font-bold">= 8 pts</span>
            </div>
            <div className="border-t-2 border-border pt-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-foreground">Total Fantasy Points</span>
                <span className="text-3xl font-bold text-foreground">169 pts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-foreground-muted">
            All points are calculated automatically after each match based on official cricket stats
          </p>
        </div>
      </div>
    </div>
  );
}

