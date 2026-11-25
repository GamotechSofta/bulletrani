import React, { useRef, useState } from 'react';
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconWallet,
  IconPlus
} from './Icons';

function CheckeredLogo() {
  return (
    <div className="flex items-center gap-1.5 shrink-0 cursor-pointer select-none">
      <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden border border-white/15">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(45deg, #111 25%, transparent 25%), linear-gradient(-45deg, #111 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #111 75%), linear-gradient(-45deg, transparent 75%, #111 75%)',
            backgroundSize: '8px 8px',
            backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0',
            backgroundColor: '#d4d4d4'
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/45">
          <span className="font-black text-white/90 text-[10px] sm:text-xs tracking-tight">BR</span>
        </div>
      </div>
      <div className="leading-none hidden md:block">
        <div className="font-black text-white text-base tracking-tight">
          Bullet<span className="text-red-400"> Rani</span>
        </div>
        <div className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.18em] mt-0.5">
          Crash Race
        </div>
      </div>
    </div>
  );
}

export default function TopGunHeader({
  history,
  username = 'TopGunPilot',
  balance = 5895.75,
  onOpenWallet,
  onSelectRound,
  onOpenProfile
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const scrollerRef = useRef(null);

  const toneFor = (m) => {
    if (m >= 100) return 'legendary';
    if (m >= 10) return 'high';
    if (m >= 2) return 'mid';
    return 'low';
  };

  const toneClass = {
    low: 'text-[#9ca3af]',
    mid: 'text-[#d1d5db]',
    high: 'text-[#c084fc]',
    legendary: 'text-[#fbbf24]'
  };

  const tonePill = {
    low: 'bg-white/[0.04] border-white/[0.06]',
    mid: 'bg-white/[0.06] border-white/[0.08]',
    high: 'bg-fuchsia-500/10 border-fuchsia-400/25',
    legendary: 'bg-amber-500/10 border-amber-400/30'
  };

  const defaultMultipliers = [
    1.12, 1.48, 2.05, 1.33, 3.41, 1.07, 5.20, 1.89,
    12.40, 1.56, 2.77, 1.21, 4.08, 1.94, 8.15, 1.38
  ].map((m) => ({ m, tone: toneFor(m) }));

  const displayList = (history && history.length > 0)
    ? history.slice(-32).reverse().map((r) => {
        const m = parseFloat((r.crash_multiplier || r.crashMultiplier || 1.0).toFixed(2));
        return { m, tone: toneFor(m), round: r };
      })
    : defaultMultipliers;

  const scrollRibbon = (dir) => {
    if (!scrollerRef.current) return;
    scrollerRef.current.scrollBy({ left: dir * 120, behavior: 'smooth' });
  };

  const shortBalance = balance.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return (
    <header className="w-full bg-[#0d0f12]/95 border-b border-white/[0.06] px-1.5 sm:px-4 py-1.5 sm:py-2.5 flex items-center justify-between gap-1 sm:gap-3 select-none z-30 shrink-0 safe-top">
      <CheckeredLogo />

      <div className="relative flex-1 min-w-0 max-w-3xl mx-0.5 sm:mx-2">
        <div className="flex items-center gap-0.5 sm:gap-1.5 bg-[#14161a]/95 border border-white/[0.08] rounded-full px-1 sm:px-1.5 py-0.5 sm:py-1">
          <button
            onClick={() => scrollRibbon(-1)}
            className="hidden sm:flex w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 items-center justify-center shrink-0 cursor-pointer"
            aria-label="Scroll left"
          >
            <IconChevronLeft className="w-3 h-3" />
          </button>

          <div className="hidden lg:flex flex-col items-start pr-1 shrink-0 border-r border-white/10 mr-1">
            <span className="text-[8px] font-extrabold text-gray-400 uppercase tracking-wider leading-none">Recent</span>
            <span className="text-[8px] font-extrabold text-gray-500 uppercase tracking-wider leading-none mt-0.5">Multipliers</span>
          </div>

          <div
            ref={scrollerRef}
            className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5 flex-1 text-[10px] sm:text-xs font-mono font-bold touch-pan-x"
          >
            {displayList.map((item, idx) => (
              <span
                key={idx}
                className={`shrink-0 whitespace-nowrap font-semibold ${toneClass[item.tone] || toneClass.mid}`}
              >
                {item.m.toFixed(2)}x
              </span>
            ))}
          </div>

          <button
            onClick={() => scrollRibbon(1)}
            className="hidden sm:flex w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 items-center justify-center shrink-0 cursor-pointer"
            aria-label="Scroll right"
          >
            <IconChevronRight className="w-3 h-3" />
          </button>

          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-6 h-6 rounded-full hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="History"
          >
            <IconChevronDown className="w-3 h-3" />
          </button>
        </div>

        {dropdownOpen && (
          <div className="absolute top-9 left-0 right-0 sm:left-0 sm:right-auto sm:w-[22rem] bg-[#0f1218] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.55)] p-3.5 z-50 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-black text-white text-[11px] uppercase tracking-[0.14em]">
                  Past Multipliers
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">Latest rounds · purple ≥ 10x</div>
              </div>
              <button
                onClick={() => setDropdownOpen(false)}
                className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5 max-h-52 overflow-y-auto scrollbar-thin pr-0.5">
              {displayList.map((item, idx) => (
                <div
                  key={idx}
                  className={`text-center py-1.5 rounded-lg border font-mono text-[11px] font-bold tracking-tight ${toneClass[item.tone]} ${tonePill[item.tone]}`}
                >
                  {item.m.toFixed(2)}x
                </div>
              ))}
            </div>
            <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[9px] text-gray-500 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Low
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-200" /> Mid
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400" /> 10x+
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> 100x+
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
        <button
          onClick={onOpenWallet}
          className="flex items-center gap-0.5 sm:gap-2 bg-[#14161a] border border-white/10 rounded-full pl-1.5 sm:pl-2.5 pr-1 py-1 cursor-pointer"
        >
          <IconWallet className="hidden xs:block w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-300 max-[380px]:hidden" />
          <span className="font-extrabold text-white text-[10px] sm:text-sm font-mono tracking-tight max-w-[64px] sm:max-w-none truncate">
            ₹{shortBalance}
          </span>
          <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#28a700] text-white flex items-center justify-center shrink-0">
            <IconPlus className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
          </span>
        </button>

        <button
          onClick={onOpenProfile}
          className="flex items-center gap-1 bg-[#14161a] border border-white/10 rounded-full p-0.5 sm:pl-1 sm:pr-2 sm:py-1 cursor-pointer"
          aria-label={username}
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-white/15 bg-black/60">
            <img src="/bike.png" alt="" className="w-full h-full object-contain p-0.5" />
          </div>
          <IconChevronDown className="hidden sm:block w-3 h-3 text-gray-400" />
        </button>
      </div>
    </header>
  );
}
