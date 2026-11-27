import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Check, RefreshCw, ShieldAlert, Play, KeyRound, Globe, Wallet } from 'lucide-react';

const inr = (n) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const QUERY_PARAM_SPEC = [
  { key: 'token', required: true, desc: 'Unique session token. Forwarded to game backend for 2051/2052 wallet calls.' },
  { key: 'partner_code', required: true, desc: 'Uppercase operator code (e.g. ALPHA-TEST).' },
  { key: 'gid', required: true, desc: 'Game ID passed on launch (also sent in 2052 credit-transfer).' },
  { key: 'game_code', required: true, desc: 'Catalog game code (e.g. BULLETRANI).' },
  { key: 'username', required: true, desc: 'Player display name for in-game HUD.' },
  { key: 'user_id', required: false, desc: 'Operator player ID (sent if provided during 1050 login).' },
  { key: 'currency', required: false, desc: '3-letter ISO currency code for formatting bets and balances.' },
  { key: 'lang', required: false, desc: 'Lowercase language code (from launch ?lang or login) for UI localization.' },
  { key: 'extsess', required: false, desc: 'External session reference (persisted by operations, sent on 2051/2052).' },
  { key: 'close_url', required: false, desc: 'Lobby URL for the game Home / Exit button.' }
];

const INITIAL_TEST_PARAMS = {
  token: 'tok_demo_launch_123456',
  partner_code: 'ALPHA-TEST',
  gid: '1001',
  game_code: 'BULLETRANI',
  username: 'DemoPilot',
  user_id: '4201',
  currency: 'INR',
  lang: 'en',
  extsess: 'ext_ref_001',
  close_url: 'https://lobby.example.com'
};

/**
 * Separate admin tab for managing Operations Service HTTP 302 Launch & Boot,
 * server-to-server 2051/2052 wallet integration (X-Internal-Key), and per-partner finance.
 */
