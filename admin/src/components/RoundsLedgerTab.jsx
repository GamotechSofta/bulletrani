import React, { useState } from 'react';

export default function RoundsLedgerTab({ history, onRefresh }) {
  const [searchRound, setSearchRound] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const filteredHistory = history.filter((r) =>
    !searchRound || String(r.round_number || r.roundNumber).includes(searchRound)
  );

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-[#121622] border border-white/10 rounded-2xl p-5 shadow-lg  animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Provably Fair Round Audit Trail</h3>
          <p className="text-xs text-gray-400">Cryptographically verifiable outcomes generated with HMAC-SHA256</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search round number..."
            value={searchRound}
            onChange={(e) => setSearchRound(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-red-500 w-44 font-mono"
          />
          <button
            onClick={onRefresh}
            className="text-xs px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold transition-all"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-black/30 text-gray-400 uppercase text-[10px]">
            <tr>
              <th className="p-3">Round #</th>
              <th className="p-3 text-right">Crash</th>
              <th className="p-3">Nonce</th>
              <th className="p-3">Seed Hash (commitment)</th>
              <th className="p-3">Server Seed</th>
              <th className="p-3">Client Seed</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono text-[11px]">
            {filteredHistory.length > 0 ? (
              filteredHistory.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="p-3 text-gray-300 font-bold">#{r.round_number || r.roundNumber}</td>
                  <td className="p-3 text-right font-black text-amber-400 text-sm">
                    {(r.crash_multiplier || r.crashMultiplier).toFixed(2)}x
                  </td>
                  <td className="p-3 text-gray-300">{r.nonce ?? r.round_number ?? '—'}</td>
                  <td className="p-3 text-gray-400 truncate max-w-[160px]" title={r.seed_hash || r.publicHash || r.hash}>
                    {r.seed_hash || r.publicHash || r.hash}
                  </td>
                  <td className="p-3 text-gray-400 truncate max-w-[160px]" title={r.server_seed || r.serverSeed}>
                    {r.server_seed || r.serverSeed}
                  </td>
                  <td className="p-3 text-gray-400 truncate max-w-[120px]" title={r.client_seed || r.clientSeed}>
                    {r.client_seed || r.clientSeed}
                  </td>
                  <td className="p-3 text-right font-sans">
                    <button
                      onClick={() => handleCopy(r.server_seed || r.serverSeed, r.id)}
                      className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-gray-300 font-semibold"
                    >
                      {copiedId === r.id ? 'Copied' : 'Copy Seed'}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center p-8 text-gray-500 font-sans italic">
                  No matching rounds found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
