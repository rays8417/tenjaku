"use client";

import { useState } from "react";

interface Holding {
  id: string;
  playerName: string;
  team: string;
  position: "BAT" | "BWL" | "AR" | "WK"; // Batsman, Bowler, All-rounder, Wicket-keeper
  price: number;
  change1h: number;
  shares: number;
  holdings: number;
  avatar: string;
}

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock portfolio data
  const portfolioValue = 4.43;
  const portfolioChange = 0; // 0% change

  // Mock holdings data
  const holdings: Holding[] = [
    {
      id: "1",
      playerName: "Virat Kohli",
      team: "IND",
      position: "BAT",
      price: 0.165,
      change1h: 0,
      shares: 16.7,
      holdings: 2.76,
      avatar: "VK"
    },
    {
      id: "2", 
      playerName: "Jos Buttler",
      team: "ENG",
      position: "WK",
      price: 0.119,
      change1h: 0,
      shares: 8.71,
      holdings: 1.03,
      avatar: "JB"
    },
    {
      id: "3",
      playerName: "Jasprit Bumrah",
      team: "IND", 
      position: "BWL",
      price: 0.0919,
      change1h: 0,
      shares: 6.94,
      holdings: 0.64,
      avatar: "JB"
    },
    {
      id: "4",
      playerName: "Ben Stokes",
      team: "ENG",
      position: "AR",
      price: 0.142,
      change1h: 2.1,
      shares: 5.2,
      holdings: 0.74,
      avatar: "BS"
    },
    {
      id: "5",
      playerName: "Babar Azam",
      team: "PAK",
      position: "BAT",
      price: 0.135,
      change1h: -1.5,
      shares: 7.8,
      holdings: 1.05,
      avatar: "BA"
    }
  ];

  const filteredHoldings = holdings.filter(holding =>
    holding.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    holding.team.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Chart data points for the line graph
  const chartPoints = [
    { x: 0, y: 40 },
    { x: 20, y: 45 },
    { x: 40, y: 42 },
    { x: 60, y: 48 },
    { x: 80, y: 46 },
    { x: 100, y: 52 },
    { x: 120, y: 50 },
    { x: 140, y: 55 },
    { x: 160, y: 58 },
    { x: 180, y: 62 },
    { x: 200, y: 65 }
  ];

  const pathData = chartPoints.map((point, index) => 
    index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
  ).join(' ');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-black">Inventory</h1>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Section - Chart */}
          <div className="col-span-8">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              {/* Chart Header */}
              <div className="flex items-center gap-6 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">My Squad Value</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                  <span className="text-sm text-gray-600">Total Volume</span>
                </div>
              </div>

              {/* Chart */}
              <div className="h-64 mb-6">
                <svg width="100%" height="100%" viewBox="0 0 220 100" className="overflow-visible">
                  <defs>
                    <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.1" />
                      <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`${pathData} L 200 100 L 0 100 Z`}
                    fill="url(#chartGradient)"
                  />
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#60A5FA"
                    strokeWidth="2"
                    className="drop-shadow-sm"
                  />
                  {chartPoints.map((point, index) => (
                    <circle
                      key={index}
                      cx={point.x}
                      cy={point.y}
                      r="3"
                      fill="#60A5FA"
                      className="drop-shadow-sm"
                    />
                  ))}
                </svg>
              </div>

              {/* Portfolio Value */}
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-light text-black">{portfolioValue}</span>
                <span className={`text-sm font-medium ${portfolioChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  ↑{Math.abs(portfolioChange)}%
                </span>
              </div>
            </div>
          </div>

          {/* Right Section - Search */}
          <div className="col-span-4">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pr-10 text-sm text-black placeholder-gray-500 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  🔍
                </div>
              </div>
              <button className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm hover:bg-gray-50 transition-colors">
                <span>⚙️</span>
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>

        {/* Holdings Table */}
        <div className="mt-8 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="col-span-4 text-xs uppercase tracking-wider text-gray-500 font-medium">PLAYER</div>
            <div className="col-span-2 text-xs uppercase tracking-wider text-gray-500 font-medium text-right">PRICE</div>
            <div className="col-span-2 text-xs uppercase tracking-wider text-gray-500 font-medium text-right">1H</div>
            <div className="col-span-2 text-xs uppercase tracking-wider text-gray-500 font-medium text-right">SHARES</div>
            <div className="col-span-2 text-xs uppercase tracking-wider text-gray-500 font-medium text-right">HOLDINGS</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100">
            {filteredHoldings.map((holding) => (
              <div key={holding.id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="col-span-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-semibold text-sm">
                    {holding.avatar}
                  </div>
                  <div>
                    <div className="font-medium text-black">{holding.playerName}</div>
                    <div className="text-sm text-gray-500">
                      {holding.team} • {holding.position}
                    </div>
                  </div>
                </div>
                <div className="col-span-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-yellow-500">🪙</span>
                    <span className="font-medium text-black">{holding.price.toFixed(4)}</span>
                  </div>
                </div>
                <div className="col-span-2 text-right">
                  <span className={`text-sm font-medium ${holding.change1h >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    ↑{Math.abs(holding.change1h)}%
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="font-medium text-black">{holding.shares}</span>
                </div>
                <div className="col-span-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-yellow-500">🪙</span>
                    <span className="font-medium text-black">{holding.holdings.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing 1 - 5 of 5
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              ←
            </button>
            <button className="px-3 py-2 rounded-lg bg-black text-white text-sm font-medium">
              1
            </button>
            <button className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors">
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