export default function OperationsTab({ token, apiBase, onAlert }) {
  const [form, setForm] = useState({
    enabled: false,
    apiUrl: 'https://operations.dpbossking.com',
    internalKey: '',
    clearInternalKey: false,
    launchUrl: '',
    gameCode: 'BULLETRANI',
    gid: '',
    allowedPartnerCodes: '',
    defaultCurrency: 'INR',
    defaultLang: 'en',
    defaultCloseUrl: '',
    strictParams: true,
    showExitButton: true,
    retryCount: 2
  });
  const [meta, setMeta] = useState({
    active: false,
    internalKeyConfigured: false,
    internalKeyMasked: '',
    walletPathPrefix: '/api/v1/wallet/*'
  });
  const [finance, setFinance] = useState(null);
  const [recentLaunches, setRecentLaunches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [testParams, setTestParams] = useState(INITIAL_TEST_PARAMS);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState(null);
  const [testing, setTesting] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const [balToken, setBalToken] = useState('');
  const [balPartner, setBalPartner] = useState('ALPHA-TEST');
  const [balResult, setBalResult] = useState(null);
  const [balError, setBalError] = useState(null);
  const [balChecking, setBalChecking] = useState(false);
  const [aborting, setAborting] = useState(false);

  const applyLoadedData = useCallback((data) => {
    const o = data.operations || {};
    setForm({
      enabled: !!o.enabled,
      apiUrl: o.apiUrl || 'https://operations.dpbossking.com',
      internalKey: '',
      clearInternalKey: false,
      launchUrl: o.launchUrl || '',
      gameCode: o.gameCode || 'BULLETRANI',
      gid: o.gid || '',
      allowedPartnerCodes: o.allowedPartnerCodes || '',
      defaultCurrency: o.defaultCurrency || 'INR',
      defaultLang: o.defaultLang || 'en',
      defaultCloseUrl: o.defaultCloseUrl || '',
      strictParams: o.strictParams !== false,
      showExitButton: o.showExitButton !== false,
      retryCount: o.retryCount != null ? Number(o.retryCount) : 2
    });
    setMeta({
      active: !!o.active,
      internalKeyConfigured: !!o.internalKeyConfigured,
      internalKeyMasked: o.internalKeyMasked || '',
      walletPathPrefix: o.walletPathPrefix || '/api/v1/wallet/*'
    });
    setFinance(data.finance || null);
    setRecentLaunches(data.recentLaunches || []);
    setTestParams((prev) => ({
      ...prev,
      game_code: o.gameCode || prev.game_code || 'BULLETRANI',
      gid: o.gid || prev.gid,
      currency: o.defaultCurrency || prev.currency || 'INR',
      lang: o.defaultLang || prev.lang || 'en',
      close_url: o.defaultCloseUrl || prev.close_url
    }));
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${apiBase}/admin/operations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to load Operations settings');
        return;
      }
      applyLoadedData(data);
    } catch {
      setErrorMsg('Failed to load Operations settings');
    } finally {
      setLoading(false);
    }
  }, [apiBase, token, applyLoadedData]);

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    fetch(`${apiBase}/admin/operations`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!active) return;
        if (!ok || !data.success) {
          setErrorMsg(data.error || 'Failed to load Operations settings');
          return;
        }
        setErrorMsg(null);
        applyLoadedData(data);
      })
      .catch(() => {
        if (active) setErrorMsg('Failed to load Operations settings');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apiBase, token, applyLoadedData]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      const payload = {
        enabled: form.enabled,
        apiUrl: form.apiUrl,
        launchUrl: form.launchUrl,
        gameCode: form.gameCode,
        gid: form.gid,
        allowedPartnerCodes: form.allowedPartnerCodes,
        defaultCurrency: form.defaultCurrency,
        defaultLang: form.defaultLang,
        defaultCloseUrl: form.defaultCloseUrl,
        strictParams: form.strictParams,
        showExitButton: form.showExitButton,
        retryCount: form.retryCount
      };
      if (form.clearInternalKey) {
        payload.clearInternalKey = true;
      } else if (form.internalKey.trim()) {
        payload.internalKey = form.internalKey.trim();
      }

      const res = await fetch(`${apiBase}/admin/operations`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to save Operations settings');
        return;
      }
      onAlert?.('Operations Launch settings saved');
      await load();
    } catch {
      setErrorMsg('Failed to save Operations settings');
    } finally {
      setSaving(false);
    }
  };

  const previewLaunchUrl = useMemo(() => {
    const base = (form.launchUrl || 'https://your-game-host.example.com/').trim();
    const qs = new URLSearchParams();
    for (const { key } of QUERY_PARAM_SPEC) {
      const val = (testParams[key] || '').trim();
      if (val) qs.set(key, val);
    }
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${qs.toString() ? sep + qs.toString() : ''}`;
  }, [form.launchUrl, testParams]);

  const copyPreviewUrl = async () => {
    try {
      await navigator.clipboard.writeText(previewLaunchUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 1800);
    } catch {
      onAlert?.('Clipboard copy unavailable — copy the URL manually');
    }
  };

  const runTestBoot = async (e) => {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const res = await fetch(`${apiBase}/admin/operations/test-boot`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testParams)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setTestError(data.error || 'Boot validation failed');
        return;
      }
      setTestResult(data);
    } catch {
      setTestError('Boot validation request failed');
    } finally {
      setTesting(false);
    }
  };

  const runBalanceLookup = async (e) => {
    e.preventDefault();
    setBalChecking(true);
    setBalResult(null);
    setBalError(null);
    try {
      const res = await fetch(`${apiBase}/admin/operations/balance-lookup`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: balToken.trim(),
          partner_code: balPartner.trim().toUpperCase()
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setBalError(data.error || '2051 balance check failed');
        return;
      }
      setBalResult(data);
    } catch {
      setBalError('2051 balance check request failed');
    } finally {
      setBalChecking(false);
    }
  };

  const runAbortRound = async () => {
    setAborting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${apiBase}/admin/abort-round`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'Aborted by admin (Operations)' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        onAlert?.(data.message || data.error || 'No active round to abort');
        return;
      }
      onAlert?.(`Round #${data.roundNumber} aborted — refunded ${data.refundedCount} active bet(s)`);
      await load();
    } catch {
      onAlert?.('Failed to abort active round');
    } finally {
      setAborting(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-400">Loading Operations Launch settings…</div>;
  }

  const partnerRows = finance?.partners || [];

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">
      {/* Operations Finance Card */}
      <div className="bg-[#121622] border border-white/10 rounded-2xl p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-bold text-white mb-1">Operations Wallet Finance (2052)</h3>
            <p className="text-xs text-gray-400">
              Volume, payout, and GGR per <code className="text-gray-300">partner_code</code> settled via{' '}
              <code className="text-gray-300">/api/v1/wallet/credit-transfer</code>.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-white/10 text-gray-300 hover:bg-white/5"
          >
            <RefreshCw size={12} />
            <span>Refresh</span>
          </button>
        </div>

        {finance && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div className="bg-black/40 border border-white/5 rounded-xl p-4">
              <div className="text-[10px] uppercase text-gray-500 font-semibold">Operations GGR</div>
              <div className={`text-xl font-black font-mono mt-1 ${(finance.grossGamingRevenue || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ₹{inr(finance.grossGamingRevenue)}
              </div>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-4">
              <div className="text-[10px] uppercase text-gray-500 font-semibold">Operations Volume</div>
              <div className="text-xl font-black text-white font-mono mt-1">₹{inr(finance.totalVolume)}</div>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-4">
              <div className="text-[10px] uppercase text-gray-500 font-semibold">Operations Payout</div>
              <div className="text-xl font-black text-amber-400 font-mono mt-1">₹{inr(finance.totalPayout)}</div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-black/50 text-gray-400 uppercase tracking-wider text-[10px]">
                <th className="text-left p-3 font-semibold">Partner Code</th>
                <th className="text-right p-3 font-semibold">Volume</th>
                <th className="text-right p-3 font-semibold">Payout</th>
                <th className="text-right p-3 font-semibold">GGR</th>
                <th className="text-right p-3 font-semibold">RTP</th>
                <th className="text-right p-3 font-semibold">Bets</th>
              </tr>
            </thead>
            <tbody>
              {partnerRows.map((row) => (
                <tr key={row.partnerCode} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3 font-mono font-bold text-white">{row.partnerCode}</td>
                  <td className="p-3 text-right font-mono text-white">₹{inr(row.totalVolume)}</td>
                  <td className="p-3 text-right font-mono text-gray-300">₹{inr(row.totalPayout)}</td>
                  <td className={`p-3 text-right font-mono font-bold ${(row.grossGamingRevenue || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ₹{inr(row.grossGamingRevenue)}
                  </td>
                  <td className="p-3 text-right font-mono text-amber-400">{Number(row.actualRTP || 0).toFixed(2)}%</td>
                  <td className="p-3 text-right font-mono text-gray-400">{row.betCount || 0}</td>
                </tr>
              ))}
              {partnerRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-5 text-center text-gray-500">
                    No Operations wallet bets recorded yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Configuration Card */}
      <div className="bg-[#121622] border border-white/10 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Globe size={18} className="text-red-400" />
              <h3 className="text-base font-bold text-white">Operations Launch &amp; Boot</h3>
            </div>
            <p className="text-xs text-gray-400">
              Manages HTTP 302 launches (<code className="text-gray-300">?token=&amp;partner_code=&amp;gid=</code>) and server-to-server{' '}
              <code className="text-gray-300">2051 /balance</code> &amp; <code className="text-gray-300">2052 /credit-transfer</code>.
            </p>
          </div>
          <div
            className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border ${
              meta.active
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : form.enabled
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-white/5 border-white/10 text-gray-400'
            }`}
          >
            {meta.active
              ? 'Active · 2051/2052 Ready'
              : form.enabled
                ? 'Enabled · Missing Key/URL'
                : 'Disabled'}
          </div>
        </div>

        {/* Security Notice */}
        <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-200/90">
          <ShieldAlert size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300">Security &amp; Authoritative Balance Rules:</span>{' '}
            Browser clients never call <code className="text-white">{meta.walletPathPrefix}</code> directly; only the Java backend uses{' '}
            <code className="text-white">X-Internal-Key</code>. HUD balances always update from the Float <code className="text-white">message</code>{' '}
            returned by 2051/2052, and cashouts are only revealed once <code className="text-white">credit-transfer</code> returns{' '}
            <code className="text-white">status: true</code>.
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        <form onSubmit={save} className="space-y-4 text-xs">
          <label className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-white/5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="accent-red-500 w-4 h-4"
            />
            <div>
              <div className="font-semibold text-gray-200">Enable Operations Launch &amp; 2051/2052 Wallet</div>
              <div className="text-[10px] text-gray-500">
                Validates HTTP 302 redirects at <code className="text-gray-300">POST /api/operations/boot</code>, fetches initial balance (2051), and settles bets/wins/refunds via 2052.
              </div>
            </div>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-300 block mb-1 font-semibold">Operations Base URL (Server-to-Server)</label>
              <input
                value={form.apiUrl}
                onChange={(e) => setForm({ ...form, apiUrl: e.target.value })}
                placeholder="https://operations.dpbossking.com"
                className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 font-mono"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Calls <code className="text-gray-400">/api/v1/wallet/balance</code> and <code className="text-gray-400">/api/v1/wallet/credit-transfer</code>.
              </p>
            </div>

            <div>
              <label className="text-gray-300 block mb-1 font-semibold flex items-center gap-1.5">
                <KeyRound size={12} className="text-gray-400" />
                <span>X-Internal-Key (Server-Side Secret)</span>
              </label>
              <input
                type="password"
                value={form.internalKey}
                onChange={(e) => setForm({ ...form, internalKey: e.target.value, clearInternalKey: false })}
                placeholder={
                  meta.internalKeyConfigured
                    ? `Configured (${meta.internalKeyMasked}) — leave blank to keep`
                    : 'Paste INTERNAL_SERVICE_KEY'
                }
                autoComplete="off"
                className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 font-mono"
              />
              {meta.internalKeyConfigured && (
                <label className="inline-flex items-center gap-1.5 mt-1.5 text-[10px] text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.clearInternalKey}
                    onChange={(e) => setForm({ ...form, clearInternalKey: e.target.checked, internalKey: '' })}
                    className="accent-red-500"
                  />
                  <span>Clear stored X-Internal-Key on save</span>
                </label>
              )}
            </div>
          </div>

          <div>
            <label className="text-gray-300 block mb-1 font-semibold">Registered Game <code className="text-gray-400">launchUrl</code></label>
            <input
              value={form.launchUrl}
              onChange={(e) => setForm({ ...form, launchUrl: e.target.value })}
              placeholder="https://play.yourdomain.com/"
              className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 font-mono"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              URL registered with Operations where players are redirected (HTTP 302) with session query parameters.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-gray-300 block mb-1 font-semibold">Catalog <code className="text-gray-400">game_code</code></label>
              <input
                value={form.gameCode}
                onChange={(e) => setForm({ ...form, gameCode: e.target.value.toUpperCase() })}
                placeholder="BULLETRANI"
                className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 font-mono"
              />
              <p className="text-[10px] text-gray-500 mt-1">Leave blank to allow any <code className="text-gray-400">game_code</code>.</p>
            </div>
            <div>
              <label className="text-gray-300 block mb-1 font-semibold">Expected <code className="text-gray-400">gid</code> (Optional)</label>
              <input
                value={form.gid}
                onChange={(e) => setForm({ ...form, gid: e.target.value })}
                placeholder="Any gid if blank"
                className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 font-mono"
              />
              <p className="text-[10px] text-gray-500 mt-1">If set, rejects launches with a different <code className="text-gray-400">gid</code>.</p>
            </div>
            <div>
              <label className="text-gray-300 block mb-1 font-semibold">Allowed <code className="text-gray-400">partner_code</code>s</label>
              <input
                value={form.allowedPartnerCodes}
                onChange={(e) => setForm({ ...form, allowedPartnerCodes: e.target.value.toUpperCase() })}
                placeholder="ALPHA-TEST, BETA-OP"
                className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 font-mono"
              />
              <p className="text-[10px] text-gray-500 mt-1">Comma-separated uppercase allowlist (blank = all).</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-gray-300 block mb-1 font-semibold">Default <code className="text-gray-400">currency</code></label>
              <input
                value={form.defaultCurrency}
                maxLength={3}
                onChange={(e) => setForm({ ...form, defaultCurrency: e.target.value.toUpperCase() })}
                placeholder="INR"
                className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 font-mono uppercase"
              />
              <p className="text-[10px] text-gray-500 mt-1">3-letter ISO fallback when omitted.</p>
            </div>
            <div>
              <label className="text-gray-300 block mb-1 font-semibold">Default <code className="text-gray-400">lang</code></label>
              <input
                value={form.defaultLang}
                onChange={(e) => setForm({ ...form, defaultLang: e.target.value.toLowerCase() })}
                placeholder="en"
                className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 font-mono lowercase"
              />
              <p className="text-[10px] text-gray-500 mt-1">Lowercase localization fallback.</p>
            </div>
            <div>
              <label className="text-gray-300 block mb-1 font-semibold">Fallback <code className="text-gray-400">close_url</code></label>
              <input
                value={form.defaultCloseUrl}
                onChange={(e) => setForm({ ...form, defaultCloseUrl: e.target.value })}
                placeholder="https://lobby.example.com"
                className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 font-mono"
              />
              <p className="text-[10px] text-gray-500 mt-1">Used for Home / Exit when <code className="text-gray-400">close_url</code> is omitted.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-white/5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.strictParams}
                onChange={(e) => setForm({ ...form, strictParams: e.target.checked })}
                className="accent-red-500 w-4 h-4"
              />
              <div>
                <div className="font-semibold text-gray-200">Require Always Sent params</div>
                <div className="text-[10px] text-gray-500">
                  Enforce <code className="text-gray-300">token</code>, <code className="text-gray-300">partner_code</code>,{' '}
                  <code className="text-gray-300">gid</code>, <code className="text-gray-300">game_code</code>,{' '}
                  <code className="text-gray-300">username</code>.
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-white/5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.showExitButton}
                onChange={(e) => setForm({ ...form, showExitButton: e.target.checked })}
                className="accent-red-500 w-4 h-4"
              />
              <div>
                <div className="font-semibold text-gray-200">Show Home / Exit lobby button</div>
                <div className="text-[10px] text-gray-500">
                  Exits via <code className="text-gray-300">(window.top || window).location.href = close_url</code>.
                </div>
              </div>
            </label>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
              <label className="text-gray-200 block mb-1 font-semibold">Idempotent Retries (0–5)</label>
              <input
                type="number"
                min={0}
                max={5}
                value={form.retryCount}
                onChange={(e) => setForm({ ...form, retryCount: Math.max(0, Math.min(5, Number(e.target.value) || 0)) })}
                className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-red-500 font-mono"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Retries timeout / 502 / <code className="text-gray-400">ERR-0020/0021</code> with exact same <code className="text-gray-400">tranid</code>.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 font-bold text-sm text-white hover:from-red-500 hover:to-rose-500 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(229,34,60,0.35)]"
          >
            {saving ? 'Saving…' : 'Save Operations Settings'}
          </button>
        </form>
      </div>

      {/* Failure & Recovery Playbook + Emergency Round Abort */}
      <div className="bg-[#121622] border border-white/10 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-white mb-1">Refunds, Recovery &amp; Round Abort</h3>
            <p className="text-xs text-gray-400">
              Handles <code className="text-gray-300">ERR-0020/0021</code> same-<code className="text-gray-300">tranid</code> retries,{' '}
              <code className="text-gray-300">game_type=&quot;refund&quot; (ttype=2)</code>, late disconnected wins, and{' '}
              <code className="text-gray-300">ERR-0011/0012/0013</code> session expiry exits.
            </p>
          </div>
          <button
            type="button"
            disabled={aborting}
            onClick={runAbortRound}
            className="shrink-0 px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-xs font-bold text-red-200 disabled:opacity-50"
          >
            {aborting ? 'Aborting & Refunding…' : 'Abort Active Round & Refund'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
          <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-gray-300">
            <div className="font-bold text-white mb-1">Idempotent Retry (ERR-0020 / 0021 / 502)</div>
            Retries up to <span className="font-mono text-emerald-300">{form.retryCount}</span> time(s) using the exact same{' '}
            <code className="text-gray-200">tranid</code>; <code className="text-gray-200">400 status: false</code> never mutates round state.
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-gray-300">
            <div className="font-bold text-white mb-1">Refunds &amp; Session Expiry (ERR-0011–0013)</div>
            Cancels &amp; aborted rounds send <code className="text-gray-200">game_type: &quot;refund&quot;, ttype: 2</code>; expired sessions halt betting and prompt{' '}
            <code className="text-gray-200">close_url</code>.
          </div>
        </div>
      </div>

      {/* 2051 Initial Balance Lookup Tool */}
      <div className="bg-[#121622] border border-white/10 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <Wallet size={16} className="text-emerald-400" />
          <h3 className="text-base font-bold text-white">2051 Balance Lookup</h3>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Test <code className="text-gray-300">POST /api/v1/wallet/balance</code> server-to-server using{' '}
          <code className="text-gray-300">X-Internal-Key</code> for a live session token.
        </p>
        <form onSubmit={runBalanceLookup} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            value={balToken}
            onChange={(e) => setBalToken(e.target.value)}
            placeholder="Session token…"
            className="sm:col-span-1 bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 font-mono"
          />
          <input
            value={balPartner}
            onChange={(e) => setBalPartner(e.target.value.toUpperCase())}
            placeholder="ALPHA-TEST"
            className="sm:col-span-1 bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 font-mono uppercase"
          />
          <button
            type="submit"
            disabled={balChecking}
            className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-xs font-bold text-white hover:bg-white/15 disabled:opacity-50"
          >
            {balChecking ? 'Fetching…' : 'Fetch Balance (2051)'}
          </button>
        </form>
        {balError && <p className="mt-3 text-xs text-red-400">{balError}</p>}
        {balResult && (
          <pre className="mt-3 text-[11px] text-emerald-300/90 bg-black/40 border border-white/5 rounded-xl p-3 overflow-auto max-h-48">
            {JSON.stringify(balResult, null, 2)}
          </pre>
        )}
      </div>

      {/* Launch URL Simulator & Query Parameter Inspector */}
      <div className="bg-[#121622] border border-white/10 rounded-2xl p-6 shadow-lg">
        <h3 className="text-base font-bold text-white mb-1">Launch Query Parameters &amp; Boot Tester</h3>
        <p className="text-xs text-gray-400 mb-4">
          Build a sample redirect URL matching the Operations Launch specification and validate it against the backend.
        </p>

        <form onSubmit={runTestBoot} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {QUERY_PARAM_SPEC.map(({ key, required, desc }) => (
              <div key={key} className="bg-black/35 border border-white/5 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="font-mono font-bold text-gray-200">{key}</label>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      required
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                        : 'bg-white/5 text-gray-400 border border-white/10'
                    }`}
                  >
                    {required ? 'Always Sent' : 'Optional'}
                  </span>
                </div>
                <input
                  value={testParams[key] || ''}
                  onChange={(e) => setTestParams({ ...testParams, [key]: e.target.value })}
                  placeholder={required ? `Required ${key}` : `Optional ${key}`}
                  className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-red-500 font-mono"
                />
                <p className="text-[10px] text-gray-500 mt-1.5 leading-snug">{desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-black/50 border border-white/10 rounded-xl p-3">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Generated Launch Redirect URL
              </span>
              <button
                type="button"
                onClick={copyPreviewUrl}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-gray-200"
              >
                {copiedUrl ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
            <div className="font-mono text-[11px] text-emerald-300/90 break-all select-all">
              {previewLaunchUrl}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={testing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-white disabled:opacity-50"
            >
              <Play size={13} />
              <span>{testing ? 'Validating…' : 'Validate Boot Parameters'}</span>
            </button>
            <span className="text-[11px] text-gray-500">
              Runs dry-run validation via <code className="text-gray-400">POST /api/admin/operations/test-boot</code>.
            </span>
          </div>
        </form>

        {testError && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300">
            {testError}
          </div>
        )}
        {testResult && (
          <pre className="mt-4 text-[11px] text-emerald-300/90 bg-black/40 border border-white/5 rounded-xl p-3 overflow-auto max-h-60">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        )}
      </div>

      {/* Recent Launch Handshakes */}
      <div className="bg-[#121622] border border-white/10 rounded-2xl p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-white mb-1">Recent Launch Handshakes</h3>
            <p className="text-xs text-gray-400">
              Latest browser boots verified via 2051 balance check (tokens masked).
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-white/10 text-gray-300 hover:bg-white/5"
          >
            <RefreshCw size={12} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-black/50 text-gray-400 uppercase tracking-wider text-[10px]">
                <th className="text-left p-3 font-semibold">Partner</th>
                <th className="text-left p-3 font-semibold">Player</th>
                <th className="text-left p-3 font-semibold">Game / GID</th>
                <th className="text-left p-3 font-semibold">2051 Balance</th>
                <th className="text-left p-3 font-semibold">Token</th>
                <th className="text-left p-3 font-semibold">ExtSess</th>
                <th className="text-left p-3 font-semibold">Booted At</th>
              </tr>
            </thead>
            <tbody>
              {recentLaunches.map((row, idx) => (
                <tr key={`${row.bootedAt}-${idx}`} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3 font-mono font-bold text-white">{row.partnerCode || '—'}</td>
                  <td className="p-3">
                    <div className="font-semibold text-gray-200">{row.username || '—'}</div>
                    {row.userId && <div className="text-[10px] text-gray-500 font-mono">ID: {row.userId}</div>}
                  </td>
                  <td className="p-3 font-mono text-gray-300">
                    {row.gameCode || '—'} <span className="text-gray-500">/ {row.gid || '—'}</span>
                  </td>
                  <td className="p-3 font-mono text-emerald-400">
                    {row.balance != null ? `${row.currency} ${Number(row.balance).toFixed(2)}` : `${row.currency} · ${row.lang}`}
                  </td>
                  <td className="p-3 font-mono text-emerald-300">{row.tokenMasked}</td>
                  <td className="p-3 font-mono text-gray-400">{row.extsess || '—'}</td>
                  <td className="p-3 font-mono text-[11px] text-gray-500">
                    {row.bootedAt ? new Date(row.bootedAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
              {recentLaunches.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-500">
                    No operations launches recorded since server start
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
