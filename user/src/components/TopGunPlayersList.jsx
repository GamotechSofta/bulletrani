import React, { useState } from 'react';

export default function TopGunPlayersList({ allBets, currentUserId }) {
  const [tab, setTab] = useState('all'); // all | my | top

  const defaultPlayers = [
    { id: 1, name: '6***2', bet: 20.00, mult: null, win: null, avatar: 1 },
    { id: 2, name: 'v***7', bet: 320.00, mult: null, win: null, avatar: 2 },
    { id: 3, name: 'A***g', bet: 100.00, mult: null, win: null, avatar: 3 },
    { id: 4, name: 'R***t', bet: 50.00, mult: 1.76, win: 88.00, avatar: 4 },
    { id: 5, name: 'S***g', bet: 250.00, mult: null, win: null, avatar: 5 },
    { id: 6, name: 'P***p', bet: 500.00, mult: null, win: null, avatar: 1 },
    { id: 7, name: 'M***k', bet: 75.00, mult: 2.10, win: 157.50, avatar: 2 },
    { id: 8, name: 'K***a', bet: 1000.00, mult: null, win: null, avatar: 3 },
    { id: 9, name: 'L***e', bet: 40.00, mult: null, win: null, avatar: 4 },
    { id: 10, name: 'J***n', bet: 20.00, mult: null, win: null, avatar: 5 }
  ];

  const mapped = (allBets && allBets.length > 0)
    ? allBets.map((b, idx) => ({
        id: b.id || idx,
        userId: b.userId,
        name: b.username && b.username.length > 3
          ? `${b.username[0]}***${b.username.slice(-1)}`
          : (b.username || 'P***p'),
        bet: b.betAmount,
        mult: b.cashoutMultiplier,
        win: b.winAmount,
        avatar: (idx % 5) + 1
      }))
    : defaultPlayers;

  let displayList = mapped;
  if (tab === 'my' && currentUserId) {
    displayList = mapped.filter((p) => p.userId === currentUserId);
  } else if (tab === 'top') {
    displayList = [...mapped]
      .filter((p) => p.win)
      .sort((a, b) => (b.win || 0) - (a.win || 0));
    if (displayList.length === 0) {
      displayList = [...mapped].sort((a, b) => (b.bet || 0) - (a.bet || 0));
    }
  }

  const totalCount = tab === 'all'
    ? (allBets && allBets.length > 0 ? allBets.length : 928)
    : displayList.length;

  const tabLabel = tab === 'all' ? 'ALL BETS' : tab === 'my' ? 'MY BETS' : 'TOP';

  const avatarColors = [
    'bg-[#3b4a6b]',
    'bg-[#5b3b6b]',
    'bg-[#3b6b4a]',
    'bg-[#6b4a3b]',
    'bg-[#3b5b6b]'
  ];

  const formatAmt = (n) =>
    n == null
      ? ''
      : Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="w-full h-full bg-[#0d0d0d] rounded-xl sm:rounded-2xl flex flex-col overflow-hidden select-none shadow-xl">
      <div className="px-2 pt-2 sm:px-2.5 sm:pt-2.5 shrink-0">
        <div className="flex items-center bg-[#1a1a1a] rounded-full p-0.5">
          {[
            { id: 'all', label: 'All Bets' },
            { id: 'my', label: 'My Bets' },
            { id: 'top', label: 'Top' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-semibold transition-all cursor-pointer ${
                tab === t.id
                  ? 'bg-[#333333] text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-2.5 sm:px-3 pt-1.5 sm:pt-2 pb-0.5 shrink-0 flex items-center justify-between gap-2">
        <div className="flex items-end gap-2">
          <div className="text-[9px] sm:text-[10px] font-bold text-gray-400 tracking-wider uppercase">{tabLabel}</div>
          <div className="text-base sm:text-lg font-black text-white leading-none">{totalCount}</div>
        </div>
      </div>

      <div className="px-2.5 sm:px-3.5 py-1 sm:py-2 text-[9px] sm:text-[10px] font-medium text-gray-500 shrink-0">
        <div className="grid grid-cols-12 w-full">
          <span className="col-span-4 text-left">User</span>
          <span className="col-span-3 text-center">Bet</span>
          <span className="col-span-2 text-center">X</span>
          <span className="col-span-3 text-right">Cash out</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-1.5 sm:px-2.5 pb-2 space-y-1 scrollbar-thin">
        {displayList.length === 0 ? (
          <div className="text-center text-gray-500 text-xs py-6">No bets yet</div>
        ) : (
          displayList.map((p) => {
            const isWin = !!p.win && p.win > 0;
            return (
              <div
                key={p.id}
                className={`grid grid-cols-12 items-center px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-lg sm:rounded-xl ${
                  isWin ? 'bg-[#14301f]/80' : 'bg-[#1a1a1a]'
                }`}
              >
                <div className="col-span-4 flex items-center gap-1.5 sm:gap-2 truncate">
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full ${avatarColors[(p.avatar || 1) - 1]} flex items-center justify-center shrink-0 text-[10px] font-bold text-white/80`}
                  >
                    {p.name?.[0] || '?'}
                  </div>
                  <span className="truncate text-[11px] sm:text-[12px] font-medium text-gray-200">{p.name}</span>
                </div>

                <div className="col-span-3 text-center text-[11px] sm:text-[12px] font-semibold text-gray-200">
                  {formatAmt(p.bet)}
                </div>

                <div className="col-span-2 text-center text-[11px] sm:text-[12px] font-semibold">
                  {p.mult ? (
                    <span className="text-[#28a700]">{Number(p.mult).toFixed(2)}</span>
                  ) : (
                    <span className="text-gray-600"> </span>
                  )}
                </div>

                <div className="col-span-3 text-right text-[11px] sm:text-[12px] font-semibold">
                  {isWin ? (
                    <span className="text-[#28a700]">{formatAmt(p.win)}</span>
                  ) : (
                    <span className="text-gray-600"> </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
