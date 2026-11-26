import React, { useEffect, useState } from 'react';

const inr = (n) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusStyle = {
  active: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  configured: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  disabled: 'bg-white/5 border-white/10 text-gray-400',
  historical: 'bg-white/5 border-white/10 text-gray-500'
};

/**
 * Admin controls for Provider wallet / launch integration + per-provider finance.
 */
export default function ProviderTab({ token, apiBase, onAlert }) {
  const [form, setForm] = useState({
    enabled: false,
    apiUrl: 'https://api.dpbossking.com/api/v1',
    apiKey: '',
    tableId: 'bulletrani_main',
    gameCode: 'BULLETRANI'
  });
  const [meta, setMeta] = useState({ active: false, apiKeyConfigured: false, apiKeyMasked: '', walletMode: 'local' });
  const [providers, setProviders] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lookupToken, setLookupToken] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState(null);

  const loadProviders = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiBase}/admin/providers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setProviders(data.providers || []);
        setTotals(data.totals || null);
      }
    } catch {
      onAlert?.('Failed to load provider finance');
    }
  };

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/admin/provider`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.provider) {
        const p = data.provider;
        setForm({
          enabled: !!p.enabled,
          apiUrl: p.apiUrl || '',
          apiKey: '',
          tableId: p.tableId || 'bulletrani_main',
          gameCode: p.gameCode || 'BULLETRANI'
        });
        setMeta({
          active: !!p.active,
          apiKeyConfigured: !!p.apiKeyConfigured,
          apiKeyMasked: p.apiKeyMasked || '',
          walletMode: p.walletMode || 'local'
        });
      }
      await loadProviders();
    } catch (e) {
      onAlert?.('Failed to load Provider settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        enabled: form.enabled,
        apiUrl: form.apiUrl,
        tableId: form.tableId,
        gameCode: form.gameCode
      };
      if (form.apiKey.trim()) body.apiKey = form.apiKey.trim();

      const res = await fetch(`${apiBase}/admin/provider`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!data.success) {
        onAlert?.(data.error || 'Save failed');
        return;
      }
      onAlert?.('Provider settings saved — wallet mode: ' + (data.provider?.walletMode || 'local'));
      setForm((f) => ({ ...f, apiKey: '' }));
      await load();
    } catch {
      onAlert?.('Failed to save Provider settings');
    } finally {
      setSaving(false);
    }
  };

  const lookupSession = async (e) => {
    e.preventDefault();
    setLookupResult(null);
    setLookupError(null);
    try {
      const res = await fetch(`${apiBase}/admin/provider/session-lookup`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionToken: lookupToken.trim() })
      });
      const data = await res.json();
      if (!data.success) {
        setLookupError(data.error || 'Lookup failed');
        return;
      }
      setLookupResult(data);
    } catch {
      setLookupError('Lookup request failed');
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-400">Loading Provider settings…</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in ">
      {/* Integrated providers + finance */}
      <div className="bg-[#121622] border border-white/10 rounded-2xl p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-bold text-white mb-1">Integrated Providers</h3>
            <p className="text-xs text-gray-400">
              Volume, payout and gross profit (GGR) per wallet source. New provider bets are tagged after this update.
            </p>
          </div>
          <button
            type="button"
            onClick={loadProviders}
            className="shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-white/10 text-gray-300 hover:bg-white/5"
          >
            Refresh
          </button>
        </div>

        {totals && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div className="bg-black/40 border border-white/5 rounded-xl p-4">
              <div className="text-[10px] uppercase text-gray-500 font-semibold">Gross All (GGR)</div>
              <div className="text-xl font-black text-emerald-400 font-mono mt-1">₹{inr(totals.grossGamingRevenue)}</div>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-4">
              <div className="text-[10px] uppercase text-gray-500 font-semibold">Total Volume</div>
              <div className="text-xl font-black text-white font-mono mt-1">₹{inr(totals.totalVolume)}</div>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-4">
              <div className="text-[10px] uppercase text-gray-500 font-semibold">Total Payout</div>
              <div className="text-xl font-black text-amber-400 font-mono mt-1">₹{inr(totals.totalPayout)}</div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-black/50 text-gray-400 uppercase tracking-wider text-[10px]">
                <th className="text-left p-3 font-semibold">Provider</th>
                <th className="text-left p-3 font-semibold">Status</th>
                <th className="text-right p-3 font-semibold">Volume</th>
                <th className="text-right p-3 font-semibold">Payout</th>
                <th className="text-right p-3 font-semibold">GGR (Profit)</th>
                <th className="text-right p-3 font-semibold">RTP</th>
                <th className="text-right p-3 font-semibold">Bets</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3">
                    <div className="font-bold text-white">{p.name}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      {p.type === 'local' ? 'Direct / demo wallet' : (
                        <>
                          {p.gameCode && <span className="font-mono text-gray-400">{p.gameCode}</span>}
                          {p.apiUrl && <span className="ml-2 truncate max-w-[180px] inline-block align-bottom">{p.apiUrl}</span>}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-lg border text-[10px] font-bold uppercase ${statusStyle[p.status] || statusStyle.disabled}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono text-white">₹{inr(p.totalVolume)}</td>
                  <td className="p-3 text-right font-mono text-gray-300">₹{inr(p.totalPayout)}</td>
                  <td className={`p-3 text-right font-mono font-bold ${(p.grossGamingRevenue || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ₹{inr(p.grossGamingRevenue)}
                  </td>
                  <td className="p-3 text-right font-mono text-amber-400">{Number(p.actualRTP || 0).toFixed(2)}%</td>
                  <td className="p-3 text-right font-mono text-gray-400">{p.betCount || 0}</td>
                </tr>
              ))}
              {providers.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-500">No providers found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[#121622] border border-white/10 rounded-2xl p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-bold text-white mb-1">Provider Integration</h3>
            <p className="text-xs text-gray-400">
              Seamless wallet for operator launches (<code className="text-gray-300">?sessionToken=</code>).
              Must match the game record on the Provider admin panel.
            </p>
          </div>
          <div
            className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border ${
              meta.active
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-white/5 border-white/10 text-gray-400'
            }`}
          >
            {meta.walletMode === 'provider' ? 'Wallet: Provider' : 'Wallet: Local'}
          </div>
        </div>

        <form onSubmit={save} className="space-y-4 text-xs">
          <label className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-white/5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="accent-red-500 w-4 h-4"
            />
            <div>
              <div className="font-semibold text-gray-200">Enable Provider wallet</div>
              <div className="text-[10px] text-gray-500">
                When on (and API key set), bets/cashouts use Provider debit/credit instead of local balance.
              </div>
            </div>
          </label>

          <div>
            <label className="text-gray-300 block mb-1 font-semibold">Gateway API URL</label>
            <input
              value={form.apiUrl}
              onChange={(e) => setForm({ ...form, apiUrl: e.target.value })}
              placeholder="https://api.dpbossking.com/api/v1"
              className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-300 block mb-1 font-semibold">Game code</label>
              <input
                value={form.gameCode}
                onChange={(e) => setForm({ ...form, gameCode: e.target.value.toUpperCase() })}
                placeholder="BULLETRANI"
                className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 font-mono"
              />
              <p className="text-[10px] text-gray-500 mt-1">Must match Provider admin game <code>code</code> / launch <code>gameCode</code>.</p>
            </div>
            <div>
              <label className="text-gray-300 block mb-1 font-semibold">Default table ID</label>
              <input
                value={form.tableId}
                onChange={(e) => setForm({ ...form, tableId: e.target.value })}
                className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-gray-300 block mb-1 font-semibold">Game-server API key</label>
            <input
              type="password"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              placeholder={meta.apiKeyConfigured ? `Configured (${meta.apiKeyMasked}) — leave blank to keep` : 'Paste GAME_SERVER_API_KEY'}
              className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 font-mono"
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 font-bold text-sm text-white hover:from-red-500 hover:to-rose-500 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(229,34,60,0.35)]"
          >
            {saving ? 'Saving…' : 'Save Provider settings'}
          </button>
        </form>
      </div>

      <div className="bg-[#121622] border border-white/10 rounded-2xl p-6 shadow-lg">
        <h3 className="text-base font-bold text-white mb-1">Session lookup</h3>
        <p className="text-xs text-gray-400 mb-4">
          Paste a player <code className="text-gray-300">sessionToken</code> to fetch Provider balance/profile (support).
        </p>
        <form onSubmit={lookupSession} className="flex gap-2">
          <input
            value={lookupToken}
            onChange={(e) => setLookupToken(e.target.value)}
            placeholder="sessionToken…"
            className="flex-1 bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 font-mono"
          />
          <button
            type="submit"
            className="px-4 rounded-xl bg-white/10 border border-white/10 text-xs font-bold text-white hover:bg-white/15"
          >
            Lookup
          </button>
        </form>
        {lookupError && (
          <p className="mt-3 text-xs text-red-400">{lookupError}</p>
        )}
        {lookupResult && (
          <pre className="mt-3 text-[11px] text-emerald-300/90 bg-black/40 border border-white/5 rounded-xl p-3 overflow-auto max-h-56">
            {JSON.stringify({ balance: lookupResult.balance, profile: lookupResult.profile }, null, 2)}
          </pre>
        )}
      </div>

      <div className="text-[11px] text-gray-500 leading-relaxed px-1">
        Operator create / enabled-games assignment still happens on the Provider platform admin
        (<span className="text-gray-400">admin.dpbossking.com</span>). This panel configures the BulletRani game server side only.
      </div>
    </div>
  );
}
