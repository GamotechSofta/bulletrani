import React, { useRef, useState } from 'react';
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight
} from './Icons';

const DEFAULT_MULTIPLIERS = [
  1.12, 1.48, 2.05, 1.33, 3.41, 1.07, 5.20, 1.89,
  12.40, 1.56, 2.77, 1.21, 4.08, 1.94, 8.15, 1.38
];

const TONE_CLASS = {
  low: 'text-[#9ca3af]',
  mid: 'text-[#d1d5db]',
  high: 'text-[#c084fc]',
  legendary: 'text-[#fbbf24]'
};

const TONE_PILL = {
  low: 'bg-white/[0.04] border-white/[0.06]',
  mid: 'bg-white/[0.06] border-white/[0.08]',
  high: 'bg-fuchsia-500/10 border-fuchsia-400/25',
  legendary: 'bg-amber-500/10 border-amber-400/30'
};

function toneFor(m) {
  if (m >= 100) return 'legendary';
  if (m >= 10) return 'high';
  if (m >= 2) return 'mid';
  return 'low';
}

export default function RecentMultipliersBar({ history }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const scrollerRef = useRef(null);

  const displayList = (history && history.length > 0)
    ? history.slice(-32).reverse().map((r) => {
        const m = parseFloat((r.crash_multiplier || r.crashMultiplier || 1.0).toFixed(2));
        return { m, tone: toneFor(m), round: r };
      })
    : DEFAULT_MULTIPLIERS.map((m) => ({ m, tone: toneFor(m) }));

  const scrollRibbon = (dir) => {
    if (!scrollerRef.current) return;
    scrollerRef.current.scrollBy({ left: dir * 120, behavior: 'smooth' });
  };

  return (
    <div className="relative w-full max-w-3xl">
      <div className="flex items-center gap-0.5 sm:gap-1.5 bg-[#14161a]/85 backdrop-blur-md border border-white/[0.08] rounded-full px-1 sm:px-1.5 py-0.5 sm:py-1 shadow-lg">
        <button
          type="button"
          onClick={() => scrollRibbon(-1)}
          className="hidden sm:flex w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 items-center justify-center shrink-0 cursor-pointer"
          aria-label="Scroll left"
        >
          <IconChevronLeft className="w-3 h-3" />
        </button>

        <div className="hidden md:flex flex-col items-start pr-1.5 shrink-0 border-r border-white/10 mr-1">
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
              className={`shrink-0 whitespace-nowrap font-semibold ${TONE_CLASS[item.tone] || TONE_CLASS.mid}`}
            >
              {item.m.toFixed(2)}x
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollRibbon(1)}
          className="hidden sm:flex w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 items-center justify-center shrink-0 cursor-pointer"
          aria-label="Scroll right"
        >
          <IconChevronRight className="w-3 h-3" />
        </button>

        <button
          type="button"
          onClick={() => setDropdownOpen((v) => !v)}
          className="w-6 h-6 rounded-full hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center shrink-0 cursor-pointer"
          aria-label="History"
        >
          <IconChevronDown className="w-3 h-3" />
        </button>
      </div>

      {dropdownOpen && (
        <div className="absolute top-9 sm:top-10 left-0 right-0 sm:right-auto sm:w-[22rem] bg-[#0f1218]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.65)] p-3.5 z-30 animate-fade-in">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <div className="font-black text-white text-[11px] uppercase tracking-[0.14em]">
                Past Multipliers
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">Latest rounds · purple ≥ 10x</div>
            </div>
            <button
              type="button"
              onClick={() => setDropdownOpen(false)}
              className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5 max-h-28 sm:max-h-48 overflow-y-auto scrollbar-thin pr-0.5">
            {displayList.map((item, idx) => (
              <div
                key={idx}
                className={`text-center py-1.5 rounded-lg border font-mono text-[11px] font-bold tracking-tight ${TONE_CLASS[item.tone]} ${TONE_PILL[item.tone]}`}
              >
                {item.m.toFixed(2)}x
              </div>
            ))}
          </div>
          <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[9px] text-gray-500 uppercase tracking-wider">
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
  );
}
