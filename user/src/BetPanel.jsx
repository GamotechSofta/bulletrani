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

  // Quick preset chips
  const presets = [10, 50, 100, 200, 500, 1000];

  // Auto-bet trigger when entering WAITING state
  useEffect(() => {
    if (gameState === 'WAITING' && autoBetEnabled && !activeBet) {
      const parsedAuto = autoCashoutEnabled ? autoCashoutMult : null;
      onPlaceBet(panelId, amount, parsedAuto);
    }
  }, [gameState, autoBetEnabled, activeBet]);

  const handleAmountChange = (val) => {
    sound.playClick();
    setAmount(Math.max(10, Math.min(10000, Math.round(val))));
  };

  const handleActionClick = () => {
    sound.playClick();

    if (!activeBet) {
      // Place bet
      const parsedAuto = autoCashoutEnabled ? autoCashoutMult : null;
      onPlaceBet(panelId, amount, parsedAuto);
    } else if (gameState === 'WAITING') {
      // Cancel bet
      onCancelBet(panelId);
    } else if (gameState === 'FLYING' && activeBet.status === 'active') {
      // Cashout manually
      onCashout(panelId);
    }
  };

  const liveWinAmount = activeBet && gameState === 'FLYING'
    ? (activeBet.betAmount * currentMultiplier).toFixed(2)
    : null;

  return (
    <div className="bg-[#141721] border border-white/10 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-lg relative overflow-hidden">
      {/* Top Header: Panel ID and Tabs */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/10 text-gray-300 uppercase">
            Bet {panelId}
          </span>
        </div>

        {/* Bet / Auto Tabs */}
        <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5">
          <button
            onClick={() => { sound.playClick(); setTab('bet'); }}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              tab === 'bet' ? 'bg-[#2c3040] text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            Bet
          </button>
          <button
            onClick={() => { sound.playClick(); setTab('auto'); }}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              tab === 'auto' ? 'bg-[#2c3040] text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            Auto
          </button>
        </div>
      </div>

      {/* Main Controls Row */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        {/* Left: Amount Input and Steppers */}
        <div className="sm:col-span-7 flex flex-col gap-2">
          {/* Stepper Input */}
          <div className="flex items-center bg-black/50 border border-white/10 rounded-xl overflow-hidden p-1">
            <button
              onClick={() => handleAmountChange(amount - 50)}
              disabled={!!activeBet}
              className="w-10 h-10 flex items-center justify-center text-lg font-bold text-gray-300 hover:bg-white/10 rounded-lg active:scale-95 disabled:opacity-40 transition-all"
            >
              -
            </button>
            <div className="flex-1 text-center font-bold text-lg text-white">
              <span className="text-gray-400 text-sm mr-1">₹</span>
              <input
                type="number"
                value={amount}
                disabled={!!activeBet}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-24 text-center bg-transparent outline-none font-bold text-white text-base sm:text-lg"
              />
            </div>
            <button
              onClick={() => handleAmountChange(amount + 50)}
              disabled={!!activeBet}
              className="w-10 h-10 flex items-center justify-center text-lg font-bold text-gray-300 hover:bg-white/10 rounded-lg active:scale-95 disabled:opacity-40 transition-all"
            >
              +
            </button>
          </div>

          {/* Quick preset chips */}
          <div className="grid grid-cols-6 gap-1">
            {presets.map((val) => (
              <button
                key={val}
                disabled={!!activeBet}
                onClick={() => handleAmountChange(val)}
                className={`py-1 text-xs font-medium rounded-lg border transition-all ${
                  amount === val
                    ? 'border-red-500 bg-red-500/20 text-white font-bold'
                    : 'border-white/5 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                } disabled:opacity-30`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Big Interactive Aviator Action Button */}
        <div className="sm:col-span-5 flex flex-col h-full min-h-[72px]">
          {/* State 1: In flight and player has active bet -> Big Orange Cash Out Button */}
          {activeBet && activeBet.status === 'active' && gameState === 'FLYING' ? (
            <button
              onClick={handleActionClick}
              className="w-full h-full min-h-[74px] rounded-xl font-bold flex flex-col items-center justify-center shadow-[0_0_25px_rgba(255,152,0,0.5)] bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-[0.98] transition-all text-black"
            >
              <span className="text-xs uppercase tracking-wider font-extrabold opacity-90">CASH OUT</span>
              <span className="text-xl sm:text-2xl font-black" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>
                ₹{liveWinAmount}
              </span>
            </button>
          ) : activeBet && activeBet.status === 'active' && gameState === 'WAITING' ? (
            /* State 2: Waiting round and bet already placed -> Red Cancel Button */
            <button
              onClick={handleActionClick}
              className="w-full h-full min-h-[74px] rounded-xl font-bold flex flex-col items-center justify-center bg-red-600/90 hover:bg-red-500 active:scale-[0.98] transition-all text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]"
            >
              <span className="text-xs uppercase tracking-wider font-extrabold opacity-90">CANCEL</span>
              <span className="text-base sm:text-lg font-bold">
                ₹{activeBet.betAmount}
              </span>
            </button>
          ) : activeBet && activeBet.status === 'cashed_out' ? (
            /* State 3: Already cashed out */
            <div className="w-full h-full min-h-[74px] rounded-xl flex flex-col items-center justify-center bg-green-950/40 border border-green-500/30 text-green-400">
              <span className="text-xs uppercase tracking-wider font-bold">CASHED OUT</span>
              <span className="text-lg font-bold" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>
                +{activeBet.winAmount} ₹ ({activeBet.cashoutMultiplier}x)
              </span>
            </div>
          ) : gameState === 'FLYING' && !activeBet ? (
            /* State 4: Flying and user did not bet */
            <div className="w-full h-full min-h-[74px] rounded-xl flex flex-col items-center justify-center bg-gray-800/40 border border-white/5 text-gray-400">
              <span className="text-xs uppercase tracking-wider font-semibold">PLANE IN FLIGHT</span>
              <span className="text-xs opacity-75">Wait for next round</span>
            </div>
          ) : (
            /* State 5: Default Ready to Bet -> Big Green Button */
            <button
              onClick={handleActionClick}
              disabled={userBalance < amount}
              className="w-full h-full min-h-[74px] rounded-xl font-bold flex flex-col items-center justify-center bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 active:scale-[0.98] transition-all text-white shadow-[0_0_20px_rgba(34,197,94,0.4)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="text-sm uppercase tracking-wider font-black">BET</span>
              <span className="text-lg sm:text-xl font-extrabold">₹{amount}</span>
            </button>
          )}
        </div>
      </div>

      {/* Auto Settings Bar (Visible when Auto Tab is active) */}
      {tab === 'auto' && (
        <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-300 animate-fade-in">
          {/* Auto Bet Switch */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Auto Bet:</span>
            <button
              onClick={() => {
                sound.playClick();
                setAutoBetEnabled(!autoBetEnabled);
              }}
              className={`w-9 h-5 rounded-full transition-colors relative ${
                autoBetEnabled ? 'bg-green-500' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 ${
                  autoBetEnabled ? 'left-4.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Auto Cashout Input */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Auto Cashout:</span>
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

            <div className="flex items-center bg-black/40 border border-white/10 rounded-lg px-2 py-1">
              <input
                type="number"
                step="0.1"
                min="1.01"
                disabled={!autoCashoutEnabled}
                value={autoCashoutMult}
                onChange={(e) => setAutoCashoutMult(Math.max(1.01, parseFloat(e.target.value) || 1.01))}
                className="w-14 text-center bg-transparent outline-none font-bold text-white text-xs disabled:opacity-40"
              />
              <span className="text-gray-400 font-bold text-xs ml-0.5">x</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
