import React from 'react';

export default function RikshaBetsList({ allBets }) {
  // Predefined realistic player list matching the reference image screenshot
  const defaultPlayers = [
    { id: 1, avatarColor: 'bg-emerald-600', avatar: '👩', name: 'P***p', bet: 1000.00, mult: null, win: null },
    { id: 2, avatarColor: 'bg-purple-600', avatar: '🧕', name: 'A***i', bet: 1000.00, mult: null, win: null },
    { id: 3, avatarColor: 'bg-pink-600', avatar: '👧', name: 'P***z', bet: 1000.00, mult: null, win: null },
    { id: 4, avatarColor: 'bg-rose-500', avatar: '👱‍♀️', name: 'T***n', bet: 500.00, mult: null, win: null },
    { id: 5, avatarColor: 'bg-teal-600', avatar: '🦚', name: 'P***z', bet: 500.00, mult: null, win: null },
    { id: 6, avatarColor: 'bg-cyan-600', avatar: '👩‍🦰', name: 'I***a', bet: 200.00, mult: null, win: null },
    { id: 7, avatarColor: 'bg-amber-600', avatar: '🐯', name: 'H***a', bet: 200.00, mult: null, win: null },
    { id: 8, avatarColor: 'bg-blue-600', avatar: '🧑‍✈️', name: 'H***a', bet: 200.00, mult: null, win: null },
    { id: 9, avatarColor: 'bg-emerald-700', avatar: '👨‍🍳', name: 'Q***r', bet: 200.00, mult: null, win: null },
    { id: 10, avatarColor: 'bg-teal-700', avatar: '👩‍⚕️', name: 'V***m', bet: 100.00, mult: null, win: null },
    { id: 11, avatarColor: 'bg-yellow-700', avatar: '👳', name: 'P***m', bet: 100.00, mult: null, win: null },
    { id: 12, avatarColor: 'bg-pink-700', avatar: '👩‍🏫', name: 'T***n', bet: 100.00, mult: null, win: null },
    { id: 13, avatarColor: 'bg-purple-700', avatar: '👧', name: 'K***a', bet: 100.00, mult: null, win: null },
    { id: 14, avatarColor: 'bg-rose-700', avatar: '👨‍🎤', name: 'B***h', bet: 50.00, mult: null, win: null },
    { id: 15, avatarColor: 'bg-indigo-700', avatar: '🧔', name: 'S***y', bet: 50.00, mult: null, win: null }
  ];

  // Merge live bets with default players
  const displayList = (allBets && allBets.length > 0)
    ? allBets.map((b, idx) => ({
        id: b.id || idx,
        avatarColor: b.avatarColor || 'bg-slate-700',
        avatar: b.avatar || '👤',
        name: b.username && b.username.length > 3
          ? `${b.username[0]}***${b.username.slice(-1)}`
          : (b.username || 'P***p'),
        bet: b.betAmount,
        mult: b.cashoutMultiplier,
        win: b.winAmount
      }))
    : defaultPlayers;

  // Format currency numbers like 1.000.00 or 1,000.00
  const formatBet = (amt) => {
    if (!amt) return '100.00';
    return amt.toFixed(2);
  };

  return (
    <div className="w-full lg:w-[290px] xl:w-[320px] bg-[#111a24] border-l border-white/5 flex flex-col h-full overflow-hidden select-none">
      {/* Top Sidebar Header with 66 👤 count matching the screenshot */}
      <div className="h-9 px-3 flex items-center justify-end text-xs font-mono text-gray-300 border-b border-white/5 bg-[#0e1620]">
        <div className="flex items-center gap-1.5 font-bold text-white">
          <span className="text-sm">66</span>
          <span className="text-xs">👤</span>
        </div>
      </div>

      {/* Table Column Headers */}
      <div className="px-3 py-2 border-b border-white/5 text-[11px] font-semibold text-gray-400">
        <div className="grid grid-cols-12 w-full">
          <span className="col-span-4 text-left">Player</span>
          <span className="col-span-3 text-right">Bet</span>
          <span className="col-span-2 text-center">x</span>
          <span className="col-span-3 text-right">Win</span>
        </div>
      </div>

      {/* Bets Rows List */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.02] scrollbar-thin text-xs">
        {displayList.map((p) => {
          const isWin = !!p.win && p.win > 0;
          return (
            <div
              key={p.id}
              className={`grid grid-cols-12 items-center px-3 py-2 transition-colors ${
                isWin ? 'bg-emerald-950/20' : 'hover:bg-white/[0.02]'
              }`}
            >
              {/* Avatar + Masked Player Name */}
              <div className="col-span-4 flex items-center gap-2 truncate">
                <div
                  className={`w-6 h-6 rounded-full ${p.avatarColor || 'bg-slate-700'} flex items-center justify-center text-xs shrink-0 shadow-sm border border-white/10`}
                >
                  {p.avatar}
                </div>
                <span className="truncate font-semibold text-gray-200 text-xs">
                  {p.name}
                </span>
              </div>

              {/* Bet Amount */}
              <div className="col-span-3 text-right font-mono font-bold text-gray-200 text-xs">
                {formatBet(p.bet)}
              </div>

              {/* Multiplier x */}
              <div className="col-span-2 text-center font-mono text-xs">
                {p.mult ? (
                  <span className="text-[#22c55e] font-black">{p.mult}x</span>
                ) : (
                  <span className="text-gray-500 font-bold">-</span>
                )}
              </div>

              {/* Win Amount */}
              <div className="col-span-3 text-right font-mono text-xs">
                {isWin ? (
                  <span className="text-[#22c55e] font-black">
                    {formatBet(p.win)}
                  </span>
                ) : (
                  <span className="text-gray-500 font-bold">-</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
