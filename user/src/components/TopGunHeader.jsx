import React from 'react';
import {
  IconChevronDown,
  IconWallet,
  IconPlus,
  IconHome
} from './Icons';
import { formatMoney, getUiStrings } from '../currencyLang';

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
  username = 'TopGunPilot',
  balance = 5895.75,
  currency = 'INR',
  lang = 'en',
  showExit = false,
  onExitLobby,
  onOpenWallet,
  onOpenProfile
}) {
  const t = getUiStrings(lang);
  const formattedBalance = formatMoney(balance, currency, lang);

  return (
    <header className="w-full bg-[#0d0f12]/95 border-b border-white/[0.06] px-1.5 sm:px-4 py-1.5 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-3 select-none z-30 shrink-0 safe-top">
      <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
        <CheckeredLogo />

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            onClick={onOpenWallet}
            className="flex items-center gap-0.5 sm:gap-2 bg-[#14161a] border border-white/10 rounded-full pl-1.5 sm:pl-2.5 pr-1 py-1 cursor-pointer"
          >
            <IconWallet className="hidden xs:block w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-300 max-[380px]:hidden" />
            <span className="font-extrabold text-white text-[10px] sm:text-sm font-mono tracking-tight max-w-[64px] sm:max-w-none truncate">
              {formattedBalance}
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
              <img src="/bike-rider.png" alt="" className="w-full h-full object-contain p-0.5" />
            </div>
            <IconChevronDown className="hidden sm:block w-3 h-3 text-gray-400" />
          </button>
        </div>
      </div>

      {showExit && onExitLobby && (
        <button
          type="button"
          onClick={onExitLobby}
          title={t.exitLobby}
          aria-label={t.exitLobby}
          className="flex items-center gap-1 bg-[#14161a] hover:bg-white/10 border border-white/10 rounded-full h-7 sm:h-8 px-2 sm:px-2.5 text-gray-200 text-[10px] sm:text-xs font-bold transition-colors cursor-pointer shrink-0"
        >
          <IconHome className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">{t.exitShort}</span>
        </button>
      )}
    </header>
  );
}
