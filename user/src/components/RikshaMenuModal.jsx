import React from 'react';
import {
  IconPlane,
  IconWallet,
  IconVolumeUp,
  IconVolumeMute
} from './Icons';

function ToggleRow({ label, hint, enabled, onToggle }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
      <div>
        <div className="font-semibold text-gray-200">{label}</div>
        {hint && <div className="text-[10px] text-gray-500 mt-0.5">{hint}</div>}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
          enabled ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-400'
        }`}
      >
        {enabled ? (
          <>
            <IconVolumeUp className="w-3.5 h-3.5" />
            <span>ON</span>
          </>
        ) : (
          <>
            <IconVolumeMute className="w-3.5 h-3.5" />
            <span>OFF</span>
          </>
        )}
      </button>
    </div>
  );
}

export default function RikshaMenuModal({
  user,
  soundEnabled,
  musicEnabled,
  onToggleSound,
  onToggleMusic,
  onOpenWallet,
  onOpenHowToPlay,
  onOpenAuth,
  onLogout,
  onClose
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-[#101c27] border border-white/10 rounded-3xl max-w-sm w-full p-6 text-white shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold p-1 rounded-lg cursor-pointer"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 mb-5 border-b border-white/10 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <IconPlane className="w-6 h-6 -rotate-45" />
          </div>
          <div>
            <h3 className="text-base font-black tracking-wide" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>
              TOPGUN MENU
            </h3>
            <p className="text-xs text-gray-400">Settings & Wallet</p>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <ToggleRow
            label="Music"
            hint="Background soundtrack"
            enabled={musicEnabled}
            onToggle={onToggleMusic}
          />
          <ToggleRow
            label="Sound"
            hint="Bike, crash & UI effects"
            enabled={soundEnabled}
            onToggle={onToggleSound}
          />

          {/* Wallet */}
          <button
            onClick={() => { onClose(); onOpenWallet(); }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-black/40 hover:bg-white/5 border border-white/5 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <IconWallet className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-gray-200">My Wallet (Deposit / Withdraw)</span>
            </div>
            <span className="font-mono text-emerald-400 font-bold">₹{user?.balance?.toFixed(2)}</span>
          </button>

          {/* How to Play */}
          <button
            onClick={() => { onClose(); onOpenHowToPlay(); }}
            className="w-full flex items-center gap-2.5 p-3 rounded-xl bg-black/40 hover:bg-white/5 border border-white/5 text-left transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="font-semibold text-gray-200">Game Rules & Strategy</span>
          </button>

          {/* User Profile / Auth */}
          {user ? (
            <button
              onClick={() => { onClose(); onLogout(); }}
              className="w-full flex items-center gap-2.5 p-3 rounded-xl bg-red-950/30 hover:bg-red-900/40 border border-red-500/20 text-red-300 font-bold text-left transition-colors mt-2 cursor-pointer"
            >
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out ({user.username})</span>
            </button>
          ) : (
            <button
              onClick={() => { onClose(); onOpenAuth(); }}
              className="w-full py-3 rounded-xl bg-[#34d399] hover:bg-[#10b981] text-black font-black text-center text-sm shadow-md transition-all mt-2 cursor-pointer"
            >
              Sign In / Register
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
