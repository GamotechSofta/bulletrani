import React from 'react';

export default function HistoryRibbon({ history, onSelectRound }) {
  const getBadgeStyle = (multiplier) => {
    const val = parseFloat(multiplier);
    if (val < 2.00) {
      // Blue for standard low multiplier (<2x)
      return 'bg-[#1b2f4a] text-[#4ea5ff] border-[#294c7a]';
    } else if (val < 10.00) {
      // Purple for medium multiplier (2x - 10x)
      return 'bg-[#3b1d54] text-[#c074fc] border-[#5e2b8a]';
    } else if (val < 50.00) {
      // Amber/Gold for high multiplier (10x - 50x)
      return 'bg-[#4a360a] text-[#ffc107] border-[#8a6311]';
    } else {
      // Ruby red / Pink for mega multipliers (50x+)
      return 'bg-[#520a26] text-[#ff3377] border-[#911345] shadow-[0_0_10px_rgba(255,51,119,0.5)]';
    }
  };

  return (
    <div className="w-full overflow-hidden bg-[#0d1017] border-y border-white/5 py-1.5 px-3 flex items-center">
      <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mr-2 shrink-0 flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
        History
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
        {history && history.length > 0 ? (
          history.slice(-25).reverse().map((round, idx) => (
            <button
              key={round.round_number || round.roundNumber || idx}
              onClick={() => onSelectRound && onSelectRound(round)}
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border transition-transform hover:scale-110 active:scale-95 shrink-0 ${getBadgeStyle(
                round.crash_multiplier || round.crashMultiplier
              )}`}
              style={{ fontFamily: "'Chakra Petch', sans-serif" }}
            >
              {(round.crash_multiplier || round.crashMultiplier).toFixed(2)}x
            </button>
          ))
        ) : (
          <span className="text-xs text-gray-500 italic">Waiting for rounds...</span>
        )}
      </div>
    </div>
  );
}
