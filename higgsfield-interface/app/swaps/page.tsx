"use client";

import { useState } from "react";

export default function SwapsPage() {
  const [payAmount, setPayAmount] = useState("");
  const [receiveAmount, setReceiveAmount] = useState("");
  const balanceBoson = 0;
  const pricePerShare = 10; // mock price: 10 BOSON per share

  const setPercent = (pct: number) => {
    const amt = ((balanceBoson * pct) / 100).toString();
    setPayAmount(amt);
    const shares = Number(amt || 0) / pricePerShare;
    setReceiveAmount(shares ? shares.toString() : "");
  };

  const handlePayChange = (v: string) => {
    const cleaned = v.replace(/[^0-9.]/g, "");
    setPayAmount(cleaned);
    const shares = Number(cleaned || 0) / pricePerShare;
    setReceiveAmount(cleaned ? shares.toString() : "");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold text-black">Token Swap</h1>
            <p className="text-sm text-gray-600 mt-2">Exchange your tokens instantly</p>
          </div>

          {/* You Pay */}
          <div className="group rounded-lg bg-gray-50 border border-gray-200 p-6 hover:border-gray-300 transition-colors">
            <div className="flex items-center justify-between text-xs tracking-wider text-gray-600 font-medium mb-4">
              <span>YOU PAY</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPercent(25)} className="rounded-full bg-black text-white px-3 py-1.5 text-xs hover:bg-gray-800 transition-colors">25%</button>
                <button onClick={() => setPercent(50)} className="rounded-full bg-black text-white px-3 py-1.5 text-xs hover:bg-gray-800 transition-colors">50%</button>
                <button onClick={() => setPercent(100)} className="rounded-full bg-black text-white px-3 py-1.5 text-xs hover:bg-gray-800 transition-colors">MAX</button>
              </div>
            </div>
            <div className="flex items-center justify-between mb-4">
              <input
                inputMode="decimal"
                value={payAmount}
                onChange={(e) => handlePayChange(e.target.value)}
                placeholder="0"
                className="bg-transparent text-4xl font-light outline-none placeholder:text-gray-300 w-2/3 focus:placeholder:text-gray-400 transition-colors text-black"
              />
              <button className="flex items-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 hover:border-gray-400 hover:bg-gray-50 transition-colors">
                <span className="h-6 w-6 rounded-full bg-gray-600" />
                <span className="font-semibold text-black">BOSON</span>
              </button>
            </div>
            <div className="text-xs tracking-wider text-gray-500 font-medium mb-1">YOUR BALANCE</div>
            <div className="text-sm text-gray-700">{balanceBoson} BOSON</div>
          </div>

          {/* Divider */}
          <div className="relative h-16 flex items-center justify-center my-4">
            <div className="absolute left-0 right-0 mx-6 h-[1px] bg-gray-200" />
            <div className="relative z-10 h-12 w-12 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer group">
              <span className="text-lg group-hover:rotate-180 transition-transform duration-300">⇅</span>
            </div>
          </div>

          {/* You Receive */}
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-6 hover:border-gray-300 transition-colors">
            <div className="text-xs tracking-wider text-gray-600 font-medium mb-4">
              <span>YOU RECEIVE</span>
            </div>
            <div className="flex items-center justify-between mb-4">
              <input
                inputMode="decimal"
                value={receiveAmount}
                onChange={(e) => setReceiveAmount(e.target.value)}
                placeholder="0"
                className="bg-transparent text-4xl font-light outline-none placeholder:text-gray-300 w-2/3 focus:placeholder:text-gray-400 transition-colors text-black"
                readOnly
              />
              <button className="flex items-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 hover:border-gray-400 hover:bg-gray-50 transition-colors">
                <span className="h-6 w-6 rounded-full bg-black" />
                <span className="font-semibold text-black">MBAPPÉ</span>
              </button>
            </div>
            <div className="text-xs tracking-wider text-gray-500 font-medium mb-1">YOUR SHARES</div>
            <div className="text-sm text-gray-700">0 MBAPPÉ</div>
          </div>

          {/* CTA */}
          <button
            disabled={!payAmount || Number(payAmount) <= 0}
            className={`mt-8 w-full rounded-lg py-4 text-lg font-semibold transition-colors ${
              payAmount && Number(payAmount) > 0
                ? "bg-black text-white hover:bg-gray-800"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {payAmount && Number(payAmount) > 0 ? "Swap Now" : "Enter Amount"}
          </button>
        </div>
      </div>
    </div>
  );
}

