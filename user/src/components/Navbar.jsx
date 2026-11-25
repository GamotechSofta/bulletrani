import React, { useState } from 'react';

export default function Navbar({
  user,
  soundEnabled,
  onToggleSound,
  onOpenWallet,
  onOpenProvablyFair,
  onOpenHowToPlay,
  onOpenAuth,
  onLogout
}) {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="h-13 sm:h-14 bg-[#0a0b0e] border-b border-white/[0.08] px-3 sm:px-6 flex items-center justify-between shrink-0 z-30 select-none">
      {/* Brand & How to play */}
      <div className="flex items-center gap-3">
        {/* Aviator Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#e51b24] to-[#ff4757] flex items-center justify-center shadow-[0_0_15px_rgba(229,27,36,0.5)]">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
            </svg>
          </div>
          <span className="text-lg font-black tracking-wider text-white" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>
            AVIATOR
          </span>
        </div>

        {/* How to play pill button */}
        <button
          onClick={onOpenHowToPlay}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1b1c23] hover:bg-[#252733] border border-white/10 text-xs font-semibold text-gray-300 transition-all hover:text-white"
        >
          <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 text-[10px] flex items-center justify-center font-bold">?</span>
          <span>How to play</span>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Provably Fair Shield Pill */}
        <button
          onClick={onOpenProvablyFair}
          className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1b1c23] hover:bg-[#252733] border border-white/10 text-xs font-semibold text-gray-300 transition-all hover:text-white"
        >
          <span className="text-emerald-400 text-xs">🛡️</span>
          <span>Provably Fair</span>
        </button>

        {/* Sound Toggle */}
        <button
          onClick={onToggleSound}
          title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
          className="w-8 h-8 rounded-full bg-[#1b1c23] hover:bg-[#252733] border border-white/10 flex items-center justify-center text-xs transition-all text-gray-300 hover:text-white"
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>

        {/* User Balance & Deposit Button */}
        {user ? (
          <div className="flex items-center bg-[#15161d] border border-white/10 rounded-full pl-3.5 pr-1 py-1 shadow-inner">
            <div className="text-right mr-2.5">
              <span className="text-xs sm:text-sm font-black text-white font-mono leading-none">
                ₹{user.balance !== undefined ? user.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
              </span>
            </div>
            <button
              onClick={onOpenWallet}
              className="px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black text-[11px] uppercase tracking-wider shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all active:scale-95"
            >
              Deposit
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(229,34,60,0.4)] transition-all active:scale-95"
          >
            Sign In
          </button>
        )}

        {/* User Profile Avatar / Logout Menu */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-1.5 p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <span className="w-8 h-8 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center text-sm shadow-sm">
                🧑‍✈️
              </span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#181922] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 text-xs animate-fade-in">
                <div className="p-2 border-b border-white/10">
                  <div className="font-bold text-white truncate">{user.username}</div>
                  <div className="text-[10px] text-gray-400 truncate">{user.email}</div>
                  <div className="text-[10px] text-emerald-400 font-semibold mt-1">Verified Pilot</div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => { setProfileOpen(false); onOpenWallet(); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white flex items-center justify-between"
                  >
                    <span>💳 Wallet Ledger</span>
                    <span className="font-mono text-emerald-400 font-bold">₹{user.balance?.toFixed(0)}</span>
                  </button>

                  <button
                    onClick={() => { setProfileOpen(false); onOpenProvablyFair(); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white flex items-center gap-2"
                  >
                    <span>🛡️ Provably Fair</span>
                  </button>

                  <button
                    onClick={() => { setProfileOpen(false); onOpenHowToPlay(); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white flex items-center gap-2"
                  >
                    <span>📖 Game Rules</span>
                  </button>
                </div>

                <div className="pt-1 border-t border-white/10">
                  <button
                    onClick={() => { setProfileOpen(false); onLogout(); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-red-500/20 text-red-400 font-semibold flex items-center gap-2"
                  >
                    <span>🚪 Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
