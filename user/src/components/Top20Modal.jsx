import React from 'react';
import { IconTrophy } from './Icons';

export default function Top20Modal({ topWins, onClose }) {
  const defaultTop = [
    { rank: 1, user: 'RikshaKing99', bet: 1000, mult: 84.50, win: 84500 },
    { rank: 2, user: 'DelhiDriver', bet: 500, mult: 62.10, win: 31050 },
    { rank: 3, user: 'MumbaiSpeed', bet: 1000, mult: 28.40, win: 28400 },
    { rank: 4, user: 'TurboTukTuk', bet: 200, mult: 110.00, win: 22000 },
    { rank: 5, user: 'LuckyRiksha', bet: 500, mult: 35.20, win: 17600 },
    { rank: 6, user: 'AutoPilot_7', bet: 100, mult: 145.20, win: 14520 },
    { rank: 7, user: 'DesiNitro', bet: 500, mult: 24.80, win: 12400 },
    { rank: 8, user: 'Clickdemo234', bet: 200, mult: 55.40, win: 11080 },
    { rank: 9, user: 'RocketWala', bet: 100, mult: 98.30, win: 9830 },
    { rank: 10, user: 'SpeedyBhai', bet: 250, mult: 36.10, win: 9025 }
  ];

  const list = (topWins && topWins.length > 0)
    ? topWins.map((w, idx) => ({
        rank: idx + 1,
        user: w.username,
        bet: w.bet_amount,
        mult: w.cashout_multiplier,
        win: w.win_amount
      }))
    : defaultTop;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-[#101c27] border border-white/10 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold p-1 rounded-lg"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
            <IconTrophy className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-wide" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>
              TOP 20 LEADERBOARD
            </h3>
            <p className="text-xs text-gray-400">All-time highest multipliers and payouts</p>
          </div>
        </div>

        <div className="space-y-1.5 max-h-80 overflow-y-auto scrollbar-thin text-xs">
          {list.map((item) => (
            <div
              key={item.rank}
              className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                    item.rank === 1
                      ? 'bg-amber-500 text-black shadow-md'
                      : item.rank === 2
                      ? 'bg-gray-300 text-black'
                      : item.rank === 3
                      ? 'bg-amber-700 text-white'
                      : 'bg-white/10 text-gray-300'
                  }`}
                >
                  {item.rank}
                </span>
                <div>
                  <div className="font-bold text-white">{item.user}</div>
                  <div className="text-[10px] text-gray-400 font-mono">Bet: ₹{item.bet}</div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-black text-emerald-400 font-mono">
                  {item.mult}x
                </div>
                <div className="text-xs font-black text-amber-300 font-mono">
                  +₹{item.win.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
