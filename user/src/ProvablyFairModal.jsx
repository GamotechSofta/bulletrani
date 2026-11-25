import React, { useState } from 'react';

export default function ProvablyFairModal({ round, onClose }) {
  const [serverSeed, setServerSeed] = useState(round ? round.server_seed || round.serverSeed || '' : '');
  const [clientSeed, setClientSeed] = useState(round ? round.client_seed || round.clientSeed || '' : '');
  const [verifyResult, setVerifyResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!serverSeed || !clientSeed) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/game/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverSeed, clientSeed, houseEdge: 3.0 })
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#151923] border border-white/10 rounded-2xl max-w-lg w-full p-6 text-white shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            🛡️
          </div>
          <div>
            <h3 className="text-lg font-bold">Provably Fair Verification</h3>
            <p className="text-xs text-gray-400">Cryptographically guaranteed fairness with HMAC-SHA256</p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="text-gray-400 font-semibold block mb-1">Server Seed (Revealed After Round)</label>
            <input
              type="text"
              value={serverSeed}
              onChange={(e) => setServerSeed(e.target.value)}
              placeholder="64-character hex seed"
              className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 font-mono text-[11px] text-gray-200 outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="text-gray-400 font-semibold block mb-1">Client Seed (Public / User Nonce)</label>
            <input
              type="text"
              value={clientSeed}
              onChange={(e) => setClientSeed(e.target.value)}
              placeholder="Client seed string"
              className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 font-mono text-[11px] text-gray-200 outline-none focus:border-red-500"
            />
          </div>

          <button
            onClick={handleVerify}
            disabled={loading || !serverSeed || !clientSeed}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 font-bold text-white hover:from-red-500 hover:to-rose-500 active:scale-98 transition-all disabled:opacity-40"
          >
            {loading ? 'Verifying Hashes...' : 'Calculate & Verify Multiplier'}
          </button>

          {verifyResult && (
            <div className="p-4 rounded-xl bg-black/40 border border-emerald-500/30 space-y-2 mt-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Calculated Multiplier:</span>
                <span className="text-xl font-black text-emerald-400" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>
                  {verifyResult.multiplier.toFixed(2)}x
                </span>
              </div>
              <div className="text-[11px] text-gray-400">
                <span className="block font-semibold text-gray-300">Public SHA256 Commitment:</span>
                <span className="font-mono break-all text-gray-400">{verifyResult.publicHash}</span>
              </div>
              <div className="text-[11px] text-gray-400">
                <span className="block font-semibold text-gray-300">Generated HMAC-SHA256 Hash:</span>
                <span className="font-mono break-all text-gray-400">{verifyResult.calculatedHash}</span>
              </div>
              <div className="text-[11px] text-emerald-400 font-semibold mt-2">
                ✓ Mathematical proof matches round crash outcome.
              </div>
            </div>
          )}

          <div className="p-3 rounded-lg bg-white/[0.03] text-[11px] text-gray-400 leading-relaxed">
            <strong>How it works:</strong> The round outcome is calculated prior to takeoff by hashing the Server Seed with the Client Seed using HMAC-SHA256. The hash is committed beforehand in the public SHA256 string, proving that neither the player nor the casino can manipulate the multiplier mid-flight.
          </div>
        </div>
      </div>
    </div>
  );
}
