import React, { useState } from 'react';

export default function WalletModal({ balance, token, onBalanceUpdated, onClose }) {
  const [tab, setTab] = useState('deposit'); // 'deposit' | 'withdraw'
  const [amount, setAmount] = useState(500);
  const [paymentMethod, setPaymentMethod] = useState('UPI Instant');
  const [bankDetails, setBankDetails] = useState('');
  const [statusMsg, setStatusMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const presets = [200, 500, 1000, 2000, 5000, 10000];

  const handleDeposit = async () => {
    if (amount < 100) return;
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('http://localhost:5000/api/wallet/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount, paymentMethod })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: data.message });
        onBalanceUpdated(data.balance);
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Deposit failed' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Server error' });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    setStatusMsg({
      type: 'error',
      text: 'Self-serve withdrawals are disabled. Use Provider wallet or contact support.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#151923] border border-white/10 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold"
        >
          ✕
        </button>

        {/* Balance Display */}
        <div className="mb-4 text-center">
          <span className="text-xs text-gray-400 uppercase font-semibold">Available Balance</span>
          <div className="text-3xl font-black text-white mt-1" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>
            ₹{balance ? balance.toLocaleString() : '0.00'}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-black/40 p-1 rounded-xl mb-4 border border-white/10">
          <button
            onClick={() => { setTab('deposit'); setStatusMsg(null); }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === 'deposit' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Deposit Funds
          </button>
          <button
            onClick={() => { setTab('withdraw'); setStatusMsg(null); }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === 'withdraw' ? 'bg-red-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Withdraw Winnings
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

        {tab === 'deposit' ? (
          <div className="space-y-4 text-xs">
            <div>
              <label className="text-gray-400 block mb-1 font-semibold">Deposit Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400 font-bold">₹</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-8 pr-3 text-base font-bold text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {presets.map((p) => (
                <button
                  key={p}
                  onClick={() => setAmount(p)}
                  className={`py-2 rounded-lg border text-xs font-bold transition-all ${
                    amount === p
                      ? 'border-emerald-500 bg-emerald-500/20 text-white'
                      : 'border-white/5 bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  +₹{p}
                </button>
              ))}
            </div>

            <div>
              <label className="text-gray-400 block mb-1 font-semibold">Simulated Gateway</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none"
              >
                <option value="UPI Instant (GPay / PhonePe / Paytm)">UPI Instant (GPay / PhonePe / Paytm)</option>
                <option value="Credit / Debit Card (Visa/Mastercard)">Credit / Debit Card (Visa/Mastercard)</option>
                <option value="Crypto (USDT TRC20 / Bitcoin)">Crypto (USDT TRC20 / Bitcoin)</option>
                <option value="NetBanking">NetBanking</option>
              </select>
            </div>

            <button
              onClick={handleDeposit}
              disabled={loading || amount < 100}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 font-bold text-sm text-white hover:from-emerald-400 hover:to-green-500 active:scale-98 transition-all disabled:opacity-40"
            >
              {loading ? 'Processing...' : `Instant Deposit ₹${amount.toLocaleString()}`}
            </button>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div>
              <label className="text-gray-400 block mb-1 font-semibold">Withdraw Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400 font-bold">₹</span>
                <input
                  type="number"
                  value={amount}
                  max={balance}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-8 pr-3 text-base font-bold text-white outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div>
              <label className="text-gray-400 block mb-1 font-semibold">UPI ID or Bank Account Details</label>
              <input
                type="text"
                value={bankDetails}
                onChange={(e) => setBankDetails(e.target.value)}
                placeholder="e.g. pilot@upi or HDFC Account 50100..."
                className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
              />
            </div>

            <button
              onClick={handleWithdraw}
              disabled={loading || amount < 200 || amount > balance}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 font-bold text-sm text-white hover:from-red-500 hover:to-rose-500 active:scale-98 transition-all disabled:opacity-40"
            >
              {loading ? 'Processing...' : `Withdraw ₹${amount.toLocaleString()}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
