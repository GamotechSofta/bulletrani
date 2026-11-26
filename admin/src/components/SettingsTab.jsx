import React from 'react';

export default function SettingsTab({ settings, setSettings, onSave }) {
  const currentHouseEdge = parseFloat(settings.house_edge || 3.0);
  const calculatedRTP = (100 - currentHouseEdge).toFixed(1);
  const maxCrash = settings.max_crash_multiplier ?? '20.0';
  const maxRoundStake = settings.max_round_stake ?? '0';

  return (
    <div className="bg-[#121622] border border-white/10 rounded-2xl p-6 shadow-lg max-w-2xl  animate-fade-in">
      <h3 className="text-base font-bold text-white mb-1">Crash Math & Risk Configuration</h3>
      <p className="text-xs text-gray-400 mb-6">
        Controls that govern multiplier distribution and per-round liability when many real players bet.
      </p>

      <form onSubmit={onSave} className="space-y-5 text-xs">
        <div className="p-4 bg-black/40 rounded-xl border border-white/5">
          <div className="flex justify-between font-semibold mb-2">
            <label className="text-gray-300">House Edge Percentage (%):</label>
            <span className="text-emerald-400 font-bold font-mono text-sm">
              {settings.house_edge}% (Theoretical RTP: {calculatedRTP}%)
            </span>
          </div>

          <input
            type="range"
            min="0.5"
            max="30.0"
            step="0.1"
            value={settings.house_edge}
            onChange={(e) => setSettings({ ...settings, house_edge: e.target.value })}
            className="w-full accent-red-500 cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>0.5% (RTP 99.5%)</span>
            <span>3% (97%)</span>
            <span>15% (85%)</span>
            <span>30% (RTP 70%)</span>
          </div>
          <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
            Long-run EV only — with a few dozen multi-device bets, GGR can still swing negative.
            Applied at round launch (latest saved value). Use Max Crash / Round Stake for hard protection.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-gray-300 block mb-1 font-semibold">Max Crash Multiplier (x)</label>
            <input
              type="number"
              min="1"
              step="0.1"
              value={maxCrash}
              onChange={(e) => setSettings({ ...settings, max_crash_multiplier: e.target.value })}
              className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 font-mono"
            />
            <p className="text-[10px] text-gray-500 mt-1">Caps how high a round can fly (e.g. 20). Lower = more house profit.</p>
          </div>
          <div>
            <label className="text-gray-300 block mb-1 font-semibold">Max Round Stake (₹, 0 = off)</label>
            <input
              type="number"
              min="0"
              step="100"
              value={maxRoundStake}
              onChange={(e) => setSettings({ ...settings, max_round_stake: e.target.value })}
              className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 font-mono"
            />
            <p className="text-[10px] text-gray-500 mt-1">Rejects new real bets once total stake in the round hits this limit.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-gray-300 block mb-1 font-semibold">Min Bet Allowed (₹)</label>
            <input
              type="number"
              value={settings.min_bet}
              onChange={(e) => setSettings({ ...settings, min_bet: e.target.value })}
              className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 font-mono"
            />
          </div>
          <div>
            <label className="text-gray-300 block mb-1 font-semibold">Max Bet Limit (₹)</label>
            <input
              type="number"
              value={settings.max_bet}
              onChange={(e) => setSettings({ ...settings, max_bet: e.target.value })}
              className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-gray-300 block mb-1 font-semibold">Max Payout Cap per Bet (₹)</label>
            <input
              type="number"
              value={settings.max_payout}
              onChange={(e) => setSettings({ ...settings, max_payout: e.target.value })}
              className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 font-mono"
            />
          </div>
          <div>
            <label className="text-gray-300 block mb-1 font-semibold">Countdown Duration (Seconds)</label>
            <input
              type="number"
              step="0.5"
              min="2"
              max="15"
              value={settings.countdown_seconds}
              onChange={(e) => setSettings({ ...settings, countdown_seconds: e.target.value })}
              className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 font-mono"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 font-bold text-sm text-white hover:from-red-500 hover:to-rose-500 active:scale-98 transition-all mt-4 shadow-[0_0_20px_rgba(229,34,60,0.4)]"
        >
          Save & Apply Settings Instantly
        </button>
      </form>
    </div>
  );
}
