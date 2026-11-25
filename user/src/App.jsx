import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import TopGunHeader from './components/TopGunHeader';
import RikshaCanvas from './components/RikshaCanvas';
import TopGunBetConsole from './components/TopGunBetConsole';
import TopGunPlayersList from './components/TopGunPlayersList';
import Top20Modal from './components/Top20Modal';
import RikshaMenuModal from './components/RikshaMenuModal';
import WalletModal from './components/WalletModal';
import HowToPlayModal from './components/HowToPlayModal';
import AuthModal from './components/AuthModal';
import { sound } from './soundEngine';
import {
  initProviderSession,
  getSessionToken,
  notifyRoundCreated,
  notifyRoundStarted,
  notifyRoundEnded
} from './providerSdk';
import SessionGate from './components/SessionGate';
import { ToastStack } from './components/Toast';
import { API_BASE, SOCKET_SERVER } from './config';
import {
  loadAudioPrefs,
  saveAudioPrefs,
  cacheLeaderboard,
  readCachedLeaderboard,
  cacheRecentHistory,
  readCachedHistory
} from './assetCache';
import './App.css';

const cachedAudio = loadAudioPrefs();

export default function App() {
  const [socket, setSocket] = useState(null);
  const [bootState, setBootState] = useState('loading'); // loading | ready | blocked
  const [sessionError, setSessionError] = useState(null);
  const [providerMode, setProviderMode] = useState(false);
  const [user, setUser] = useState({
    id: 1,
    username: 'TopGunPilot',
    email: 'pilot@topgun.local',
    balance: 5895.75,
    role: 'player'
  });
  const [token, setToken] = useState('demo_token');
  const [soundEnabled, setSoundEnabled] = useState(cachedAudio.soundEnabled);
  const [musicEnabled, setMusicEnabled] = useState(cachedAudio.musicEnabled);
  const [vehicle, setVehicle] = useState('bike'); // Royal Enfield rider matching master design

  // Engine state
  const [gameState, setGameState] = useState('WAITING'); // WAITING, FLYING, CRASHED
  const [multiplier, setMultiplier] = useState(1.00);
  const [roundNumber, setRoundNumber] = useState(1001);
  const [countdownProgress, setCountdownProgress] = useState(1);
  const [recentHistory, setRecentHistory] = useState(() => readCachedHistory());
  const [allBets, setAllBets] = useState([]);
  const [topWins, setTopWins] = useState(() => readCachedLeaderboard() || []);

  // Active bets per panel (key: panelId -> bet object)
  const [activeBets, setActiveBets] = useState({});

  // Modals
  const [showTop20, setShowTop20] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'error') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
  };

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Apply cached audio prefs once, then unlock on first gestures
  useEffect(() => {
    sound.toggleSfx(soundEnabled);
    sound.toggleMusic(musicEnabled);
    const unlock = () => { sound.unlock(); };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    const onVis = () => {
      if (document.visibilityState === 'visible') sound.unlock();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot prefs only
  }, []);

  useEffect(() => {
    saveAudioPrefs({ musicEnabled, soundEnabled });
  }, [musicEnabled, soundEnabled]);

  useEffect(() => {
    cacheRecentHistory(recentHistory);
  }, [recentHistory]);

  // Phase 3 boot: validate sessionToken from launchUrl (or local demo if absent)
  useEffect(() => {
    const savedToken = localStorage.getItem('aviator_token');
    const savedUser = localStorage.getItem('aviator_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }

    initProviderSession().then(async (result) => {
      if (result.mode === 'error') {
        setSessionError(result.error);
        setBootState('blocked');
        return;
      }

      if (result.mode === 'provider') {
        const session = result.session;
        setProviderMode(true);
        // Use validate response only — never trust operatorId/playerId from URL
        setUser((prev) => ({
          ...(prev || {}),
          id: prev?.id || 1,
          username: session.playerUsername || session.playerId || 'ProviderPlayer',
          providerPlayerId: session.playerId,
          operatorId: session.operatorId,
          currency: session.currency,
          language: session.language,
          timezone: session.timezone,
          gameCode: session.gameCode
        }));
        try {
          const res = await fetch(`${API_BASE}/api/provider/balance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionToken: getSessionToken() })
          });
          const data = await res.json();
          if (data.success && data.balance != null) {
            setUser((prev) => (prev ? { ...prev, balance: data.balance } : prev));
          }
        } catch {
          /* game-server provider wallet may be off in local dev */
        }
      }

      setBootState('ready');
    });
  }, []);

  const handleLoginSuccess = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('aviator_token', userToken);
    localStorage.setItem('aviator_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    localStorage.removeItem('aviator_token');
    localStorage.removeItem('aviator_user');
    setUser(null);
    setToken(null);
    setActiveBets({});
  };

  // Socket Connection & Real-time Event Handlers (JWT via query — server binds userId)
  useEffect(() => {
    const s = io(SOCKET_SERVER, {
      transports: ['websocket', 'polling'],
      auth: token ? { token } : undefined,
      query: token ? { token } : undefined,
    });

    s.on('connect', () => {
      s.emit('game:init', {});
    });

    s.on('game:snapshot', (data) => {
      setGameState(data.state);
      setMultiplier(data.currentMultiplier || 1.00);
      setRoundNumber(data.roundNumber);
      setRecentHistory(data.recentHistory || []);
      setAllBets(data.allBets || []);

      if (data.myActiveBets && data.myActiveBets.length > 0) {
        const map = {};
        data.myActiveBets.forEach(b => { map[b.panelId] = b; });
        setActiveBets(map);
      }
    });

    s.on('round:preparing', (data) => {
      setGameState('WAITING');
      setMultiplier(1.00);
      setRoundNumber(data.roundNumber);
      setAllBets(data.activeBets || []);
      setActiveBets({});
      setCountdownProgress(1);
      notifyRoundCreated(data.roundNumber);
    });

    s.on('round:countdown_tick', (data) => {
      setCountdownProgress(parseFloat(data.progress));
      if (parseFloat(data.progress) < 0.2) {
        sound.playCountdownTick();
      }
    });

    s.on('round:started', (data) => {
      setGameState('FLYING');
      setRoundNumber(data.roundNumber);
      sound.startFlightSound();
      notifyRoundStarted(data.roundNumber, { multiplierStart: 1 });
    });

    s.on('round:tick', (data) => {
      setMultiplier(data.multiplier);
      sound.updateFlightPitch(data.multiplier);
    });

    s.on('round:cashout', (data) => {
      setAllBets(prev => prev.map(b => b.id === data.betId ? {
        ...b,
        status: 'cashed_out',
        cashoutMultiplier: data.multiplier,
        winAmount: data.winAmount
      } : b));

      if (user && data.userId === user.id) {
        sound.playCashout();
        setActiveBets(prev => {
          const next = { ...prev };
          for (const pid of [1, 2]) {
            if (next[pid] && next[pid].id === data.betId) {
              next[pid] = {
                ...next[pid],
                status: 'cashed_out',
                cashoutMultiplier: data.multiplier,
                winAmount: data.winAmount
              };
            }
          }
          return next;
        });
      }
    });

    s.on('round:crashed', (data) => {
      setGameState('CRASHED');
      setMultiplier(data.finalMultiplier);
      sound.playCrash();
      notifyRoundEnded(data.roundNumber, {
        result: 'CRASH',
        finalMultiplier: data.finalMultiplier
      });

      const newRound = {
        round_number: data.roundNumber,
        crash_multiplier: data.finalMultiplier,
        server_seed: data.serverSeed,
        client_seed: data.clientSeed,
        nonce: data.nonce,
        hash: data.hash,
        seed_hash: data.publicHash,
        publicHash: data.publicHash,
        chain_hash: data.chainHash,
        prev_chain_hash: data.prevChainHash
      };

      setRecentHistory(prev => [...prev.slice(-35), newRound]);

      setActiveBets(prev => {
        const next = { ...prev };
        for (const pid in next) {
          if (next[pid].status === 'active') {
            next[pid].status = 'lost';
          }
        }
        return next;
      });
    });

    s.on('round:new_bet', (data) => {
      setAllBets(prev => [data.bet, ...prev]);
    });

    s.on('wallet:updated', (data) => {
      setUser(prev => prev ? { ...prev, balance: data.balance } : null);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user?.id, token]);

  useEffect(() => {
    fetch(`${API_BASE}/api/game/leaderboard`)
      .then(res => res.json())
      .then(d => {
        if (d.topWins) {
          setTopWins(d.topWins);
          cacheLeaderboard(d.topWins);
        }
      })
      .catch(() => { });
  }, [gameState]);

  // Betting Actions
  const handlePlaceBet = (panelId, amount, autoCashout) => {
    if (!socket || !user) {
      setShowAuth(true);
      return;
    }

    socket.emit('bet:place', {
      panelId,
      amount,
      autoCashout,
      sessionToken: getSessionToken()
    }, (res) => {
      if (res && res.success) {
        setActiveBets(prev => ({
          ...prev,
          [panelId]: {
            id: res.betId,
            userId: user.id,
            panelId,
            betAmount: amount,
            autoCashout,
            status: 'active'
          }
        }));
        if (res.newBalance != null) {
          setUser(prev => ({ ...prev, balance: res.newBalance }));
        }
      } else {
        showToast(res?.message || 'Failed to place bet', 'error');
      }
    });
  };

  const handleCancelBet = (panelId) => {
    if (!socket || !user) return;
    socket.emit('bet:cancel', {
      panelId,
      sessionToken: getSessionToken()
    }, (res) => {
      if (res && res.success) {
        setActiveBets(prev => {
          const next = { ...prev };
          delete next[panelId];
          return next;
        });
        if (res.newBalance != null) {
          setUser(prev => ({ ...prev, balance: res.newBalance }));
        }
      } else if (res?.message) {
        showToast(res.message, 'error');
      }
    });
  };

  const handleCashout = (panelId) => {
    if (!socket || !user) return;
    socket.emit('bet:cashout', {
      panelId,
    });
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.toggleSfx(next);
    if (next) sound.unlock();
  };

  const toggleMusic = () => {
    const next = !musicEnabled;
    setMusicEnabled(next);
    sound.toggleMusic(next);
    if (next) sound.unlock();
  };

  /** Header mute: turns music + sound on/off together */
  const toggleAllAudio = () => {
    const next = !(soundEnabled || musicEnabled);
    setSoundEnabled(next);
    setMusicEnabled(next);
    sound.toggle(next);
    if (next) sound.unlock();
  };

  if (bootState === 'loading') {
    return (
      <div className="min-h-dvh bg-[#050b14] text-gray-400 flex items-center justify-center text-sm tracking-wide">
        Starting session…
      </div>
    );
  }

  if (bootState === 'blocked') {
    return <SessionGate message={sessionError} />;
  }

  return (
    <div className="h-dvh max-h-dvh bg-[#050b14] text-gray-100 flex flex-col font-sans select-none antialiased relative safe-area overflow-hidden">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      {providerMode && (
        <div className="absolute top-2 right-2 z-50 text-[10px] uppercase tracking-widest text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5">
          Provider
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/[0.03] to-transparent z-0" />

      <TopGunHeader
        history={recentHistory}
        username={user?.username || 'TopGunPilot'}
        balance={user ? user.balance : 5895.75}
        onOpenWallet={() => setShowWallet(true)}
        onOpenProfile={() => setShowMenu(true)}
      />

      {/* Mobile: this pane scrolls. Desktop: no page scroll, side layout */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain touch-pan-y md:overflow-hidden md:flex md:flex-row p-1.5 sm:p-2 md:p-3 gap-1.5 md:gap-3 z-10">
        <div className="flex flex-col gap-1.5 md:gap-3 min-w-0 md:flex-1 md:min-h-0 md:overflow-hidden md:h-full">
          {/* Stage: taller on phones so bike/scene breathe; desktop fills column */}
          <div className="w-full aspect-[16/10] min-h-[200px] max-h-[42vh] sm:max-h-none md:aspect-auto md:h-auto md:min-h-0 md:max-h-none md:flex-1 overflow-hidden shrink-0 rounded-lg md:rounded-xl">
            <RikshaCanvas
              state={gameState}
              multiplier={multiplier}
              countdownProgress={countdownProgress}
              vehicle={vehicle}
              onToggleSound={toggleAllAudio}
              soundEnabled={soundEnabled || musicEnabled}
              onOpenMenu={() => setShowMenu(true)}
            />
          </div>

          {/* Stacked bet panels on mobile; side-by-side on desktop */}
          <div className="flex flex-col md:grid md:grid-cols-2 items-stretch gap-1.5 md:gap-2 shrink-0">
            <TopGunBetConsole
              panelId={1}
              gameState={gameState}
              currentMultiplier={multiplier}
              userBalance={user ? user.balance : 0}
              activeBet={activeBets[1]}
              onPlaceBet={handlePlaceBet}
              onCancelBet={handleCancelBet}
              onCashout={handleCashout}
              sound={sound}
            />

            <TopGunBetConsole
              panelId={2}
              gameState={gameState}
              currentMultiplier={multiplier}
              userBalance={user ? user.balance : 0}
              activeBet={activeBets[2]}
              onPlaceBet={handlePlaceBet}
              onCancelBet={handleCancelBet}
              onCashout={handleCashout}
              sound={sound}
            />
          </div>

          {/* Players under bets on mobile — compact so stage + bets stay in view */}
          <div className="md:hidden w-full h-[min(240px,38vh)] shrink-0 pb-8">
            <TopGunPlayersList allBets={allBets} currentUserId={user?.id} />
          </div>
        </div>

        {/* Players sidebar on desktop */}
        <div className="hidden md:flex w-full md:w-72 lg:w-80 xl:w-[340px] flex-col shrink-0 min-h-0 md:h-full">
          <TopGunPlayersList allBets={allBets} currentUserId={user?.id} />
        </div>
      </div>

      {/* Modals */}
      {showTop20 && (
        <Top20Modal
          topWins={topWins}
          onClose={() => setShowTop20(false)}
        />
      )}

      {showMenu && (
        <RikshaMenuModal
          user={user}
          soundEnabled={soundEnabled}
          musicEnabled={musicEnabled}
          onToggleSound={toggleSound}
          onToggleMusic={toggleMusic}
          onOpenWallet={() => setShowWallet(true)}
          onOpenHowToPlay={() => setShowHowToPlay(true)}
          onOpenAuth={() => setShowAuth(true)}
          onLogout={handleLogout}
          onClose={() => setShowMenu(false)}
        />
      )}

      {showWallet && (
        <WalletModal
          balance={user ? user.balance : 0}
          token={token}
          onBalanceUpdated={(newBal) => setUser(prev => ({ ...prev, balance: newBal }))}
          onClose={() => setShowWallet(false)}
        />
      )}

      {showHowToPlay && (
        <HowToPlayModal
          onClose={() => setShowHowToPlay(false)}
        />
      )}

      {showAuth && (
        <AuthModal
          onLoginSuccess={handleLoginSuccess}
          onClose={() => setShowAuth(false)}
        />
      )}
    </div>
  );
}
