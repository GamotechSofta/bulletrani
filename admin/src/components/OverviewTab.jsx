import React from 'react';

export default function OverviewTab({ stats, settings, liveRound }) {
  // Finance exposure: real players only (exclude platform bots)
  const realBets = (liveRound.activeBets || []).filter((b) => !b.isBot && (b.userId == null || b.userId > 0));
  const currentTotalWager = realBets.reduce((acc, b) => acc + (b.betAmount || 0), 0);
  const currentTotalPotentialPayout = realBets.reduce((acc, b) => {
    if (b.status === 'cashed_out') return acc + (b.winAmount || 0);
    return acc + (b.betAmount * liveRound.multiplier);
  }, 0);

  return (
    <div className="space-y-6  animate-fade-in">
      {/* 4 Financial Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#121622] border border-white/10 p-5 rounded-2xl shadow-lg">
          <span className="text-xs text-gray-400 uppercase font-semibold">Gross Gaming Revenue (GGR)</span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1 font-mono" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>
            ₹{stats ? stats.grossGamingRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">Gross profit (bets − wins). Ignores bonuses, promos & fees</div>
        </div>

        <div className="bg-[#121622] border border-white/10 p-5 rounded-2xl shadow-lg">
          <span className="text-xs text-gray-400 uppercase font-semibold">Total Turnover (Volume)</span>
          <div className="text-2xl sm:text-3xl font-black text-white mt-1 font-mono" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>
            ₹{stats ? stats.totalVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">Real-player wagers only (bots excluded)</div>
        </div>

        <div className="bg-[#121622] border border-white/10 p-5 rounded-2xl shadow-lg">
          <span className="text-xs text-gray-400 uppercase font-semibold">Actual Live RTP</span>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1 font-mono" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>
            {stats ? stats.actualRTP : '0.00'}%
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Theoretical ~{100 - parseFloat(settings?.house_edge || 3)}% — short samples swing hard
          </div>
        </div>

        <div className="bg-[#121622] border border-white/10 p-5 rounded-2xl shadow-lg">
          <span className="text-xs text-gray-400 uppercase font-semibold">Total Completed Rounds</span>
          <div className="text-2xl sm:text-3xl font-black text-white mt-1 font-mono" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>
            {stats ? stats.totalRounds : '0'}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">{stats ? stats.totalUsers : '0'} Registered pilots</div>
        </div>
      </div>

      <div className="bg-[#121622]/80 border border-amber-500/20 rounded-2xl p-4 text-[11px] text-gray-400 leading-relaxed">
        <span className="text-amber-300 font-bold uppercase tracking-wider text-[10px]">Finance notes</span>
        <ul className="mt-2 space-y-1 list-disc list-inside">
          <li>2-decimal flooring and <code className="text-gray-300">max_payout</code> caps shave realized RTP slightly below theoretical.</li>
          <li>Crash variance is high — live RTP only converges near target over large bet volume; GGR can be negative short-term.</li>
          <li>GGR is gross, not net operating profit.</li>
        </ul>
      </div>

      {/* Live Round Risk & Exposure Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 bg-[#121622] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Current Flight Exposure
            </span>
            <div className="text-xl font-black text-white mt-2 font-mono">
              ₹{currentTotalWager.toLocaleString('en-IN')} <span className="text-xs font-normal text-gray-400">wagered</span>
            </div>
            <div className="text-base font-bold text-amber-400 mt-1 font-mono">
              ₹{currentTotalPotentialPayout.toFixed(0)} <span className="text-xs font-normal text-gray-400">current liability</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 text-xs text-gray-400">
            Real pilots in flight: <strong className="text-white">{realBets.length}</strong>
            <span className="text-gray-600"> · bots excluded from finance</span>
          </div>
        </div>

        <div className="md:col-span-2 bg-[#121622] border border-white/10 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Flight Status (Round #{liveRound.roundNumber})
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {liveRound.state}
            </span>
          </div>

          <div className="flex items-center justify-around py-4 bg-black/40 rounded-xl border border-white/5">
            <div className="text-center">
              <div className="text-[10px] text-gray-400 uppercase">Multiplier</div>
              <div className="text-2xl font-black text-white font-mono" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>
                {liveRound.multiplier.toFixed(2)}x
              </div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <div className="text-[10px] text-gray-400 uppercase">Real Bets</div>
              <div className="text-2xl font-black text-white font-mono">
                {realBets.length}
              </div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <div className="text-[10px] text-gray-400 uppercase">Real Wagered</div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ₹{currentTotalWager}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
