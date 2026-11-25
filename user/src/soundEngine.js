/**
 * Game SFX — Web Audio for UI beeps, HTMLAudio for MP3 samples + looping BGM.
 * Music and sound effects can be toggled independently.
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.sfxEnabled = true;
    this.musicEnabled = true;
    this.unlocked = false;
    this._pendingFlight = false;
    this._flightActive = false;
    this._onStartEnded = null;
    this._masterGain = null;
    this.volumes = {
      bg: 0.35,
      start: 0.45,
      loop: 0.4,
      crash: 1.0,
      crashImpact: 1.0
    };
    this.audios = {
      bg: null,
      start: null,
      loop: null,
      crash: null,
      crashImpact: null
    };
  }

  /** Combined “anything on” — used by header mute icon */
  get enabled() {
    return this.sfxEnabled || this.musicEnabled;
  }

  _sfxKeys() {
    return ['start', 'loop', 'crash', 'crashImpact'];
  }

  _ensureAudios() {
    if (!this.audios.bg) {
      this.audios.bg = new Audio('/sounds/bg-music.mp3');
      this.audios.bg.preload = 'auto';
      this.audios.bg.loop = true;
    }
    if (!this.audios.start) {
      this.audios.start = new Audio('/sounds/bike-start.mp3');
      this.audios.start.preload = 'auto';
    }
    if (!this.audios.loop) {
      this.audios.loop = new Audio('/sounds/bike-loop.mp3');
      this.audios.loop.preload = 'auto';
      this.audios.loop.loop = true;
    }
    if (!this.audios.crash) {
      this.audios.crash = new Audio('/sounds/anime-ahh.mp3');
      this.audios.crash.preload = 'auto';
    }
    if (!this.audios.crashImpact) {
      this.audios.crashImpact = new Audio('/sounds/car-crash.mp3');
      this.audios.crashImpact.preload = 'auto';
    }
    this._applyMuteState();
  }

  _applyMuteState() {
    const bg = this.audios.bg;
    if (bg) {
      bg.muted = !this.musicEnabled;
      bg.volume = this.musicEnabled ? this.volumes.bg : 0;
    }
    this._sfxKeys().forEach((key) => {
      const a = this.audios[key];
      if (!a) return;
      a.muted = !this.sfxEnabled;
      a.volume = this.sfxEnabled ? (this.volumes[key] ?? 1) : 0;
    });
    if (this._masterGain && this.ctx) {
      this._masterGain.gain.setValueAtTime(this.sfxEnabled ? 1 : 0, this.ctx.currentTime);
    }
  }

  _stopSfx() {
    this._pendingFlight = false;
    this._flightActive = false;
    const start = this.audios.start;
    if (start && this._onStartEnded) {
      start.removeEventListener('ended', this._onStartEnded);
      this._onStartEnded = null;
    }
    this._sfxKeys().forEach((key) => {
      const a = this.audios[key];
      if (!a) return;
      try {
        a.pause();
        a.currentTime = 0;
      } catch (_) {}
    });
  }

  _pauseBg() {
    const bg = this.audios.bg;
    if (!bg) return;
    try {
      bg.pause();
    } catch (_) {}
  }

  startBgMusic() {
    if (!this.musicEnabled) return;
    this._ensureAudios();
    const bg = this.audios.bg;
    if (!bg) return;
    bg.loop = true;
    bg.muted = false;
    bg.volume = this.volumes.bg;
    if (!bg.paused) return;
    const p = bg.play();
    if (p && typeof p.catch === 'function') {
      p.catch((err) => {
        console.warn('[sound] bg blocked', err?.message || err);
        this.unlocked = false;
      });
    }
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && !this._masterGain) {
      this._masterGain = this.ctx.createGain();
      this._masterGain.gain.value = this.sfxEnabled ? 1 : 0;
      this._masterGain.connect(this.ctx.destination);
    }
    if (this.ctx && this.ctx.state === 'suspended' && (this.sfxEnabled || this.musicEnabled)) {
      this.ctx.resume().catch(() => {});
    }
  }

  async unlock() {
    this._ensureAudios();
    this.init();

    try {
      if (this.ctx && this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
    } catch (_) {}

    // One-time gesture unlock only — later taps must NOT pause bike SFX mid-flight
    if (!this.unlocked) {
      const sfxTasks = this._sfxKeys().map(async (key) => {
        const a = this.audios[key];
        if (!a) return;
        try {
          a.muted = true;
          a.currentTime = 0;
          await a.play();
          a.pause();
          a.currentTime = 0;
        } catch (_) {
        } finally {
          a.muted = !this.sfxEnabled;
        }
      });

      const bg = this.audios.bg;
      let bgTask = Promise.resolve();
      if (bg && bg.paused) {
        bgTask = (async () => {
          try {
            bg.muted = true;
            await bg.play();
            if (!this.musicEnabled) bg.pause();
          } catch (_) {}
        })();
      }

      await Promise.all([...sfxTasks, bgTask]);
      this.unlocked = true;
      this._applyMuteState();
    }

    if (this.musicEnabled) this.startBgMusic();

    if (this._pendingFlight && this.sfxEnabled && !this._flightActive) {
      this._pendingFlight = false;
      this.startFlightSound();
    }
    return true;
  }

  /** Header mute: turn everything off, or restore both on */
  toggle(enabled) {
    const on = !!enabled;
    this.sfxEnabled = on;
    this.musicEnabled = on;
    this._ensureAudios();
    if (!on) {
      this._stopSfx();
      this._pauseBg();
    } else {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      if (this.unlocked) this.startBgMusic();
      else this.unlock();
    }
    this._applyMuteState();
  }

  toggleSfx(enabled) {
    this.sfxEnabled = !!enabled;
    this._ensureAudios();
    if (!this.sfxEnabled) this._stopSfx();
    else {
      this.init();
      if (!this.unlocked) this.unlock();
    }
    this._applyMuteState();
  }

  toggleMusic(enabled) {
    this.musicEnabled = !!enabled;
    this._ensureAudios();
    if (!this.musicEnabled) this._pauseBg();
    else {
      this.init();
      if (this.unlocked) this.startBgMusic();
      else this.unlock();
    }
    this._applyMuteState();
  }

  _safePlay(audio) {
    if (!this.sfxEnabled || !audio) return Promise.resolve(false);
    try {
      audio.muted = false;
      audio.currentTime = 0;
      const p = audio.play();
      if (p && typeof p.then === 'function') {
        return p.then(() => true).catch((err) => {
          console.warn('[sound] play blocked', err?.message || err);
          this.unlocked = false;
          return false;
        });
      }
      return Promise.resolve(true);
    } catch (e) {
      console.warn('[sound] play error', e);
      return Promise.resolve(false);
    }
  }

  _beep(type, freqStart, freqEnd, duration, volume) {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx || !this._masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, this.ctx.currentTime);
      if (freqEnd != null) {
        osc.frequency.exponentialRampToValueAtTime(freqEnd, this.ctx.currentTime + duration);
      }
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this._masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + duration + 0.02);
    } catch (_) {}
  }

  playClick() {
    if (!this.sfxEnabled) return;
    this.unlock();
    this._beep('sine', 800, 400, 0.04, 0.12);
  }

  playCountdownTick() {
    if (!this.sfxEnabled) return;
    this._beep('triangle', 650, null, 0.06, 0.15);
  }

  startFlightSound() {
    if (!this.sfxEnabled) return;
    this._ensureAudios();

    if (!this.unlocked) {
      this._pendingFlight = true;
      this.unlock();
      return;
    }

    this.stopFlightSound(false);
    this._pendingFlight = false;
    this._flightActive = true;

    const start = this.audios.start;
    const loop = this.audios.loop;

    this._onStartEnded = () => {
      if (!this.sfxEnabled || !this._flightActive) return;
      this._safePlay(loop).then((ok) => {
        if (!ok && this.sfxEnabled && this._flightActive) {
          // Retry loop once if browser hiccuped
          setTimeout(() => {
            if (this.sfxEnabled && this._flightActive) this._safePlay(loop);
          }, 120);
        }
      });
    };
    start.addEventListener('ended', this._onStartEnded);

    this._safePlay(start).then((ok) => {
      if (!ok && this.sfxEnabled) {
        this._flightActive = false;
        this._pendingFlight = true;
      }
    });
  }

  updateFlightPitch(_multiplier) {}

  stopFlightSound(clearPending = true) {
    if (clearPending) this._pendingFlight = false;
    this._flightActive = false;

    const start = this.audios.start;
    const loop = this.audios.loop;

    if (start && this._onStartEnded) {
      start.removeEventListener('ended', this._onStartEnded);
      this._onStartEnded = null;
    }

    [start, loop].forEach((a) => {
      if (!a) return;
      try {
        a.pause();
        a.currentTime = 0;
      } catch (_) {}
    });
  }

  playCashout() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx || !this._masterGain) return;

    try {
      const now = this.ctx.currentTime;
      [587.33, 880, 1174.66].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.18, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.45);
        osc.connect(gain);
        gain.connect(this._masterGain);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.5);
      });
    } catch (_) {}
  }

  /** Play sample loud on the first hit, then fade down. */
  _playCrashHit(audio, peak = 1, sustain = 0.28, fadeMs = 900) {
    if (!audio || !this.sfxEnabled) return;
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
      audio.volume = peak;
      const p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});

      const t0 = performance.now();
      const tick = () => {
        if (!this.sfxEnabled) {
          audio.volume = 0;
          return;
        }
        const u = Math.min(1, (performance.now() - t0) / fadeMs);
        // Hard at first → exponential reduce to sustain
        audio.volume = sustain + (peak - sustain) * Math.exp(-u * 4.2);
        if (u < 1 && !audio.paused) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch (_) {}
  }

  playCrash() {
    if (!this.sfxEnabled) return;
    this.stopFlightSound();
    this._ensureAudios();

    // Impact: slam loud, then reduce. Voice: slightly softer sustain.
    this._playCrashHit(this.audios.crashImpact, 1.0, 0.22, 850);
    this._playCrashHit(this.audios.crash, 0.95, 0.3, 1100);

    this.init();
    if (!this.ctx || !this._masterGain) return;
    try {
      const bufferSize = this.ctx.sampleRate * 0.28;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(320, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(55, this.ctx.currentTime + 0.22);
      const gain = this.ctx.createGain();
      // Hard transient then quick reduce
      gain.gain.setValueAtTime(0.28, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.04, this.ctx.currentTime + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.28);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this._masterGain);
      noise.start();
    } catch (_) {}
  }
}

export const sound = new SoundEngine();
