import React, { useState, useEffect } from 'react';

export default function BetPanel({
  panelId,
  gameState,
  currentMultiplier,
  userBalance,
  activeBet,
  onPlaceBet,
  onCancelBet,
  onCashout,
  sound
}) {
  const [tab, setTab] = useState('bet'); // 'bet' | 'auto'
  const [amount, setAmount] = useState(100);
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false);
  const [autoCashoutMult, setAutoCashoutMult] = useState(2.00);
  const [autoBetEnabled, setAutoBetEnabled] = useState(false);
  const [autoBetRounds, setAutoBetRounds] = useState(10);
  const [roundsRemaining, setRoundsRemaining] = useState(0);

  const presets = [100, 200, 500, 1000];

  useEffect(() => {
    if (autoBetEnabled && roundsRemaining === 0) {
      setRoundsRemaining(autoBetRounds);
    }
  }, [autoBetEnabled, autoBetRounds]);

  useEffect(() => {
    if (gameState === 'WAITING' && autoBetEnabled && !activeBet && roundsRemaining > 0) {
      const parsedAuto = autoCashoutEnabled ? autoCashoutMult : null;
      onPlaceBet(panelId, amount, parsedAuto);
      setRoundsRemaining((prev) => prev - 1);
    } else if (roundsRemaining === 0 && autoBetEnabled) {
      setAutoBetEnabled(false);
    }
  }, [gameState, autoBetEnabled, activeBet, roundsRemaining]);

  const handleAmountChange = (val) => {
    sound.playClick();
    const clamped = Math.max(10, Math.min(10000, Math.round(val)));
    setAmount(clamped);
  };

  const handleActionClick = () => {
    sound.playClick();

    if (!activeBet) {
      const parsedAuto = autoCashoutEnabled ? autoCashoutMult : null;
      onPlaceBet(panelId, amount, parsedAuto);
    } else if (gameState === 'WAITING') {
      onCancelBet(panelId);
    } else if (gameState === 'FLYING' && activeBet.status === 'active') {
      onCashout(panelId);
    }
  };

  const liveWinAmount = activeBet && gameState === 'FLYING'
    ? (activeBet.betAmount * currentMultiplier).toFixed(2)
    : null;

  return (
    <div className="bg-[#1b1c21] border border-white/[0.08] rounded-2xl p-3 sm:p-4 shadow-xl select-none flex flex-col justify-between">
      {/* Top Segmented Controls: Bet / Auto */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded bg-black/40 text-gray-400 border border-white/5">
            Console {panelId}
          </span>
          {autoBetEnabled && (
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full animate-pulse">
              AUTO: {roundsRemaining} left
            </span>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#121316] p-0.5 rounded-full border border-white/5">
          <button
            onClick={() => { sound.playClick(); setTab('bet'); }}
            className={`px-4 py-1 text-xs font-bold rounded-full transition-all ${
              tab === 'bet' ? 'bg-[#2b2d35] text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            Bet
          </button>
          <button
            onClick={() => { sound.playClick(); setTab('auto'); }}
            className={`px-4 py-1 text-xs font-bold rounded-full transition-all ${
              tab === 'auto' ? 'bg-[#2b2d35] text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            Auto
          </button>
        </div>
      </div>

      {/* Main Console Cluster: Left Inputs + Right Huge Action Button */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-stretch">
        {/* Left Inputs Cluster */}
        <div className="sm:col-span-7 flex flex-col justify-between gap-2">
          {/* Stepper with circular minus and plus */}
          <div className="flex items-center justify-between bg-[#121316] border border-white/10 rounded-xl px-2 py-1.5">
            <button
              onClick={() => handleAmountChange(amount - 50)}
              disabled={!!activeBet}
              className="w-9 h-9 rounded-full bg-[#252834] hover:bg-[#2f3342] text-gray-200 font-black text-lg flex items-center justify-center active:scale-95 disabled:opacity-30 transition-all border border-white/5"
            >
              -
            </button>

            <div className="flex flex-col items-center">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider leading-none">Bet Amount</span>
              <div className="flex items-center font-black text-lg sm:text-xl text-white font-mono leading-tight mt-0.5">
                <span className="text-gray-400 text-sm mr-1">₹</span>
                <input
                  type="number"
                  value={amount}
                  disabled={!!activeBet}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-20 text-center bg-transparent outline-none font-black text-white font-mono"
                />
              </div>
            </div>

            <button
              onClick={() => handleAmountChange(amount + 50)}
              disabled={!!activeBet}
              className="w-9 h-9 rounded-full bg-[#252834] hover:bg-[#2f3342] text-gray-200 font-black text-lg flex items-center justify-center active:scale-95 disabled:opacity-30 transition-all border border-white/5"
            >
              +
            </button>
          </div>

          {/* Quick Preset Pills */}
          <div className="grid grid-cols-4 gap-1.5">
            {presets.map((val) => (
              <button
                key={val}
                disabled={!!activeBet}
                onClick={() => handleAmountChange(val)}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all border ${
                  amount === val
                    ? 'border-red-500/80 bg-red-600/30 text-white shadow-sm'
                    : 'border-white/5 bg-[#121316] text-gray-400 hover:text-white hover:bg-white/5'
                } disabled:opacity-30 font-mono`}
              >
                ₹{val}
              </button>
            ))}
          </div>
        </div>

        {/* Right Huge Action Button */}
        <div className="sm:col-span-5 flex flex-col min-h-[82px]">
          {/* Active Bet in Flight -> Pulsing Golden Cashout Button */}
          {activeBet && activeBet.status === 'active' && gameState === 'FLYING' ? (
            <button
              onClick={handleActionClick}
              className="w-full h-full min-h-[82px] rounded-2xl font-black flex flex-col items-center justify-center bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 active:scale-[0.98] transition-all text-black shadow-[0_0_30px_rgba(245,158,11,0.6)] animate-pulse"
            >
              <span className="text-xs uppercase tracking-wider font-black">CASH OUT</span>
              <span className="text-xl sm:text-2xl font-black font-mono leading-none mt-0.5" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>
                ₹{liveWinAmount}
              </span>
            </button>
          ) : activeBet && activeBet.status === 'active' && gameState === 'WAITING' ? (
            /* Active Bet Placed During Waiting -> Red Cancel Button */
            <button
              onClick={handleActionClick}
              className="w-full h-full min-h-[82px] rounded-2xl font-black flex flex-col items-center justify-center bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-[0.98] transition-all text-white shadow-[0_0_20px_rgba(229,34,60,0.4)]"
            >
              <span className="text-xs uppercase tracking-wider font-black">CANCEL</span>
              <span className="text-base sm:text-lg font-black font-mono mt-0.5">
                ₹{activeBet.betAmount}.00
              </span>
            </button>
          ) : activeBet && activeBet.status === 'cashed_out' ? (
            /* Cashed Out */
            <div className="w-full h-full min-h-[82px] rounded-2xl flex flex-col items-center justify-center bg-emerald-950/40 border border-emerald-500/30 text-emerald-400">
              <span className="text-[11px] uppercase tracking-wider font-extrabold">WON</span>
              <span className="text-lg font-black font-mono mt-0.5" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>
                +₹{activeBet.winAmount} ({activeBet.cashoutMultiplier}x)
              </span>
            </div>
          ) : gameState === 'FLYING' && !activeBet ? (
            /* Flight in Progress, No Bet */
            <div className="w-full h-full min-h-[82px] rounded-2xl flex flex-col items-center justify-center bg-[#121316] border border-white/5 text-gray-400 text-center px-2">
              <span className="text-xs uppercase tracking-wider font-bold">FLIGHT IN PROGRESS</span>
              <span className="text-[10px] text-gray-500 mt-0.5">Wait for next takeoff</span>
            </div>
          ) : (
            /* Ready to Bet -> Vibrant Green BET Button */
            <button
              onClick={handleActionClick}
              disabled={userBalance < amount}
              className="w-full h-full min-h-[82px] rounded-2xl font-black flex flex-col items-center justify-center bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 active:scale-[0.98] transition-all text-white shadow-[0_0_25px_rgba(16,185,129,0.4)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="text-xs uppercase tracking-wider font-black">BET</span>
              <span className="text-xl sm:text-2xl font-black font-mono leading-none mt-0.5">₹{amount}.00</span>
            </button>
          )}
        </div>
      </div>

      {/* Auto Settings Bar (Visible in Auto Tab) */}
      {tab === 'auto' && (
        <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-300 animate-fade-in">
          {/* Auto Bet Toggle & Rounds Selector */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-semibold">Auto Bet:</span>
            <button
              onClick={() => {
                sound.playClick();
                setAutoBetEnabled(!autoBetEnabled);
                if (!autoBetEnabled) setRoundsRemaining(autoBetRounds);
              }}
              className={`w-9 h-5 rounded-full transition-colors relative ${
                autoBetEnabled ? 'bg-emerald-500' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 ${
                  autoBetEnabled ? 'left-4.5' : 'left-0.5'
                }`}
              />
            </button>

            {autoBetEnabled && (
              <select
                value={autoBetRounds}
                onChange={(e) => {
                  const r = Number(e.target.value);
                  setAutoBetRounds(r);
                  setRoundsRemaining(r);
                }}
                className="bg-[#121316] border border-white/10 rounded-lg px-2 py-0.5 text-xs text-gray-200 outline-none"
              >
                <option value="5">5 rounds</option>
                <option value="10">10 rounds</option>
                <option value="20">20 rounds</option>
                <option value="50">50 rounds</option>
              </select>
            )}
          </div>

          {/* Auto Cashout Input */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-semibold">Auto Cashout:</span>
            <button
              onClick={() => {
                sound.playClick();
                setAutoCashoutEnabled(!autoCashoutEnabled);
              }}
              className={`w-9 h-5 rounded-full transition-colors relative mr-1 ${
                autoCashoutEnabled ? 'bg-amber-500' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 ${
                  autoCashoutEnabled ? 'left-4.5' : 'left-0.5'
                }`}
              />
            </button>

            <div className="flex items-center bg-[#121316] border border-white/10 rounded-lg px-2.5 py-1">
              <input
                type="number"
                step="0.1"
                min="1.01"
                disabled={!autoCashoutEnabled}
                value={autoCashoutMult}
                onChange={(e) => setAutoCashoutMult(Math.max(1.01, parseFloat(e.target.value) || 1.01))}
                className="w-14 text-center bg-transparent outline-none font-bold text-white text-xs disabled:opacity-40 font-mono"
              />
              <span className="text-gray-400 font-bold text-xs ml-0.5">x</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
