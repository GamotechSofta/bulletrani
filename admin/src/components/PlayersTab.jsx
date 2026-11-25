import React, { useState } from 'react';
import { UserRound } from 'lucide-react';

export default function PlayersTab({
  users,
  onRefresh,
  onAdjustBalance,
  onToggleBan,
  onSetRole,
  onResetPassword,
  onCreateUser
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: '',
    email: '',
    password: 'pilot123',
    role: 'player',
    balance: 5000
  });

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    const ok = await onCreateUser(createForm);
    if (ok) {
      setShowCreate(false);
      setCreateForm({ username: '', email: '', password: 'pilot123', role: 'player', balance: 5000 });
    }
  };

  return (
    <div className="bg-[#121622] border border-white/10 rounded-2xl p-5 shadow-lg  animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Registered Pilots & Accounts</h3>
          <p className="text-xs text-gray-400">Full account control — balance, role, ban, password reset</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search username or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-red-500 w-52"
          />

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 outline-none"
          >
            <option value="all">All Roles</option>
            <option value="player">Players</option>
            <option value="admin">Admins</option>
          </select>

          <button
            onClick={() => setShowCreate((v) => !v)}
            className="text-xs px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-semibold transition-all"
          >
            + Create User
          </button>

          <button
            onClick={onRefresh}
            className="text-xs px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold transition-all"
          >
            Refresh
          </button>
        </div>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-5 p-4 rounded-xl bg-black/40 border border-white/10 grid sm:grid-cols-5 gap-2 text-xs">
          <input
            required
            placeholder="Username"
            value={createForm.username}
            onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
            className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-red-500"
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={createForm.email}
            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-red-500"
          />
          <input
            required
            placeholder="Password"
            value={createForm.password}
            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-red-500"
          />
          <select
            value={createForm.role}
            onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
            className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
          >
            <option value="player">Player</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2">
            Create
          </button>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-black/30 text-gray-400 uppercase text-[10px]">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Pilot</th>
              <th className="p-3">Email</th>
              <th className="p-3 text-right">Wallet Balance</th>
              <th className="p-3 text-center">Role</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02]">
                  <td className="p-3 text-gray-400">#{u.id}</td>
                  <td className="p-3 font-sans font-bold text-white flex items-center gap-2">
                    <UserRound size={14} strokeWidth={2.25} className="text-gray-400 shrink-0" />
                    <span>{u.username}</span>
                  </td>
                  <td className="p-3 font-sans text-gray-400">{u.email}</td>
                  <td className="p-3 text-right font-bold text-emerald-400">
                    ₹{u.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      u.role === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      u.is_banned ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {u.is_banned ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td className="p-3 text-right font-sans">
                    <div className="inline-flex flex-wrap justify-end gap-1.5">
                      <button
                        onClick={() => onAdjustBalance(u)}
                        className="px-2 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-[11px] font-semibold"
                      >
                        Credit/Debit
                      </button>
                      <button
                        onClick={() => onSetRole(u.id, u.role === 'admin' ? 'player' : 'admin')}
                        className="px-2 py-1 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 text-[11px] font-semibold"
                      >
                        {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                      </button>
                      <button
                        onClick={() => {
                          const pw = window.prompt(`New password for ${u.username}:`, 'pilot123');
                          if (pw) onResetPassword(u.id, pw);
                        }}
                        className="px-2 py-1 rounded-lg bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 text-[11px] font-semibold"
                      >
                        Reset PW
                      </button>
                      <button
                        onClick={() => onToggleBan(u.id)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold ${
                          u.is_banned
                            ? 'bg-amber-600/30 hover:bg-amber-600/50 text-amber-300'
                            : 'bg-red-600/30 hover:bg-red-600/50 text-red-300'
                        }`}
                      >
                        {u.is_banned ? 'Unban' : 'Suspend'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center p-8 text-gray-500 font-sans italic">
                  No matching pilots found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
