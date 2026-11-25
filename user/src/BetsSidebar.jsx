import React, { useState } from 'react';

export default function BetsSidebar({ allBets, myBets, topWins }) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'my' | 'top'

  return (
    <div className="bg-[#12151e] border border-white/10 rounded-2xl flex flex-col h-full overflow-hidden shadow-xl">
      {/* Tabs Header */}
      <div className="flex border-b border-white/10 bg-[#0d1017]">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center transition-all ${
            activeTab === 'all'
              ? 'text-red-500 border-b-2 border-red-500 bg-white/[0.03]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          All Bets ({allBets ? allBets.length : 0})
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center transition-all ${
            activeTab === 'my'
              ? 'text-red-500 border-b-2 border-red-500 bg-white/[0.03]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          My Bets
        </button>
        <button
          onClick={() => setActiveTab('top')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center transition-all ${
            activeTab === 'top'
              ? 'text-red-500 border-b-2 border-red-500 bg-white/[0.03]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Top Wins
        </button>
      </div>

      {/* Bets List Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
        {activeTab === 'all' && (
          <>
            <div className="grid grid-cols-12 text-[10px] font-bold text-gray-500 px-2 py-1 uppercase">
              <span className="col-span-5">User</span>
              <span className="col-span-3 text-right">Bet</span>
              <span className="col-span-4 text-right">Cash Out</span>
            </div>

            {allBets && allBets.length > 0 ? (
              allBets.map((bet) => {
                const isCashed = bet.status === 'cashed_out';
                return (
                  <div
                    key={bet.id}
                    className={`grid grid-cols-12 items-center px-2 py-1.5 rounded-lg text-xs transition-colors ${
                      isCashed
                        ? 'bg-emerald-950/40 border border-emerald-500/20 text-white'
                        : 'bg-white/[0.02] border border-transparent text-gray-300'
                    }`}
                  >
                    <div className="col-span-5 flex items-center gap-1.5 truncate">
                      <span className="text-sm">{bet.avatar || '🧑‍✈️'}</span>
                      <span className="truncate font-medium">{bet.username}</span>
                    </div>

                    <div className="col-span-3 text-right font-mono font-semibold text-gray-300">
                      ₹{bet.betAmount}
                    </div>

                    <div className="col-span-4 text-right font-mono">
                      {isCashed ? (
                        <div className="flex flex-col items-end">
                          <span className="text-emerald-400 font-bold">
                            {bet.cashoutMultiplier}x
                          </span>
                          <span className="text-[10px] text-emerald-300">
                            +₹{bet.winAmount}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500 italic text-[11px]">-</span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-xs text-gray-500">
                No bets placed yet for this round
              </div>
            )}
          </>
        )}

        {activeTab === 'my' && (
          <>
            <div className="grid grid-cols-12 text-[10px] font-bold text-gray-500 px-2 py-1 uppercase">
              <span className="col-span-3">Round</span>
              <span className="col-span-3 text-right">Bet</span>
              <span className="col-span-3 text-right">Multiplier</span>
              <span className="col-span-3 text-right">Payout</span>
            </div>

            {myBets && myBets.length > 0 ? (
              myBets.map((bet) => {
                const isWon = bet.status === 'cashed_out';
                return (
                  <div
                    key={bet.id}
                    className={`grid grid-cols-12 items-center px-2 py-2 rounded-lg text-xs ${
                      isWon
                        ? 'bg-emerald-950/30 border border-emerald-500/20 text-white'
                        : 'bg-red-950/20 border border-red-500/10 text-gray-300'
                    }`}
                  >
                    <span className="col-span-3 font-mono text-gray-400">
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
              <div className="text-center py-8 text-xs text-gray-500">
                You haven't placed any bets yet
              </div>
            )}
          </>
        )}

        {activeTab === 'top' && (
          <div className="space-y-2">
            {topWins && topWins.length > 0 ? (
              topWins.map((win, idx) => (
                <div
                  key={win.id || idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-xs text-white">{win.username}</div>
                      <div className="text-[10px] text-gray-400">Bet ₹{win.bet_amount}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-black text-amber-400" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>
                      {win.cashout_multiplier}x
                    </div>
                    <div className="text-xs font-black text-emerald-400 font-mono">
                      +₹{win.win_amount.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-gray-500">
                Top wins leaderboard loading...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
