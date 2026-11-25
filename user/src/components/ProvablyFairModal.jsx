import React, { useState } from 'react';
import { API_BASE } from '../config';

export default function ProvablyFairModal({ round, onClose }) {
  const [serverSeed, setServerSeed] = useState(round ? round.server_seed || round.serverSeed || '' : '');
  const [clientSeed, setClientSeed] = useState(round ? round.client_seed || round.clientSeed || '' : '');
  const [nonce, setNonce] = useState(
    round ? String(round.nonce ?? round.round_number ?? round.roundNumber ?? '') : ''
  );
  const [seedHash, setSeedHash] = useState(
    round ? round.seed_hash || round.publicHash || round.public_hash || '' : ''
  );
  const [verifyResult, setVerifyResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleVerify = async () => {
    if (!serverSeed || !clientSeed) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/game/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverSeed,
          clientSeed,
          houseEdge: 3.0,
          nonce: Number(nonce) || 0,
          seedHash: seedHash || null,
          prevChainHash: round?.prev_chain_hash || round?.prevChainHash || null,
          chainHash: round?.chain_hash || round?.chainHash || null
        })
      });
      const data = await res.json();
      if (data.success) {
        setVerifyResult(data.verification);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-[#141824] border border-white/10 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold p-1 rounded-lg"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xl">
            🛡️
          </div>
          <div>
            <h3 className="text-lg font-black tracking-wide" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>
              PROVABLY FAIR VERIFIER
            </h3>
            <p className="text-xs text-gray-400">HMAC-SHA256 + seed commitment + per-round nonce</p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-gray-300 font-semibold">Server Seed (revealed after crash)</label>
              {serverSeed && (
                <button
                  onClick={() => handleCopy(serverSeed)}
                  className="text-[10px] text-emerald-400 hover:underline"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>
            <input
              type="text"
              value={serverSeed}
              onChange={(e) => setServerSeed(e.target.value)}
              placeholder="64-character hex seed"
              className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 font-mono text-[11px] text-gray-200 outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="text-gray-300 font-semibold block mb-1">Client Seed</label>
            <input
              type="text"
              value={clientSeed}
              onChange={(e) => setClientSeed(e.target.value)}
              placeholder="Client seed string"
              className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 font-mono text-[11px] text-gray-200 outline-none focus:border-red-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-300 font-semibold block mb-1">Nonce (round #)</label>
              <input
                type="text"
                value={nonce}
                onChange={(e) => setNonce(e.target.value)}
                placeholder="e.g. 1001"
                className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 font-mono text-[11px] text-gray-200 outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="text-gray-300 font-semibold block mb-1">Pre-published Seed Hash</label>
              <input
                type="text"
                value={seedHash}
                onChange={(e) => setSeedHash(e.target.value)}
                placeholder="Optional commitment check"
                className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 font-mono text-[11px] text-gray-200 outline-none focus:border-red-500"
              />
            </div>
          </div>

          <button
            onClick={handleVerify}
            disabled={loading || !serverSeed || !clientSeed}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 font-bold text-sm text-white hover:from-red-500 hover:to-rose-500 active:scale-98 transition-all disabled:opacity-40 shadow-[0_0_20px_rgba(229,34,60,0.4)]"
          >
            {loading ? 'Calculating Hashes...' : 'Calculate & Verify Multiplier'}
          </button>

          {verifyResult && (
            <div className="p-4 rounded-2xl bg-black/50 border border-emerald-500/30 space-y-2.5 mt-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">Crash Multiplier Result:</span>
                <span className="text-2xl font-black text-emerald-400 font-mono" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>
                  {verifyResult.multiplier.toFixed(2)}x
                </span>
              </div>
              <div className="text-[11px] text-gray-400">
                <span className="block font-semibold text-gray-300">HMAC message:</span>
                <span className="font-mono break-all text-gray-400">{verifyResult.message}</span>
              </div>
              <div className="text-[11px] text-gray-400">
                <span className="block font-semibold text-gray-300">Public SHA-256 (seed commitment):</span>
                <span className="font-mono break-all text-gray-400">{verifyResult.publicHash}</span>
              </div>
              <div className="text-[11px] text-gray-400">
                <span className="block font-semibold text-gray-300">HMAC-SHA256 outcome hash:</span>
                <span className="font-mono break-all text-gray-400">{verifyResult.calculatedHash}</span>
              </div>
              {seedHash && (
                <div className={`text-[11px] font-bold ${verifyResult.seedHashMatches ? 'text-emerald-400' : 'text-red-400'}`}>
                  {verifyResult.seedHashMatches
                    ? '✓ Revealed seed matches pre-published hash'
                    : '✗ Seed does NOT match pre-published hash'}
                </div>
              )}
              {verifyResult.chain && (
                <div className={`text-[11px] font-bold ${verifyResult.chain.valid ? 'text-emerald-400' : 'text-red-400'}`}>
                  {verifyResult.chain.valid
                    ? '✓ Hash-chain link is valid'
                    : '✗ Hash-chain link mismatch'}
                </div>
              )}
            </div>
          )}

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-gray-400 leading-relaxed">
            <strong>How fairness works:</strong> Before takeoff the house publishes{' '}
            <code className="text-gray-300">SHA256(serverSeed)</code> and a public nonce.
            Outcome = <code className="text-gray-300">HMAC(serverSeed, clientSeed:nonce)</code>.
            After crash the seed is revealed so anyone can verify the commitment and multiplier.
            Rounds are also linked in a hash chain so history cannot be silently reordered.
          </div>
        </div>
      </div>
    </div>
  );
}
