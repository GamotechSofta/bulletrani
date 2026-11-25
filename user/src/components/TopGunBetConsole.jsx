import React, { useState, useEffect } from 'react';

export default function TopGunBetConsole({
  panelId,
  gameState,
  currentMultiplier,
  userBalance,
  activeBet,
  onPlaceBet,
  onCancelBet,
  onCashout,
  sound,
  collapsible = false,
  collapsed = false,
  onToggleCollapse
}) {
  const [amount, setAmount] = useState(20);
  const [mode, setMode] = useState('bet');
  const [autoCashout, setAutoCashout] = useState(2.0);

  const presets = [20, 100, 1000, 5000];

  useEffect(() => {
    if (gameState === 'WAITING' && mode === 'auto' && !activeBet) {
      onPlaceBet(panelId, amount, autoCashout);
    }
  }, [gameState, mode, activeBet]);

  const handleAmountChange = (val) => {
    if (sound) sound.playClick();
    setAmount(Math.max(10, Math.min(100000, Math.round(val))));
  };

  const handleActionClick = () => {
    if (sound) sound.playClick();
    if (!activeBet) {
      onPlaceBet(panelId, amount, mode === 'auto' ? autoCashout : null);
    } else if (gameState === 'WAITING') {
      onCancelBet(panelId);
    } else if (gameState === 'FLYING' && activeBet.status === 'active') {
      onCashout(panelId);
    }
  };

  const liveWinAmount = activeBet && gameState === 'FLYING'
    ? (activeBet.betAmount * currentMultiplier).toFixed(2)
    : null;

  const formatAmt = (n) =>
    Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (collapsed && collapsible) {
    return (
      <button
        onClick={onToggleCollapse}
        className="w-full min-h-[56px] bg-[#1b1c1e] rounded-xl px-4 flex items-center justify-between select-none cursor-pointer border border-dashed border-white/10 hover:border-white/20 transition-colors"
      >
        <span className="text-[12px] font-bold text-gray-200">+ Add Bet {panelId}</span>
        <span className="text-[10px] text-gray-500">Tap to open</span>
      </button>
    );
  }

  const actionBtn =
    'w-full h-full rounded-[8px] font-bold flex flex-col items-center justify-center gap-0.5 active:scale-[0.98] cursor-pointer transition-transform py-1';

  return (
    <div className="relative w-full bg-[#1b1c1e] rounded-xl px-1.5 pt-1 pb-1.5 flex flex-col gap-1 select-none border border-white/[0.04]">
      {collapsible && (
        <button
          onClick={onToggleCollapse}
          className="absolute top-1 right-1 w-[18px] h-[18px] rounded-full border border-white/25 text-gray-400 hover:text-white hover:border-white/40 flex items-center justify-center text-[11px] leading-none z-10 cursor-pointer"
          aria-label="Hide second bet"
          title="Hide"
        >
          −
        </button>
      )}

      {/* Bet / Auto — centered like Aviator */}
      <div className="flex justify-center">
        <div className="inline-flex items-center bg-[#0d0d0d] rounded-full p-[1px]">
          {['bet', 'auto'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                if (sound) sound.playClick();
                setMode(tab);
              }}
              className={`px-4 py-px rounded-full text-[11px] font-semibold capitalize cursor-pointer transition-colors leading-5 ${
                mode === tab ? 'bg-[#2c2d30] text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab === 'bet' ? 'Bet' : 'Auto'}
            </button>
          ))}
        </div>
      </div>

      {/* Aviator ratio: left ~38% controls, right ~62% BET — compact height, same text sizes */}
      <div className="flex items-stretch gap-1.5">
        <div className="w-[38%] min-w-0 flex flex-col gap-1">
          <div className="flex items-center justify-between bg-[#0d0d0d] rounded-full h-7 px-1">
            <button
              onClick={() => handleAmountChange(amount - 20)}
              disabled={!!activeBet}
              className="w-5 h-5 rounded-full border border-white/35 text-gray-200 flex items-center justify-center text-[13px] font-bold leading-none disabled:opacity-30 active:scale-95 cursor-pointer shrink-0"
            >
              −
            </button>
            <div className="font-bold text-white text-[13px] tracking-tight tabular-nums truncate px-0.5 leading-none">
              {formatAmt(amount)}
            </div>
            <button
              onClick={() => handleAmountChange(amount + 20)}
              disabled={!!activeBet}
              className="w-5 h-5 rounded-full border border-white/35 text-gray-200 flex items-center justify-center text-[13px] font-bold leading-none disabled:opacity-30 active:scale-95 cursor-pointer shrink-0"
            >
              +
            </button>
          </div>

          <div className="grid grid-cols-2 gap-0.5">
            {presets.map((p) => (
              <button
                key={p}
                disabled={!!activeBet}
                onClick={() => handleAmountChange(p)}
                className={`h-5 text-[10px] font-semibold rounded-md cursor-pointer tabular-nums transition-colors leading-none ${
                  amount === p
                    ? 'bg-[#2c2d30] text-white'
                    : 'bg-[#0d0d0d] text-gray-400 hover:text-gray-200'
                } disabled:opacity-40`}
              >
                {formatAmt(p)}
              </button>
            ))}
          </div>

          {mode === 'auto' && (
            <div className="flex items-center justify-between bg-[#0d0d0d] rounded-md h-6 px-2">
              <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide">Auto</span>
              <input
                type="number"
                min="1.01"
                step="0.1"
                value={autoCashout}
                disabled={!!activeBet}
                onChange={(e) => setAutoCashout(Math.max(1.01, parseFloat(e.target.value) || 1.01))}
                className="w-12 bg-transparent text-right text-white text-[11px] font-bold outline-none"
              />
            </div>
          )}
        </div>

        <div className="w-[62%] min-w-0 flex">
          {activeBet && activeBet.status === 'active' && gameState === 'FLYING' ? (
            <button
              onClick={handleActionClick}
              className={`${actionBtn} bg-[#e9a820] text-white animate-pulse`}
            >
              <span className="text-[12px] uppercase tracking-wide opacity-90 font-bold leading-none">Cash Out</span>
              <span className="text-[20px] font-black leading-none tabular-nums">{formatAmt(liveWinAmount)}</span>
            </button>
          ) : activeBet && activeBet.status === 'active' && gameState === 'WAITING' ? (
            <button
              onClick={handleActionClick}
              className={`${actionBtn} bg-[#c0392b] text-white`}
            >
              <span className="text-[12px] uppercase tracking-wide font-bold leading-none">Cancel</span>
              <span className="text-[20px] font-black leading-none tabular-nums">{formatAmt(activeBet.betAmount)}</span>
            </button>
          ) : activeBet && activeBet.status === 'cashed_out' ? (
            <div className={`${actionBtn} bg-[#14301f] border border-emerald-700/40 text-emerald-400 cursor-default`}>
              <span className="text-[12px] uppercase tracking-wide font-bold leading-none">Won</span>
              <span className="text-[20px] font-black leading-none tabular-nums">+{formatAmt(activeBet.winAmount)}</span>
            </div>
          ) : (
            <button
              onClick={handleActionClick}
              disabled={userBalance < amount}
              className={`${actionBtn} bg-[#28a700] text-white shadow-[0_1px_0_#1e7a00,inset_0_1px_0_rgba(255,255,255,0.25)] disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <span className="text-[13px] uppercase tracking-wide font-bold leading-none">BET</span>
              <span className="text-[22px] font-black leading-none tabular-nums">{formatAmt(amount)}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
