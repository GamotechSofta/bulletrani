import React from 'react';
import { Menu, Shield, LogOut } from 'lucide-react';

export default function AdminHeader({ adminUser, liveRound, onLogout, onMenuToggle }) {
  return (
    <header className="h-16 bg-[#0f131d] border-b border-white/10 px-4 sm:px-6 flex items-center justify-between shrink-0  z-20">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuToggle}
          className="lg:hidden shrink-0 w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 flex items-center justify-center"
          aria-label="Open menu"
        >
          <Menu size={18} strokeWidth={2.25} />
        </button>
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white shadow-[0_0_15px_rgba(229,34,60,0.4)] shrink-0">
          <Shield size={18} strokeWidth={2.25} />
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-black tracking-wide text-white uppercase truncate" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>
            Bullet Rani Admin
          </h1>
          <span className="text-[10px] text-gray-400 hidden sm:block">Enterprise Risk Management & Financial Ledger</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <div className="hidden md:flex items-center gap-2.5 bg-black/40 border border-white/10 px-3.5 py-1.5 rounded-xl">
          <span className={`w-2.5 h-2.5 rounded-full ${liveRound.state === 'FLYING' ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
          <div className="text-xs">
            <span className="text-gray-400 mr-1.5">Round #{liveRound.roundNumber}:</span>
            <span className="font-bold text-white font-mono" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>
              {liveRound.state} @ {liveRound.multiplier.toFixed(2)}x
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="text-right hidden sm:block">
            <div className="text-white font-bold">{adminUser.username}</div>
            <div className="text-[9px] text-emerald-400 uppercase font-semibold">Super Admin</div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-300 border border-white/10 text-gray-300 transition-all font-semibold"
          >
            <LogOut size={14} strokeWidth={2.25} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
