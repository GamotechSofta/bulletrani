import React, { useState } from 'react';

export default function RikshaTopBar({
  history,
  username,
  onSelectRound,
  onOpenWallet,
  vehicle,
  onToggleVehicle
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Default demo multipliers matching the reference screenshot exactly
  const demoMultipliers = [
    { m: 1.32, isHigh: false },
    { m: 21.27, isHigh: true },
    { m: 3.81, isHigh: false },
    { m: 8.48, isHigh: false },
    { m: 4.76, isHigh: false },
    { m: 1.14, isHigh: false },
    { m: 1.29, isHigh: false },
    { m: 1.26, isHigh: false },
    { m: 1.00, isHigh: false },
    { m: 2.04, isHigh: false },
    { m: 1.69, isHigh: false },
    { m: 15.58, isHigh: true },
    { m: 1.90, isHigh: false },
    { m: 3.73, isHigh: false },
    { m: 2.37, isHigh: false },
    { m: 6.34, isHigh: false },
    { m: 1.70, isHigh: false },
    { m: 2.40, isHigh: false },
    { m: 5.37, isHigh: false },
    { m: 1.68, isHigh: false },
    { m: 2.62, isHigh: false },
    { m: 1.00, isHigh: false },
    { m: 2.08, isHigh: false },
    { m: 1.78, isHigh: false },
    { m: 1.18, isHigh: false }
  ];

  const displayList = (history && history.length > 0)
    ? history.slice(-30).reverse().map(r => {
        const m = r.crash_multiplier || r.crashMultiplier || 1.0;
        return {
          m: parseFloat(m.toFixed(2)),
          isHigh: m >= 10.0,
          round: r
        };
      })
    : demoMultipliers;

  return (
    <div className="w-full bg-[#0a1219] select-none border-b border-white/5 h-10 px-3 flex items-center justify-between gap-3 text-xs">
      {/* 1. Left: Back button */}
      <div className="flex items-center gap-1.5 font-bold text-white shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
        <span className="text-lg font-black leading-none text-gray-200 hover:text-white">&lt;</span>
      </div>

      {/* 2. Middle: Multipliers Ribbon matching screenshot (cyan & neon-green) */}
      <div className="relative flex-1 flex items-center min-w-0 overflow-hidden">
        <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none py-1 pr-2 text-[11px] font-mono font-bold">
          {displayList.map((item, idx) => (
            <span
              key={idx}
              onClick={() => item.round && onSelectRound && onSelectRound(item.round)}
              className={`cursor-pointer hover:scale-105 transition-transform shrink-0 whitespace-nowrap ${
                item.isHigh
                  ? 'text-[#22c55e] font-black' // High multiplier in neon green
                  : 'text-[#38bdf8] font-bold' // Standard in cyan
              }`}
            >
              x{item.m.toFixed(2)}
            </span>
          ))}
        </div>

        {/* Dropdown Arrow Button */}
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          title="Past Multipliers Archive"
          className="w-5 h-5 rounded bg-[#13222e] hover:bg-[#1c3346] text-gray-300 flex items-center justify-center text-[8px] transition-colors shrink-0 ml-1 shadow-sm"
        >
          ▼
        </button>

        {/* Dropdown Archive Modal */}
        {dropdownOpen && (
          <div className="absolute top-9 left-0 w-80 bg-[#0e1720] border border-white/10 rounded-xl shadow-2xl p-3 z-50 animate-fade-in text-xs">
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/10">
              <span className="font-bold text-white text-[11px] uppercase tracking-wider">
                Past Multipliers
              </span>
              <button
                onClick={() => setDropdownOpen(false)}
                className="text-gray-400 hover:text-white px-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1.5 max-h-52 overflow-y-auto scrollbar-thin">
              {displayList.map((item, idx) => (
                <div
                  key={idx}
                  className={`text-center py-1 rounded bg-black/40 font-mono text-[11px] font-bold ${
                    item.isHigh ? 'text-emerald-400' : 'text-cyan-400'
                  }`}
                >
                  x{item.m.toFixed(2)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Right: Vehicle Switcher & User Profile Pill */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Quick Vehicle Switcher: Auto-Rickshaw vs Royal Enfield */}
        {onToggleVehicle && (
          <button
            onClick={onToggleVehicle}
            title="Switch Vehicle (Auto-Rickshaw / Royal Enfield Bike)"
            className="hidden sm:flex items-center gap-1.5 bg-[#142330] hover:bg-[#1d354a] border border-white/10 text-white rounded-lg px-2 py-1 text-[11px] font-semibold transition-all active:scale-95 shadow-sm"
          >
            <span>{vehicle === 'bike' ? '🏍️ Bullet 350' : '🛺 Classic Riksha'}</span>
          </button>
        )}

        {/* Username + Avatar icon matching Clickdemo234 👤 */}
        <button
          onClick={onOpenWallet}
          className="flex items-center gap-1.5 font-bold text-white hover:text-gray-200 transition-colors"
        >
          <span className="text-xs sm:text-sm font-semibold">{username || 'Clickdemo234'}</span>
          <span className="w-5 h-5 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-[11px]">
            👤
          </span>
        </button>
      </div>
    </div>
  );
}
