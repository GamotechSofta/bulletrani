import React, { useState } from 'react';

export default function BetsSidebar({ allBets, myBets, topWins }) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'my' | 'top'

  const totalRoundWager = (allBets || []).reduce((acc, b) => acc + (b.betAmount || 0), 0);
  const totalCashedOutCount = (allBets || []).filter(b => b.status === 'cashed_out').length;

  return (
    <div className="bg-[#14151c] border border-white/[0.08] rounded-2xl flex flex-col h-full overflow-hidden shadow-xl select-none">
      {/* Segmented Top Tabs */}
      <div className="p-2 border-b border-white/[0.08] bg-[#0e0f14]">
        <div className="flex bg-[#1c1d26] p-0.5 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all text-center ${
              activeTab === 'all'
                ? 'bg-[#2b2d3d] text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            All Bets ({allBets ? allBets.length : 0})
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all text-center ${
              activeTab === 'my'
                ? 'bg-[#2b2d3d] text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            My Bets
          </button>
          <button
            onClick={() => setActiveTab('top')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all text-center ${
              activeTab === 'top'
                ? 'bg-[#2b2d3d] text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Top
          </button>
        </div>
      </div>

      {/* Summary Line for 'All Bets' */}
      {activeTab === 'all' && (
        <div className="px-3 py-1.5 bg-[#101117] border-b border-white/5 flex items-center justify-between text-[11px] text-gray-400 font-mono">
          <span>Active: <strong className="text-white">{allBets ? allBets.length : 0}</strong> ({totalCashedOutCount} won)</span>
          <span>Total: <strong className="text-emerald-400">₹{totalRoundWager.toLocaleString()}</strong></span>
        </div>
      )}

      {/* Bets List Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
        {activeTab === 'all' && (
          <>
            <div className="grid grid-cols-12 text-[10px] font-bold text-gray-500 px-2 py-1 uppercase tracking-wider">
              <span className="col-span-5">User</span>
              <span className="col-span-3 text-right">Bet INR</span>
              <span className="col-span-4 text-right">Cash Out</span>
            </div>

            {allBets && allBets.length > 0 ? (
              allBets.map((bet) => {
                const isCashed = bet.status === 'cashed_out';
                return (
                  <div
                    key={bet.id}
                    className={`grid grid-cols-12 items-center px-2 py-1.5 rounded-lg text-xs transition-all ${
                      isCashed
                        ? 'bg-[#10241b] border border-emerald-500/30 text-white'
                        : 'bg-[#1a1b24]/50 border border-transparent text-gray-300'
                    }`}
                  >
                    <div className="col-span-5 flex items-center gap-1.5 truncate">
                      <span className="text-sm shrink-0">{bet.avatar || '🧑‍✈️'}</span>
                      <span className="truncate font-semibold text-gray-200">{bet.username}</span>
                      {bet.isBot && <span className="text-[8px] bg-white/10 px-1 py-0.2 rounded text-gray-400">BOT</span>}
                    </div>

                    <div className="col-span-3 text-right font-mono font-bold text-gray-300">
                      ₹{bet.betAmount}
                    </div>

                    <div className="col-span-4 text-right font-mono">
                      {isCashed ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold border border-emerald-500/30">
                            {bet.cashoutMultiplier}x
                          </span>
                          <span className="text-emerald-300 font-bold text-xs">
                            ₹{bet.winAmount}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500 italic text-xs">-</span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 text-xs text-gray-500 italic">
                Waiting for pilots to place bets...
              </div>
            )}
          </>
        )}

        {activeTab === 'my' && (
          <>
            <div className="grid grid-cols-12 text-[10px] font-bold text-gray-500 px-2 py-1 uppercase tracking-wider">
              <span className="col-span-3">Round</span>
              <span className="col-span-3 text-right">Bet</span>
              <span className="col-span-3 text-right">Mult</span>
              <span className="col-span-3 text-right">Cash Out</span>
            </div>

            {myBets && myBets.length > 0 ? (
              myBets.map((bet) => {
                const isWon = bet.status === 'cashed_out';
                return (
                  <div
                    key={bet.id}
                    className={`grid grid-cols-12 items-center px-2 py-2 rounded-lg text-xs ${
                      isWon
                        ? 'bg-[#10241b] border border-emerald-500/30 text-white'
                        : 'bg-[#241318]/50 border border-red-500/10 text-gray-300'
                    }`}
                  >
                    <span className="col-span-3 font-mono text-gray-400 font-bold">
                      #{bet.round_number || bet.roundId}
                    </span>
                    <span className="col-span-3 text-right font-mono text-gray-200">
                      ₹{bet.bet_amount || bet.betAmount}
                    </span>
                    <span className="col-span-3 text-right font-mono font-bold">
                      {isWon ? (
                        <span className="text-emerald-400">
                          {bet.cashout_multiplier || bet.cashoutMultiplier}x
                        </span>
                      ) : (
                        <span className="text-red-400">Crash</span>
                      )}
                    </span>
                    <span className="col-span-3 text-right font-mono font-bold">
                      {isWon ? (
                        <span className="text-emerald-400">
                          +₹{bet.win_amount || bet.winAmount}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 text-xs text-gray-500 italic">
                You haven't placed any bets yet
              </div>
            )}
          </>
        )}

        {activeTab === 'top' && (
          <div className="space-y-1.5 p-1">
            {topWins && topWins.length > 0 ? (
              topWins.map((win, idx) => (
                <div
                  key={win.id || idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-xs text-white">{win.username}</div>
                      <div className="text-[10px] text-gray-400 font-mono">Bet: ₹{win.bet_amount}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-black text-amber-400 font-mono">
                      {win.cashout_multiplier}x
                    </div>
                    <div className="text-xs font-black text-emerald-400 font-mono">
                      +₹{win.win_amount.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-xs text-gray-500 italic">
                Top wins leaderboard loading...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
