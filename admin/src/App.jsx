import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Shield, Check, X } from 'lucide-react';
import AdminHeader from './components/AdminHeader';
import AdminSidebar from './components/AdminSidebar';
import OverviewTab from './components/OverviewTab';
import LiveRadarTab from './components/LiveRadarTab';
import PlayersTab from './components/PlayersTab';
import SettingsTab from './components/SettingsTab';
import ProviderTab from './components/ProviderTab';
import RoundsLedgerTab from './components/RoundsLedgerTab';
import TransactionsTab from './components/TransactionsTab';
import './App.css';
import { API_BASE, SOCKET_URL } from './config';

export default function AdminApp() {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState(null);
  const [token, setToken] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Login form state — seeded admin: admin / 123456
  const [loginId, setLoginId] = useState('admin');
  const [loginPass, setLoginPass] = useState('123456');
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Live Engine State
  const [liveRound, setLiveRound] = useState({
    state: 'WAITING',
    multiplier: 1.00,
    roundNumber: 1001,
    activeBets: [],
    paused: false
  });
  const [engineState, setEngineState] = useState(null);

  // Admin Data
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [history, setHistory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState({
    house_edge: '3.0',
    min_bet: '10.0',
    max_bet: '10000.0',
    max_payout: '1000000.0',
    max_crash_multiplier: '20.0',
    max_round_stake: '0',
    countdown_seconds: '5.0'
  });

  // Balance adjustment modal
  const [adjustModalUser, setAdjustModalUser] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState(1000);
  const [adjustReason, setAdjustReason] = useState('VIP Promotion Bonus');
  const [statusAlert, setStatusAlert] = useState(null);

  // Restore session if a valid admin JWT is stored
  useEffect(() => {
    const savedToken = localStorage.getItem('aviator_admin_token');
    if (savedToken) {
      setToken(savedToken);
      fetchAdminProfile(savedToken);
    }
  }, []);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginId.trim(), password: loginPass })
      });
      const data = await res.json();
      if (data.success && data.user?.role === 'admin') {
        setToken(data.token);
        setAdminUser(data.user);
        localStorage.setItem('aviator_admin_token', data.token);
        navigate('/overview', { replace: true });
      } else if (data.success && data.user?.role !== 'admin') {
        setLoginError('Access denied — admin role required');
      } else {
        setLoginError(data.error || 'Invalid admin credentials');
      }
    } catch {
      setLoginError('Could not connect to backend server');
    } finally {
      setLoginLoading(false);
    }
  };

  const fetchAdminProfile = async (authToken) => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.user && data.user.role === 'admin') {
        setAdminUser(data.user);
        setToken(authToken);
      } else {
        localStorage.removeItem('aviator_admin_token');
        setToken(null);
        setAdminUser(null);
      }
    } catch {
      localStorage.removeItem('aviator_admin_token');
      setToken(null);
      setAdminUser(null);
    }
  };

  // Socket connection for live flight monitoring (only after admin login)
  useEffect(() => {
    if (!token || !adminUser) return undefined;

    const s = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token },
      query: { token },
    });
    s.emit('game:init', {});

    s.on('game:snapshot', (snap) => {
      setLiveRound({
        state: snap.state,
        multiplier: snap.currentMultiplier,
        roundNumber: snap.roundNumber,
        activeBets: snap.allBets || [],
        paused: !!snap.paused
      });
    });

    s.on('round:preparing', (d) => {
      setLiveRound(prev => ({
        ...prev,
        state: 'WAITING',
        multiplier: 1.00,
        roundNumber: d.roundNumber,
        activeBets: d.activeBets || []
      }));
    });

    s.on('round:started', (d) => {
      setLiveRound(prev => ({
        ...prev,
        state: 'FLYING',
        roundNumber: d.roundNumber,
        activeBets: d.activeBets || prev.activeBets
      }));
    });

    s.on('round:tick', (d) => {
      setLiveRound(prev => ({ ...prev, multiplier: d.multiplier }));
    });

    s.on('round:cashout', (d) => {
      setLiveRound(prev => ({
        ...prev,
        activeBets: prev.activeBets.map(b => b.id === d.betId ? {
          ...b,
          status: 'cashed_out',
          cashoutMultiplier: d.multiplier,
          winAmount: d.winAmount
        } : b)
      }));
    });

    s.on('round:crashed', (d) => {
      setLiveRound(prev => ({
        ...prev,
        state: 'CRASHED',
        multiplier: d.finalMultiplier,
        activeBets: d.allBets || prev.activeBets
      }));
      if (token) {
        fetchStats();
        fetchTransactions();
        fetchEngineState();
      }
    });

    s.on('round:paused', (d) => {
      setLiveRound(prev => ({ ...prev, paused: !!d.paused }));
    });

    s.on('admin:engine', (state) => {
      setEngineState(state);
      setLiveRound(prev => ({
        ...prev,
        paused: !!state.paused,
        state: state.state || prev.state,
        multiplier: state.currentMultiplier ?? prev.multiplier,
        roundNumber: state.roundNumber ?? prev.roundNumber,
        activeBets: state.activeBets || prev.activeBets
      }));
    });

    return () => s.disconnect();
  }, [token, adminUser]);

  // Fetch API endpoints
  const fetchStats = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/game/history?limit=50`);
      const data = await res.json();
      if (data.history) setHistory(data.history);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSettings = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.settings) setSettings(data.settings);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTransactions = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/admin/transactions?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.transactions) setTransactions(data.transactions);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEngineState = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/admin/engine`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.engine) setEngineState(data.engine);
    } catch (e) {
      console.error(e);
    }
  };

  const adminPost = async (path, body = {}) => {
    const res = await fetch(`${API_BASE}/admin/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok || data.success === false) {
      setStatusAlert(data.error || data.message || 'Action failed');
      return null;
    }
    fetchEngineState();
    return data;
  };

  useEffect(() => {
    if (token) {
      fetchStats();
      fetchUsers();
      fetchHistory();
      fetchSettings();
      fetchTransactions();
      fetchEngineState();
    }
  }, [token]);

  const handleAdjustBalance = async () => {
    if (!adjustModalUser) return;
    try {
      const res = await fetch(`${API_BASE}/admin/adjust-balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: adjustModalUser.id,
          amount: adjustAmount,
          reason: adjustReason
        })
      });
      const data = await res.json();
      if (data.success) {
        setStatusAlert(`Successfully updated balance for ${adjustModalUser.username}`);
        setAdjustModalUser(null);
        fetchUsers();
        fetchStats();
        fetchTransactions();
      }
    } catch {
      setStatusAlert('Failed to adjust balance');
    }
  };

  const handleToggleBan = async (userId) => {
    const data = await adminPost('toggle-ban', { userId });
    if (data?.success) {
      setStatusAlert('Account suspension status updated');
      fetchUsers();
    }
  };

  const handleSetRole = async (userId, role) => {
    const data = await adminPost('set-role', { userId, role });
    if (data?.success) {
      setStatusAlert(`Role updated to ${role}`);
      fetchUsers();
    }
  };

  const handleResetPassword = async (userId, newPassword) => {
    const data = await adminPost('reset-password', { userId, newPassword });
    if (data?.success) setStatusAlert('Password reset successfully');
  };

  const handleCreateUser = async (form) => {
    const data = await adminPost('create-user', form);
    if (data?.success) {
      setStatusAlert(`Created user ${data.user.username}`);
      fetchUsers();
      return true;
    }
    return false;
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/admin/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        setStatusAlert('Settings saved — house edge / crash cap apply from the next launch');
        fetchStats();
        fetchSettings();
      }
    } catch {
      setStatusAlert('Failed to save settings');
    }
  };

  if (!adminUser) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center p-4 select-text">
        <div className="bg-[#121622] border border-white/10 rounded-3xl max-w-sm w-full p-6 text-white shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <Shield size={22} strokeWidth={2.25} />
            </div>
            <h2 className="text-xl font-black" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>
              BULLET RANI ADMIN
            </h2>
            <p className="text-xs text-gray-400">Restricted Administration Access</p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl mb-4 text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3 text-xs">
            <div>
              <label className="text-gray-300 block mb-1 font-semibold">Admin ID</label>
              <input
                type="text"
                autoComplete="username"
                value={loginId}
                onChange={e => setLoginId(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="text-gray-300 block mb-1 font-semibold">Password</label>
              <input
                type="password"
                autoComplete="current-password"
                value={loginPass}
                onChange={e => setLoginPass(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 font-bold text-sm text-white hover:from-red-500 hover:to-rose-500 active:scale-98 transition-all mt-4 shadow-[0_0_20px_rgba(229,34,60,0.4)] disabled:opacity-60"
            >
              {loginLoading ? 'Signing in…' : 'Sign In to Backoffice'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#07090e] text-gray-100 flex flex-col font-sans select-text antialiased overflow-hidden">
      {/* Header */}
      <AdminHeader
        adminUser={adminUser}
        liveRound={liveRound}
        onMenuToggle={() => setSidebarOpen((v) => !v)}
        onLogout={() => {
          localStorage.removeItem('aviator_admin_token');
          setAdminUser(null);
          setToken(null);
          setSidebarOpen(false);
          navigate('/', { replace: true });
        }}
      />

      {statusAlert && (
        <div className="shrink-0 bg-emerald-950/70 border-b border-emerald-500/30 px-6 py-2 text-xs font-semibold text-emerald-300 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5">
            <Check size={14} strokeWidth={2.5} />
            {statusAlert}
          </span>
          <button onClick={() => setStatusAlert(null)} className="text-emerald-400 hover:text-white p-0.5">
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Main Layout: Left Sidebar + Center Workspace */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        <AdminSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 min-w-0 p-4 sm:p-6 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route
              path="/overview"
              element={<OverviewTab stats={stats} settings={settings} liveRound={liveRound} />}
            />
            <Route
              path="/live-radar"
              element={
                <LiveRadarTab
                  liveRound={liveRound}
                  engineState={engineState}
                  onForceCrash={async () => {
                    const d = await adminPost('force-crash');
                    if (d?.success) setStatusAlert(`Forced crash @ ${Number(d.crashedAt).toFixed(2)}x`);
                  }}
                  onForceStart={async () => {
                    const d = await adminPost('force-start');
                    if (d?.success) setStatusAlert('Round launched');
                  }}
                  onPause={async () => {
                    const d = await adminPost('pause');
                    if (d?.success) setStatusAlert('Engine paused');
                  }}
                  onResume={async () => {
                    const d = await adminPost('resume');
                    if (d?.success) setStatusAlert('Engine resumed');
                  }}
                  onSetNextCrash={async (multiplier) => {
                    const d = await adminPost('set-next-crash', { multiplier });
                    if (d?.success) setStatusAlert(`Next crash locked @ ${d.nextCrashOverride}x`);
                  }}
                  onSetCrashTarget={async (multiplier) => {
                    const d = await adminPost('set-crash-target', { multiplier });
                    if (d?.success) setStatusAlert(`Live crash target @ ${d.crashTarget || d.crashedAt}x`);
                  }}
                  onClearOverrides={async () => {
                    const d = await adminPost('clear-overrides');
                    if (d?.success) setStatusAlert('Crash overrides cleared');
                  }}
                />
              }
            />
            <Route
              path="/players"
              element={
                <PlayersTab
                  users={users}
                  onRefresh={fetchUsers}
                  onAdjustBalance={(u) => { setAdjustModalUser(u); setAdjustAmount(1000); }}
                  onToggleBan={handleToggleBan}
                  onSetRole={handleSetRole}
                  onResetPassword={handleResetPassword}
                  onCreateUser={handleCreateUser}
                />
              }
            />
            <Route
              path="/settings"
              element={
                <SettingsTab
                  settings={settings}
                  setSettings={setSettings}
                  onSave={handleSaveSettings}
                />
              }
            />
            <Route
              path="/provider"
              element={
                <ProviderTab
                  token={token}
                  apiBase={API_BASE}
                  onAlert={(msg) => setStatusAlert(msg)}
                />
              }
            />
            <Route
              path="/rounds"
              element={<RoundsLedgerTab history={history} onRefresh={fetchHistory} />}
            />
            <Route
              path="/transactions"
              element={<TransactionsTab transactions={transactions} onRefresh={fetchTransactions} />}
            />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </main>
      </div>

      {/* Credit / Debit Balance Adjustment Modal */}
      {adjustModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#141824] border border-white/10 rounded-3xl max-w-sm w-full p-6 text-white shadow-2xl relative">
            <button
              onClick={() => setAdjustModalUser(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg"
              aria-label="Close"
            >
              <X size={16} strokeWidth={2.25} />
            </button>

            <h3 className="text-base font-bold mb-1">Adjust Pilot Balance</h3>
            <p className="text-xs text-gray-400 mb-4">Pilot: {adjustModalUser.username} (Current: ₹{adjustModalUser.balance})</p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-gray-300 block mb-1 font-semibold">Adjustment Amount (+ to credit, - to debit)</label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={e => setAdjustAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-base font-bold text-white outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1 font-semibold">Audit Reason / Note</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                />
              </div>

              <div className="p-3 bg-white/[0.03] rounded-xl text-gray-400 text-[11px]">
                New projected balance: <strong className="text-emerald-400 font-mono">₹{Math.max(0, adjustModalUser.balance + adjustAmount).toFixed(2)}</strong>
              </div>

              <button
                onClick={handleAdjustBalance}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-sm text-white active:scale-98 transition-all mt-4 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
              >
                Apply Balance Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
