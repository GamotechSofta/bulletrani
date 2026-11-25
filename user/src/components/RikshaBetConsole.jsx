import React, { useState, useEffect } from 'react';

export default function RikshaBetConsole({
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
  const [amount, setAmount] = useState(25);
  const [autoplay, setAutoplay] = useState(false);

  const presets = [25, 50, 100, 500];

  useEffect(() => {
    if (gameState === 'WAITING' && autoplay && !activeBet) {
      onPlaceBet(panelId, amount, 2.0); // Default 2.0x auto cashout for autoplay
    }
  }, [gameState, autoplay, activeBet]);

  const handleAmountChange = (val) => {
    sound.playClick();
    const clamped = Math.max(10, Math.min(10000, Math.round(val)));
    setAmount(clamped);
  };

  const handleActionClick = () => {
    sound.playClick();

    if (!activeBet) {
      onPlaceBet(panelId, amount, null);
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
    <div className="flex-1 bg-[#192735] border border-white/5 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between select-none shadow-xl">
      {/* Top Row: Stepper Pill & Big Green BET Button */}
      <div className="grid grid-cols-12 gap-2.5 items-center mb-2">
        {/* Stepper Pill [- 25.00 +] */}
        <div className="col-span-7 flex items-center justify-between bg-[#0e1721] border border-white/10 rounded-xl px-2.5 py-2 shadow-inner">
          <button
            onClick={() => handleAmountChange(amount - 25)}
            disabled={!!activeBet}
            className="w-8 h-8 rounded-lg bg-[#192938] hover:bg-[#22374b] active:scale-90 text-gray-300 font-bold text-xl flex items-center justify-center disabled:opacity-30 transition-all cursor-pointer"
          >
            -
          </button>

          <div className="font-black text-white text-base sm:text-lg font-mono tracking-tight">
            {amount.toFixed(2)}
          </div>

          <button
            onClick={() => handleAmountChange(amount + 25)}
            disabled={!!activeBet}
            className="w-8 h-8 rounded-lg bg-[#192938] hover:bg-[#22374b] active:scale-90 text-gray-300 font-bold text-xl flex items-center justify-center disabled:opacity-30 transition-all cursor-pointer"
          >
            +
          </button>
        </div>

        {/* Big BET / CASHOUT Button */}
        <div className="col-span-5 flex flex-col h-full min-h-[58px]">
          {activeBet && activeBet.status === 'active' && gameState === 'FLYING' ? (
            <button
              onClick={handleActionClick}
              className="w-full h-full min-h-[58px] rounded-xl font-black flex flex-col items-center justify-center bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 active:scale-[0.98] transition-all text-black shadow-lg animate-pulse cursor-pointer"
            >
              <span className="text-[11px] uppercase tracking-wider font-extrabold">CASH OUT</span>
              <span className="text-base sm:text-lg font-black font-mono leading-none">
                {liveWinAmount}
              </span>
            </button>
          ) : activeBet && activeBet.status === 'active' && gameState === 'WAITING' ? (
            <button
              onClick={handleActionClick}
              className="w-full h-full min-h-[58px] rounded-xl font-black flex flex-col items-center justify-center bg-[#c0392b] hover:bg-[#d63031] active:scale-[0.98] transition-all text-white shadow-md cursor-pointer"
            >
              <span className="text-[10px] uppercase tracking-wider font-black">CANCEL</span>
              <span className="text-sm sm:text-base font-black font-mono leading-none">
                {activeBet.betAmount.toFixed(2)}
              </span>
            </button>
          ) : activeBet && activeBet.status === 'cashed_out' ? (
            <div className="w-full h-full min-h-[58px] rounded-xl flex flex-col items-center justify-center bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 shadow-md">
              <span className="text-[10px] uppercase tracking-wider font-extrabold">WON</span>
              <span className="text-sm sm:text-base font-black font-mono leading-none">
                +{activeBet.winAmount}
              </span>
            </div>
          ) : (
            <button
              onClick={handleActionClick}
              disabled={userBalance < amount}
              className="w-full h-full min-h-[58px] rounded-xl font-black flex flex-col items-center justify-center bg-[#42b574] hover:bg-[#4dd185] active:scale-[0.98] transition-all text-[#0c2415] shadow-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <span className="text-xs sm:text-sm uppercase tracking-wider font-black">BET</span>
              <span className="text-sm sm:text-base font-black font-mono leading-none">
                {amount.toFixed(2)}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Row: Quick Chips & Autoplay Switch */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
        {/* Preset Chips: 25 | 50 | 100 | 500 */}
        <div className="flex items-center gap-1.5 flex-1">
          {presets.map((p) => (
            <button
              key={p}
              disabled={!!activeBet}
              onClick={() => handleAmountChange(p)}
              className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all font-mono cursor-pointer ${
                amount === p
                  ? 'bg-[#2b4154] text-white border border-white/20 shadow-sm'
                  : 'bg-[#15202c] text-gray-300 hover:bg-[#1f3041] border border-transparent'
              } disabled:opacity-40`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Autoplay Toggle Switch */}
        <div className="flex items-center gap-2 pl-2">
          <span className="text-[10px] sm:text-[11px] font-extrabold text-gray-300 uppercase tracking-wider">
            AUTOPLAY
          </span>
          <button
            onClick={() => {
              sound.playClick();
              setAutoplay(!autoplay);
            }}
            className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
              autoplay ? 'bg-[#42b574]' : 'bg-[#2b3a4a]'
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-all shadow-md ${
                autoplay ? 'right-0.75' : 'left-0.75'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
