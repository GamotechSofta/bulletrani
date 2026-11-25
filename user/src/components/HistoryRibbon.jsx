import React, { useState } from 'react';

export default function HistoryRibbon({ history, onSelectRound }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | '2x' | '10x'

  const getBadgeStyle = (multiplier) => {
    const val = parseFloat(multiplier);
    if (val < 2.00) {
      return 'bg-[#122438] text-[#34b4ff] border-[#1d3957]';
    } else if (val < 10.00) {
      return 'bg-[#29173e] text-[#913ef8] border-[#431d68]';
    } else if (val < 50.00) {
      return 'bg-[#3b081b] text-[#e61c5d] border-[#661031]';
    } else {
      return 'bg-[#3d2605] text-[#ff9800] border-[#6b420a] shadow-[0_0_12px_rgba(255,152,0,0.4)]';
    }
  };

  const filteredHistory = (history || []).filter((r) => {
    const m = r.crash_multiplier || r.crashMultiplier || 1.0;
    if (filter === '2x') return m >= 2.0;
    if (filter === '10x') return m >= 10.0;
    return true;
  });

  return (
    <div className="relative w-full bg-[#101116] border-y border-white/[0.08] py-1.5 px-3 flex items-center justify-between z-20 select-none">
      <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
        {/* Scrolling pill strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {history && history.length > 0 ? (
            history.slice(-35).reverse().map((round, idx) => (
              <button
                key={round.round_number || round.roundNumber || idx}
                onClick={() => onSelectRound && onSelectRound(round)}
                title={`Round #${round.round_number || round.roundNumber} - Verify Fair`}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border transition-transform hover:scale-105 active:scale-95 shrink-0 font-mono ${getBadgeStyle(
                  round.crash_multiplier || round.crashMultiplier
                )}`}
              >
                {(round.crash_multiplier || round.crashMultiplier).toFixed(2)}x
              </button>
            ))
          ) : (
            <span className="text-xs text-gray-500 italic">Waiting for rounds...</span>
          )}
        </div>
      </div>

      {/* History Dropdown Toggle Button */}
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="shrink-0 p-1 rounded-lg bg-[#181920] hover:bg-[#22242e] text-gray-300 hover:text-white text-xs flex items-center gap-1.5 px-2.5 border border-white/10 transition-colors"
      >
        <span className="text-xs">⏱️</span>
        <span className="text-[11px] font-bold uppercase tracking-wider">History</span>
        <span className="text-[9px] text-gray-400">{dropdownOpen ? '▲' : '▼'}</span>
      </button>

      {/* Expanded Multiplier History Drawer */}
      {dropdownOpen && (
        <div className="absolute top-full right-3 w-80 sm:w-96 bg-[#16171f] border border-white/10 rounded-2xl shadow-2xl p-4 z-50 animate-fade-in mt-1">
          <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Round Multiplier Archive</h4>
            <div className="flex gap-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded ${filter === 'all' ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-400'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('2x')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded ${filter === '2x' ? 'bg-[#913ef8] text-white' : 'bg-white/5 text-gray-400'}`}
              >
                &gt;2x
              </button>
              <button
                onClick={() => setFilter('10x')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded ${filter === '10x' ? 'bg-[#ff9800] text-black font-extrabold' : 'bg-white/5 text-gray-400'}`}
              >
                &gt;10x
              </button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1.5 max-h-56 overflow-y-auto p-1 scrollbar-thin">
            {filteredHistory.slice(-50).reverse().map((round, idx) => (
              <button
                key={round.round_number || round.roundNumber || idx}
                onClick={() => {
                  setDropdownOpen(false);
                  onSelectRound && onSelectRound(round);
                }}
                className={`px-1.5 py-1 rounded-lg text-xs font-black border text-center transition-transform hover:scale-105 font-mono ${getBadgeStyle(
                  round.crash_multiplier || round.crashMultiplier
                )}`}
              >
                {(round.crash_multiplier || round.crashMultiplier).toFixed(2)}x
              </button>
            ))}
          </div>

          <div className="mt-3 pt-2 border-t border-white/5 text-[10px] text-gray-400 text-center">
            Click any multiplier to inspect HMAC-SHA256 seed details
          </div>
        </div>
      )}
    </div>
  );
}
