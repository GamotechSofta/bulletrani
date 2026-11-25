import React, { useState } from 'react';
import { Plane, UserRound } from 'lucide-react';

export default function LiveRadarTab({
  liveRound,
  engineState,
  onForceCrash,
  onForceStart,
  onPause,
  onResume,
  onSetNextCrash,
  onSetCrashTarget,
  onClearOverrides
}) {
  const [nextCrash, setNextCrash] = useState('2.00');
  const [liveTarget, setLiveTarget] = useState('1.50');
  const paused = engineState?.paused || liveRound.paused;
  const crashTarget = engineState?.crashTarget;
  const nextOverride = engineState?.nextCrashOverride;

  const btn =
    'px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="space-y-6  animate-fade-in">
      {/* Live Flight HUD Banner */}
      <div className="bg-[#121622] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
            <Plane size={26} strokeWidth={2.25} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`w-3 h-3 rounded-full ${liveRound.state === 'FLYING' ? 'bg-emerald-500 animate-ping' : paused ? 'bg-amber-500' : 'bg-sky-500'}`} />
              <h3 className="text-lg font-black text-white uppercase" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>
                ROUND #{liveRound.roundNumber} — {paused ? 'PAUSED' : liveRound.state}
              </h3>
              {crashTarget != null && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-mono">
                  CRASH @ {Number(crashTarget).toFixed(2)}x
                </span>
              )}
              {nextOverride != null && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                  NEXT @ {Number(nextOverride).toFixed(2)}x
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">Full admin control over flight, crash point, and round loop</p>
          </div>
        </div>

        <div className="text-center md:text-right">
          <div className="text-[10px] text-gray-400 uppercase font-semibold">Authoritative Multiplier</div>
          <div
            className="text-4xl sm:text-5xl font-black font-mono text-white drop-shadow-[0_0_25px_rgba(229,34,60,0.5)]"
            style={{ fontFamily: "'Chakra Petch', sans-serif" }}
          >
            {liveRound.multiplier.toFixed(2)}x
          </div>
        </div>
      </div>

      {/* Admin Power Controls */}
      <div className="bg-[#121622] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-white">God Mode — Round Controls</h4>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onForceCrash}
            disabled={liveRound.state !== 'FLYING' || paused}
            className={`${btn} bg-red-600 hover:bg-red-500 text-white shadow-[0_0_12px_rgba(229,34,60,0.35)]`}
          >
            Force Crash Now
          </button>
          <button
            onClick={onForceStart}
            disabled={liveRound.state !== 'WAITING' || paused}
            className={`${btn} bg-sky-600 hover:bg-sky-500 text-white`}
          >
            Skip Countdown / Launch
          </button>
          {!paused ? (
            <button onClick={onPause} className={`${btn} bg-amber-600/80 hover:bg-amber-500 text-white`}>
              Pause Engine
            </button>
          ) : (
            <button onClick={onResume} className={`${btn} bg-emerald-600 hover:bg-emerald-500 text-white`}>
              Resume Engine
            </button>
          )}
          <button onClick={onClearOverrides} className={`${btn} bg-white/10 hover:bg-white/15 text-gray-200`}>
            Clear Overrides
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          <div className="p-3 rounded-xl bg-black/40 border border-white/5">
            <label className="text-[11px] text-gray-400 font-semibold block mb-1.5">
              Force NEXT round crash at
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                step="0.01"
                value={nextCrash}
                onChange={(e) => setNextCrash(e.target.value)}
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-red-500"
              />
              <button
                onClick={() => onSetNextCrash(parseFloat(nextCrash))}
                className={`${btn} bg-rose-700 hover:bg-rose-600 text-white shrink-0`}
              >
                Set Next
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/5">
            <label className="text-[11px] text-gray-400 font-semibold block mb-1.5">
              Override CURRENT round crash target
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                step="0.01"
                value={liveTarget}
                onChange={(e) => setLiveTarget(e.target.value)}
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-red-500"
              />
              <button
                onClick={() => onSetCrashTarget(parseFloat(liveTarget))}
                className={`${btn} bg-orange-700 hover:bg-orange-600 text-white shrink-0`}
              >
                Set Live
              </button>
            </div>
          </div>
        </div>

        {engineState?.serverSeed && (
          <div className="text-[10px] text-gray-500 font-mono break-all border-t border-white/5 pt-3">
            <div>serverSeed: {engineState.serverSeed}</div>
            <div>clientSeed: {engineState.clientSeed}</div>
          </div>
        )}
      </div>

      {/* Live Active Wagers in Round */}
      <div className="bg-[#121622] border border-white/10 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">
            Active Round Wagers & Live Settlement ({liveRound.activeBets.length})
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/30 text-gray-400 uppercase text-[10px]">
              <tr>
                <th className="p-3">Pilot</th>
                <th className="p-3">Panel</th>
                <th className="p-3 text-right">Wager</th>
                <th className="p-3 text-right">Auto Target</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Live Payout / Win</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {liveRound.activeBets && liveRound.activeBets.length > 0 ? (
                liveRound.activeBets.map((b) => {
                  const liveVal = (b.betAmount * liveRound.multiplier).toFixed(2);
                  return (
                    <tr key={b.id} className="hover:bg-white/[0.02]">
                      <td className="p-3 font-sans font-medium flex items-center gap-2">
                        <span className="inline-flex text-gray-400">
                          {b.avatar ? b.avatar : <UserRound size={14} strokeWidth={2.25} />}
                        </span>
                        <span className="font-bold text-white">{b.username}</span>
                        {b.isBot && <span className="text-[9px] bg-white/10 px-1 py-0.5 rounded text-gray-400">BOT</span>}
                      </td>
                      <td className="p-3 text-gray-400 font-sans">Panel {b.panelId}</td>
                      <td className="p-3 text-right font-bold text-gray-200">₹{b.betAmount}</td>
                      <td className="p-3 text-right text-gray-400">{b.autoCashout ? `${b.autoCashout}x` : 'Manual'}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                          b.status === 'cashed_out'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : b.status === 'lost'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold">
                        {b.status === 'cashed_out' ? (
                          <span className="text-emerald-400">+₹{b.winAmount} ({b.cashoutMultiplier}x)</span>
                        ) : liveRound.state === 'FLYING' ? (
                          <span className="text-amber-400">₹{liveVal} (Unsettled)</span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="text-center p-8 text-gray-500 font-sans italic">
                    No wagers placed for the current round
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
