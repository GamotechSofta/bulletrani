import React, { useState } from 'react';

export default function AuthModal({ onLoginSuccess, onClose }) {
  const [isRegister, setIsRegister] = useState(false);
  const [login, setLogin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = isRegister ? 'http://localhost:5000/api/auth/register' : 'http://localhost:5000/api/auth/login';
    const body = isRegister
      ? { username: login, email, password }
      : { login, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('aviator_token', data.token);
        localStorage.setItem('aviator_user', JSON.stringify(data.user));
        onLoginSuccess(data.user, data.token);
        onClose();
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch {
      setError('Connection to backend failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#151923] border border-white/10 rounded-2xl max-w-sm w-full p-6 text-white shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold"
        >
          ✕
        </button>

        <div className="text-center mb-5">
          <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-2xl">
            ✈️
          </div>
          <h3 className="text-xl font-black">{isRegister ? 'Create Pilot Account' : 'Pilot Sign In'}</h3>
          <p className="text-xs text-gray-400">Play Aviator on real betting platform</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl mb-4 text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="text-gray-400 block mb-1 font-semibold">{isRegister ? 'Username' : 'Username or Email'}</label>
            <input
              type="text"
              required
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
            />
          </div>

          {isRegister && (
            <div>
              <label className="text-gray-400 block mb-1 font-semibold">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
              />
            </div>
          )}

          <div>
            <label className="text-gray-400 block mb-1 font-semibold">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 font-bold text-sm text-white hover:from-red-500 hover:to-rose-500 active:scale-98 transition-all mt-4 disabled:opacity-40"
          >
            {loading ? 'Please wait...' : isRegister ? 'Register' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => { setIsRegister(!isRegister); setError(null); }}
            className="text-xs text-red-400 hover:underline"
          >
            {isRegister ? 'Already registered? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>

        {/* Demo Credentials Quick Fill */}
        <div className="mt-4 pt-3 border-t border-white/10 text-[10px] text-gray-500 text-center">
          Quick Demo Player: <button onClick={() => { setLogin('TopGunPilot'); setPassword('pilot123'); setIsRegister(false); }} className="text-emerald-400 underline font-semibold">Fill Pilot Demo</button>
        </div>
      </div>
    </div>
  );
}
