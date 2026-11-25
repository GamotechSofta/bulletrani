import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

export default function WalletModal({ balance, token, onBalanceUpdated, onClose }) {
  const [tab, setTab] = useState('transactions'); // 'deposit' | 'withdraw' | 'transactions'
  const [amount, setAmount] = useState(500);
  const [paymentMethod, setPaymentMethod] = useState('UPI Instant (GPay / PhonePe / Paytm)');
  const [bankDetails, setBankDetails] = useState('');
  const [statusMsg, setStatusMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);

  const presets = [200, 500, 1000, 2000, 5000, 10000];

  useEffect(() => {
    if (tab === 'transactions' && token) {
      fetchTransactions();
    }
  }, [tab, token]);

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/wallet/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.transactions) setTransactions(data.transactions);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeposit = async () => {
    setStatusMsg({
      type: 'error',
      text: 'Self-serve deposits are disabled. Use Provider wallet or contact support.',
    });
  };

  const handleWithdraw = async () => {
    setStatusMsg({
      type: 'error',
      text: 'Self-serve withdrawals are disabled. Use Provider wallet or contact support.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-[#141824] border border-white/10 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold p-1 rounded-lg"
        >
          ✕
        </button>

        {/* Balance Display */}
        <div className="mb-4 text-center">
          <span className="text-[11px] text-gray-400 uppercase font-semibold tracking-wider">Available Balance</span>
          <div className="text-3xl font-black text-white mt-1 font-mono">
            ₹{balance !== undefined ? balance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-black/40 p-1 rounded-xl mb-5 border border-white/10">
          <button
            onClick={() => { setTab('deposit'); setStatusMsg(null); }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === 'deposit' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Deposit
          </button>
          <button
            onClick={() => { setTab('withdraw'); setStatusMsg(null); }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === 'withdraw' ? 'bg-red-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Withdraw
          </button>
          <button
            onClick={() => { setTab('transactions'); setStatusMsg(null); }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === 'transactions' ? 'bg-[#2a3044] text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Ledger
          </button>
        </div>

        {statusMsg && (
          <div
            className={`p-3 rounded-xl mb-4 text-xs font-semibold ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}
          >
            {statusMsg.text}
          </div>
        )}

        {tab === 'deposit' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-100">
              <p className="font-bold mb-1">Deposits disabled</p>
              <p className="text-amber-100/80 leading-relaxed">
                Self-serve balance credits are turned off. Fund play via Provider wallet launch,
                or ask an admin to adjust balance.
              </p>
            </div>
            <button
              onClick={handleDeposit}
              disabled
              className="w-full py-3 rounded-xl bg-white/10 font-bold text-sm text-gray-400 cursor-not-allowed"
            >
              Instant Deposit unavailable
            </button>
          </div>
        )}

        {tab === 'withdraw' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-100">
              <p className="font-bold mb-1">Withdrawals disabled</p>
              <p className="text-amber-100/80 leading-relaxed">
                Self-serve balance drains are turned off. Cash out via Provider wallet,
                or contact support / an admin.
              </p>
            </div>
            <button
              onClick={handleWithdraw}
              disabled
              className="w-full py-3 rounded-xl bg-white/10 font-bold text-sm text-gray-400 cursor-not-allowed"
            >
              Withdraw unavailable
            </button>
          </div>
        )}

        {tab === 'transactions' && (
          <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin text-xs">
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-white capitalize">{tx.type}</div>
                    <div className="text-[10px] text-gray-400">{tx.description}</div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-mono font-bold ${
                        tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {tx.amount >= 0 ? `+₹${tx.amount}` : `-₹${Math.abs(tx.amount)}`}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      Bal: ₹{tx.balance_after}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">No transaction records found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
