import React, { useState } from 'react';

export default function TransactionsTab({ transactions, onRefresh }) {
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = transactions.filter((t) => {
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesSearch =
      !searchTerm ||
      (t.username && t.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesType && matchesSearch;
  });

  return (
    <div className="bg-[#121622] border border-white/10 rounded-2xl p-5 shadow-lg  animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Platform Transaction Ledger</h3>
          <p className="text-xs text-gray-400">Audit trail of all deposits, withdrawals, wagers, wins, and adjustments</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search pilot or note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-red-500 w-44"
          />

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 outline-none"
          >
            <option value="all">All Types</option>
            <option value="deposit">Deposits</option>
            <option value="withdrawal">Withdrawals</option>
            <option value="bet">Bets</option>
            <option value="win">Wins</option>
            <option value="admin_adj">Admin Adjustments</option>
          </select>

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
              <th className="p-3">Tx ID</th>
              <th className="p-3">Pilot</th>
              <th className="p-3">Type</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3 text-right">Balance After</th>
              <th className="p-3">Description</th>
              <th className="p-3 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono text-[11px]">
            {filtered.length > 0 ? (
              filtered.map((t) => (
                <tr key={t.id} className="hover:bg-white/[0.02]">
                  <td className="p-3 text-gray-400">#{t.id}</td>
                  <td className="p-3 font-sans font-bold text-white">{t.username}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      t.type === 'deposit' || t.type === 'win'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : t.type === 'withdrawal' || t.type === 'bet'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="p-3 text-right font-bold">
                    <span className={t.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {t.amount >= 0 ? `+₹${t.amount}` : `-₹${Math.abs(t.amount)}`}
                    </span>
                  </td>
                  <td className="p-3 text-right font-bold text-gray-200">
                    ₹{t.balance_after ? t.balance_after.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                  </td>
                  <td className="p-3 font-sans text-gray-400 truncate max-w-[240px]" title={t.description}>
                    {t.description}
                  </td>
                  <td className="p-3 text-right text-gray-500 text-[10px] whitespace-nowrap">
                    {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center p-8 text-gray-500 font-sans italic">
                  No matching transaction records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
