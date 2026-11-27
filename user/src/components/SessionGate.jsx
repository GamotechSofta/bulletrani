import React from 'react';
import { exitGame } from '../operationsBoot';

/**
 * Blocks gameplay when launch session validation fails or session expires (ERR-0011/0012/0013).
 */
export default function SessionGate({ title, message, hint, closeUrl, showExit = false }) {
  const canExit = !!closeUrl || showExit;
  return (
    <div className="min-h-dvh bg-[#050b14] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-3xl border border-white/10 bg-[#121622] p-6 shadow-2xl text-center">
        <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
          <span className="text-red-400 text-lg font-black">!</span>
        </div>
        <h1
          className="text-xl font-black tracking-wide mb-2"
          style={{ fontFamily: "'Chakra Petch', sans-serif" }}
        >
          {title || 'Session unavailable'}
        </h1>
        <p className="text-sm text-gray-400 leading-relaxed mb-5">{message}</p>
        <p className="text-[11px] text-gray-500">
          {hint || (
            <>
              Open this game from your operator lobby so a valid{' '}
              <code className="text-gray-300">sessionToken</code> is issued.
            </>
          )}
        </p>
        {canExit && (
          <button
            type="button"
            onClick={() => exitGame(closeUrl)}
            className="mt-5 inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            Return to Lobby
          </button>
        )}
      </div>
    </div>
  );
}
