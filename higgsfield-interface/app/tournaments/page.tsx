"use client";

import { useMemo, useState } from "react";

type Role = "Overview" | "Batsmen" | "Bowlers" | "All-rounders" | "Wicketkeepers";

interface PlayerRow {
  id: string;
  name: string;
  team: string;
  role: Exclude<Role, "Overview">;
  price: string;
  points: number;
}

export default function TournamentsPage() {
  const [activeTab, setActiveTab] = useState<Role>("Overview");
  const [query, setQuery] = useState("");

  const players = useMemo<PlayerRow[]>(
    () => [
      { id: "p1", name: "Virat Kohli", team: "IND", role: "Batsmen", price: "₹9.5m", points: 206 },
      { id: "p2", name: "Rohit Sharma", team: "IND", role: "Batsmen", price: "₹9.0m", points: 199 },
      { id: "p3", name: "Ben Stokes", team: "ENG", role: "All-rounders", price: "₹9.2m", points: 184 },
      { id: "p4", name: "Jasprit Bumrah", team: "IND", role: "Bowlers", price: "₹8.8m", points: 172 },
      { id: "p5", name: "Mitchell Starc", team: "AUS", role: "Bowlers", price: "₹8.7m", points: 165 },
      { id: "p6", name: "Jos Buttler", team: "ENG", role: "Wicketkeepers", price: "₹9.1m", points: 158 },
      { id: "p7", name: "Hardik Pandya", team: "IND", role: "All-rounders", price: "₹8.9m", points: 151 },
      { id: "p8", name: "Kane Williamson", team: "NZ", role: "Batsmen", price: "₹8.6m", points: 140 },
    ],
    []
  );

  const visiblePlayers = players.filter((p) => {
    const matchesTab = activeTab === "Overview" ? true : p.role === activeTab;
    const matchesQuery = query.trim()
      ? p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.team.toLowerCase().includes(query.toLowerCase())
      : true;
    return matchesTab && matchesQuery;
  });

  const TabButton = ({ label }: { label: Role }) => (
    <button
      onClick={() => setActiveTab(label)}
      className={`rounded-full px-4 py-2 text-sm border transition-colors ${
        activeTab === label
          ? "bg-black text-white border-transparent shadow-sm"
          : "border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300"
      }`}
    >
      {label}
    </button>
  );

  const PlayerItem = ({ player, index }: { player: PlayerRow; index: number }) => (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50 transition-colors shadow-sm">
      <div className="flex items-center gap-4">
        <div className="text-xs w-6 text-gray-500 font-medium">{String(index + 1).padStart(2, "0")}</div>
        <div className="relative h-10 w-10 shrink-0 rounded-full bg-gray-600 flex items-center justify-center font-semibold text-white text-sm">
          {player.name.split(" ").map((n) => n[0]).join("")}
        </div>
        <div>
          <div className="font-medium text-black">{player.name}</div>
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span>{player.team}</span>
            <span className="inline-block h-1 w-1 rounded-full bg-gray-300" />
            <span>{player.role}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-xs text-gray-500 font-medium">{player.price}</div>
        <div className="rounded-full bg-black text-white text-xs font-medium px-3 py-1.5">
          {player.points}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen px-4 sm:px-8 py-6 sm:py-10 bg-gray-50">
      <div className="mx-auto max-w-[1200px] grid grid-cols-12 gap-6">
        {/* Left Sidebar */}
        <aside className="col-span-12 md:col-span-3 flex flex-col gap-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-gray-600">Cricket Tournament</p>
                <h2 className="text-xl font-semibold mt-1 text-black">Silver League</h2>
              </div>
              <div className="h-10 w-10 rounded-lg bg-black text-white flex items-center justify-center font-bold">C</div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-2xl font-semibold text-black">TP 3,096,340</div>
                <p className="text-xs text-gray-500 mt-1">4/6 matches remaining</p>
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: "33%" }} />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Subs 0/5</span>
                  <span>Current Rewards: TP +0</span>
                </div>
              </div>
            </div>
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="text-xs font-medium text-red-600 mb-3">NOT QUALIFIED</div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-gray-600 mb-1">Active Players</div>
                  <div className="font-medium text-black">0/5</div>
                </div>
                <div>
                  <div className="text-gray-600 mb-1">Total Points</div>
                  <div className="font-medium text-black">0/200</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-black mb-4">Fixtures</h3>
            <div className="space-y-3">
              {[{ a: "IND", b: "AUS" }, { a: "ENG", b: "NZ" }, { a: "SA", b: "PAK" }].map((f, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <div className="flex items-center gap-2 text-sm font-medium text-black">
                    <span className="h-2 w-2 bg-gray-400 rounded-full" />
                    {f.a}
                  </div>
                  <div className="text-xs text-gray-500 font-medium">vs</div>
                  <div className="flex items-center gap-2 text-sm font-medium text-black">
                    {f.b}
                    <span className="h-2 w-2 bg-gray-400 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Center Content */}
        <section className="col-span-12 md:col-span-9">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-black">Performance</h2>
            </div>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="relative flex-1">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search players..."
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors"
                />
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">⌕</div>
              </div>
              <button className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors">
                ⚙︎
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {(["Overview", "Batsmen", "Bowlers", "All-rounders", "Wicketkeepers"] as Role[]).map((r) => (
                <TabButton key={r} label={r} />
              ))}
            </div>

            <div className="space-y-3">
              <div className="text-xs uppercase tracking-wider text-gray-500 font-medium px-1">
                {activeTab === "Overview" ? "Players" : activeTab}
              </div>
              <div className="space-y-2">
                {visiblePlayers.map((p, idx) => (
                  <PlayerItem key={p.id} player={p} index={idx} />
                ))}
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

