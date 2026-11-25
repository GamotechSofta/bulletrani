import React, { useEffect, useRef } from 'react';
import {
  IconVolumeUp,
  IconVolumeMute,
  IconMenu,
  IconPropeller
} from './Icons';

export default function RikshaCanvas({
  state,
  multiplier,
  countdownProgress,
  vehicle = 'bike',
  onToggleSound,
  soundEnabled,
  onOpenMenu
}) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const bikeImgRef = useRef(null);
  // Keep latest props in refs so the rAF loop does NOT restart every tick
  // (restarting was clearing canvas.width and causing flicker while flying)
  const stateRef = useRef(state);
  const multiplierRef = useRef(multiplier);
  const vehicleRef = useRef(vehicle);

  // Parallax offsets (scrolling LEFT to create forward motion)
  const roadOffsetRef = useRef(0);
  const midgroundOffsetRef = useRef(0);
  const farOffsetRef = useRef(0);
  const skyOffsetRef = useRef(0);
  const engineVibeRef = useRef(0);
  const starsRef = useRef([]);
  const dayPhaseRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const lastVehicleRef = useRef({ x: 0, y: 0 });
  const crashRef = useRef({
    seeded: false,
    t0: 0,
    x: 0,
    y: 0,
    mult: 1,
    hitBurst: false,
    lastTs: 0,
    phys: null,
    particles: [],
    sparks: [],
    shards: [],
    dust: [],
    rocks: []
  });

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { multiplierRef.current = multiplier; }, [multiplier]);
  useEffect(() => { vehicleRef.current = vehicle; }, [vehicle]);

  // Preload bike image
  useEffect(() => {
    const img = new Image();
    img.src = '/bike.png';
    img.onload = () => {
      bikeImgRef.current = img;
    };

    // Pre-generate starfield — sparse blinkers + a few strong twinkles
    const stars = [];
    for (let i = 0; i < 95; i++) {
      const blinkRoll = Math.random();
      stars.push({
        x: Math.random(),
        y: Math.random() * 0.52,
        size: Math.random() < 0.82 ? 0.55 + Math.random() * 0.7 : 1.0 + Math.random() * 1.2,
        bright: 0.35 + Math.random() * 0.65,
        twinkle: Math.random() * Math.PI * 2,
        speed: 0.9 + Math.random() * 2.4,
        glow: Math.random() > 0.9,
        // most stars blink; ~20% strong on/off
        blinks: blinkRoll < 0.78,
        blinkStrong: blinkRoll < 0.2,
        rot: Math.random() * Math.PI
      });
    }
    starsRef.current = stars;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const nextW = Math.max(1, Math.floor(rect.width * dpr));
      const nextH = Math.max(1, Math.floor(rect.height * dpr));
      // Only reset buffer when size actually changes (setting width clears the canvas)
      if (canvas.width === nextW && canvas.height === nextH) return;
      canvas.width = nextW;
      canvas.height = nextH;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    handleResize();
    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => handleResize())
      : null;
    if (ro) ro.observe(canvas.parentElement || canvas);
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    const render = () => {
      const state = stateRef.current;
      const multiplier = multiplierRef.current;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      if (width < 2 || height < 2) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      // Full-frame opaque sky fill is drawn next — skip clearRect flash
      // --- 1. DETERMINE SPEED & PROGRESSION ---
      let baseSpeed = 0;
      if (state === 'FLYING') {
        baseSpeed = Math.min(32, 6.0 + Math.log(Math.max(1, multiplier)) * 6.5);
      } else if (state === 'WAITING') {
        baseSpeed = 2.2; // Cruising forward waiting for round
      } else {
        baseSpeed = 0.4;
      }

      // Parallax update (All background layers move to the LEFT)
      roadOffsetRef.current = (roadOffsetRef.current + baseSpeed) % 100000;
      midgroundOffsetRef.current = (midgroundOffsetRef.current + baseSpeed * 0.45) % 100000;
      farOffsetRef.current = (farOffsetRef.current + baseSpeed * 0.15) % 100000;
      skyOffsetRef.current = (skyOffsetRef.current + baseSpeed * 0.05) % 100000;

      // Engine vibration / suspension thump
      engineVibeRef.current += baseSpeed * 0.35;
      const thumpingVibe = Math.sin(engineVibeRef.current) * (state === 'FLYING' ? 1.5 : 0.8);

      const currentMult = state === 'FLYING' || state === 'CRASHED' ? multiplier : 1.0;

      // Day ↔ night advances on real time (not bike speed)
      const now = performance.now();
      if (!lastFrameTimeRef.current) lastFrameTimeRef.current = now;
      const dt = Math.min(0.05, (now - lastFrameTimeRef.current) / 1000);
      lastFrameTimeRef.current = now;
      // Full cycle ~40s — longer, smoother day → evening → night
      if (baseSpeed > 0.5) {
        dayPhaseRef.current = (dayPhaseRef.current + dt / 40) % 1;
      }
      const dayCycle = getDayCycleFromPhase(dayPhaseRef.current);

      // Scale scene for small/mobile canvases so bike, buildings & clouds don't dominate
      const sceneScale = Math.max(0.42, Math.min(1, Math.min(height / 420, width / 780)));

      // --- 2. SKY & CLOUDS ---
      drawModernSky(ctx, width, height, skyOffsetRef.current, dayCycle, sceneScale);

      // --- 3. FAR BACKGROUND ---
      drawFarSilhouettes(ctx, width, height * 0.62, dayCycle, farOffsetRef.current, sceneScale);

      // --- 4. MIDGROUND buildings & palms ---
      const roadTop = height * (height < 260 ? 0.62 : 0.68);
      drawCityTown(ctx, width, roadTop, dayCycle, midgroundOffsetRef.current, sceneScale);

      // --- 5. FOREGROUND ROAD ---
      const roadHeight = height - roadTop;
      const curbH = Math.max(5, 9 * sceneScale);
      const night = dayCycle.night;

      ctx.fillStyle = lerpHex('#b8c0c8', '#121820', night);
      ctx.fillRect(0, roadTop, width, curbH);
      ctx.fillStyle = lerpHex('#9aa4ae', '#0a0e14', night);
      ctx.fillRect(0, roadTop + curbH - 2, width, 2);
      // Thin curb highlight — warm by day, cool edge at night
      if (night > 0.35) {
        ctx.fillStyle = `rgba(90, 120, 180, ${0.12 * night})`;
        ctx.fillRect(0, roadTop, width, 1.5);
      }

      const roadGrad = ctx.createLinearGradient(0, roadTop + curbH, 0, height);
      roadGrad.addColorStop(0, lerpHex('#5c6674', '#12161e', night));
      roadGrad.addColorStop(0.35, lerpHex('#4a5360', '#0c1016', night));
      roadGrad.addColorStop(1, lerpHex('#343c48', '#06080c', night));
      ctx.fillStyle = roadGrad;
      ctx.fillRect(0, roadTop + curbH, width, roadHeight - curbH);

      const edgeGrad = ctx.createLinearGradient(0, roadTop + curbH, 0, height);
      edgeGrad.addColorStop(0, 'rgba(0,0,0,0)');
      edgeGrad.addColorStop(1, `rgba(0,0,0,${0.22 + night * 0.38})`);
      ctx.fillStyle = edgeGrad;
      ctx.fillRect(0, roadTop + curbH, width, roadHeight - curbH);

      // Lane dashes — fade to soft cool markers at night
      const stripeA = 0.95 - night * 0.72;
      ctx.fillStyle = night > 0.5
        ? `rgba(160, 185, 230, ${stripeA})`
        : `rgba(220, 230, 245, ${stripeA})`;
      const stripeY = roadTop + roadHeight * 0.48;
      const stripeWidth = Math.max(28, 56 * sceneScale);
      const stripeGap = Math.max(18, 32 * sceneScale);
      const stripeH = Math.max(4, 7 * sceneScale);
      const totalStripeStep = stripeWidth + stripeGap;
      const stripeShift = roadOffsetRef.current % totalStripeStep;

      for (let x = -totalStripeStep - stripeShift; x < width + totalStripeStep; x += totalStripeStep) {
        ctx.fillRect(x, stripeY, stripeWidth, stripeH);
      }

      // Streetlights along the curb (glow on road, poles in front of asphalt)
      drawStreetlights(ctx, width, roadTop, curbH, roadHeight, dayCycle, midgroundOffsetRef.current, sceneScale);

      // --- 6. VEHICLE (keep left like reference) ---
      let vehicleX = Math.max(70 * sceneScale, width * 0.14);
      if (state === 'FLYING') {
        const progress = Math.min(1, Math.log(multiplier) / Math.log(25));
        vehicleX = Math.max(70 * sceneScale, width * 0.14) + (width * 0.28) * progress;
      }

      const roadBaseline = roadTop + roadHeight * 0.40;
      const vehicleY = roadBaseline + thumpingVibe * sceneScale;

      if (state === 'FLYING') {
        lastVehicleRef.current = { x: vehicleX, y: vehicleY };
        crashRef.current.seeded = false;
      }

      if (state === 'FLYING' && multiplier > 1.0) {
        drawAviatorSpeedCurve(ctx, width, height, roadTop, vehicleX, vehicleY, currentMult, sceneScale);
      }

      if (state === 'CRASHED') {
        seedCrashIfNeeded(vehicleX, vehicleY, multiplier, sceneScale);
        drawCrashSequence(ctx, width, height, roadTop, sceneScale, currentMult);
      } else if (bikeImgRef.current && bikeImgRef.current.complete) {
        drawRoyalEnfield(ctx, vehicleX, vehicleY, currentMult, state, multiplier, sceneScale);
      }

      // Color grades
      if (night < 0.85) {
        const dayKeep = Math.max(0, 1 - night) * (1 - dayCycle.golden * 0.65);
        if (dayKeep > 0.02) {
          const grade = ctx.createLinearGradient(0, 0, 0, height);
          const ga = dayKeep * 0.1;
          grade.addColorStop(0, `rgba(30, 70, 120, ${ga * 0.4})`);
          grade.addColorStop(0.5, `rgba(20, 45, 80, ${ga * 0.12})`);
          grade.addColorStop(1, `rgba(15, 30, 50, ${ga * 0.35})`);
          ctx.fillStyle = grade;
          ctx.fillRect(0, 0, width, height);
        }
        if (dayCycle.golden > 0.05) {
          const warm = ctx.createLinearGradient(0, 0, 0, height);
          const wa = dayCycle.golden * (1 - night * 0.5) * 0.22;
          warm.addColorStop(0, `rgba(80, 40, 90, ${wa * 0.25})`);
          warm.addColorStop(0.55, `rgba(180, 90, 50, ${wa * 0.2})`);
          warm.addColorStop(1, `rgba(200, 100, 40, ${wa * 0.35})`);
          ctx.fillStyle = warm;
          ctx.fillRect(0, 0, width, height);
        }
      }
      // Night mood — light vignette only (keep scene readable)
      if (night > 0.3) {
        const na = (night - 0.3) / 0.7;
        const vig = ctx.createRadialGradient(width * 0.5, height * 0.38, height * 0.2, width * 0.5, height * 0.5, height * 0.95);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, `rgba(4, 8, 16, ${0.28 * na})`);
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, width, height);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (ro) ro.disconnect();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []); // mount once — read live state/multiplier via refs (avoids flicker on every tick)

  const seedCrashIfNeeded = (fallbackX, fallbackY, mult, sceneScale) => {
    const crash = crashRef.current;
    if (crash.seeded) return;

    const x = lastVehicleRef.current.x || fallbackX;
    const y = lastVehicleRef.current.y || fallbackY;
    const s = sceneScale;
    const stoneX = x + Math.max(70, 96 * s);
    const stoneY = y + 8 * s;
    // Contact = front of bike against left face of boulder
    const contactX = stoneX - 52 * s;

    crash.seeded = true;
    crash.hitBurst = false;
    crash.t0 = performance.now();
    crash.lastTs = crash.t0;
    crash.x = x;
    crash.y = y;
    crash.mult = mult;
    crash.particles = [];
    crash.sparks = [];
    crash.shards = [];
    crash.dust = [];
    crash.rocks = [];
    // Simple rigid-body-ish sim: run into rock → stop → tip over → scrape on asphalt
    crash.phys = {
      x,
      y,
      vx: Math.max(420, 520 * s), // px/s toward stone
      vy: 0,
      rot: -0.06,
      vr: 0,
      squash: 1,
      groundY: y + 6 * s,
      stoneX,
      stoneY,
      contactX,
      phase: 'run', // run | crush | tip | slide
      hitAt: 0,
      scrapeDust: 0
    };
  };

  const burstImpactDebris = (crash, stoneX, stoneY, sceneScale) => {
    if (crash.hitBurst) return;
    crash.hitBurst = true;
    const s = sceneScale;
    const cx = stoneX - 40 * s;
    const cy = stoneY - 6 * s;

    crash.dust = Array.from({ length: 18 }).map(() => {
      const ang = -Math.PI + Math.random() * Math.PI;
      const spd = (0.8 + Math.random() * 3.2) * s;
      return {
        x: cx + (Math.random() - 0.5) * 16 * s,
        y: cy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 0.8 * s,
        life: 0.9 + Math.random() * 0.8,
        size: (8 + Math.random() * 16) * s,
        color: Math.random() > 0.5 ? 'rgba(110,100,85,0.5)' : 'rgba(70,65,55,0.45)'
      };
    });

    crash.rocks = Array.from({ length: 12 }).map(() => {
      const ang = -Math.PI * 0.85 + Math.random() * Math.PI * 0.7;
      const spd = (2 + Math.random() * 6) * s;
      return {
        x: cx,
        y: cy - 8 * s,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 1.5 * s,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.35,
        size: (2.5 + Math.random() * 7) * s,
        life: 0.9 + Math.random() * 0.6,
        color: Math.random() > 0.5 ? '#6b7280' : '#4b5563'
      };
    });

    crash.sparks = Array.from({ length: 14 }).map(() => {
      const ang = -Math.PI * 0.15 - Math.random() * Math.PI * 0.55;
      const spd = (4 + Math.random() * 9) * s;
      return {
        x: cx,
        y: cy + 4 * s,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0.15 + Math.random() * 0.3,
        len: (4 + Math.random() * 10) * s
      };
    });

    crash.shards = [];
    crash.particles = [];
  };

  const stepCrashPhysics = (crash, sceneScale, now) => {
    const p = crash.phys;
    if (!p) return;
    const dt = Math.min(0.033, Math.max(0.008, (now - crash.lastTs) / 1000));
    crash.lastTs = now;
    const s = sceneScale;

    // Sprite is a seated rider — never rotate near 90° (looks like standing on the nose).
    // Final rest = low crumple against the stone (~20–35° lean).
    const REST_ROT = 0.42;

    if (p.phase === 'run') {
      p.x += p.vx * dt;
      p.y = crash.y + Math.sin(now * 0.05) * 0.8 * s;
      p.rot = -0.04 - Math.min(0.1, (p.x - crash.x) / (220 * s));
      if (p.x >= p.contactX) {
        p.x = p.contactX;
        p.phase = 'crush';
        p.hitAt = now;
        p.vx = -70 * s;
        p.vy = -40 * s; // tiny hop only — stay near asphalt
        p.vr = 2.2; // pitch into stone, not a vertical endo
        p.squash = 0.82;
        burstImpactDebris(crash, p.stoneX, p.stoneY, sceneScale);
      }
      return;
    }

    if (p.phase === 'crush') {
      const age = (now - p.hitAt) / 1000;
      p.squash = 0.82 + Math.min(0.18, age * 2.5);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 1100 * s * dt;
      p.vx *= 0.88;
      p.rot += p.vr * dt;
      p.vr *= 0.94;
      // Cap so we never go vertical
      if (p.rot > 0.55) p.rot = 0.55;
      if (p.rot < -0.35) p.rot = -0.35;
      if (p.y > p.groundY) {
        p.y = p.groundY;
        p.vy = 0;
      }
      if (age > 0.12) {
        p.phase = 'settle';
        p.vx = -25 * s;
        p.vr = (REST_ROT - p.rot) * 3;
        p.squash = 1;
        p.scrapeDust = 1;
      }
      return;
    }

    // settle — ease into crumpled lean against the rock, low on the road
    {
      p.x += p.vx * dt;
      p.vx *= Math.pow(0.08, dt);
      p.rot += (REST_ROT - p.rot) * Math.min(1, 6 * dt);
      p.vr *= 0.85;
      // Sink slightly so wheels/body read as on asphalt
      const sink = Math.min(1, (now - p.hitAt) / 1000);
      p.y = p.groundY + 4 * s + sink * 6 * s;
      // Keep pressed near stone face
      const minX = p.contactX - 18 * s;
      const maxX = p.contactX + 6 * s;
      if (p.x < minX) p.x = minX;
      if (p.x > maxX) p.x = maxX;
      p.scrapeDust = Math.min(1, Math.abs(p.vx) / (30 * s));
      if (Math.abs(p.vx) < 3 * s) p.vx = 0;
    }
  };

  /** Low, heavy roadside boulder — planted, not floating */
  const drawCrashStone = (ctx, stoneX, stoneY, sceneScale, impact = 0) => {
    const s = sceneScale;
    const shake = impact > 0.05 ? Math.sin(impact * 70) * 4 * s * impact : 0;
    const sx = stoneX + shake;
    const sy = stoneY;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(sx, sy + 20 * s, 70 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fill();
    ctx.restore();

    // Wider / lower rock (looks like it sits ON the road)
    const pts = [
      [-62, 18], [-58, -2], [-42, -28], [-16, -44],
      [10, -50], [36, -42], [56, -22], [66, 2],
      [60, 22], [28, 30], [-8, 32], [-44, 26]
    ];

    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(s, s);

    const grad = ctx.createLinearGradient(-60, -50, 40, 30);
    grad.addColorStop(0, '#a8a29e');
    grad.addColorStop(0.4, '#78716c');
    grad.addColorStop(0.75, '#57534e');
    grad.addColorStop(1, '#292524');
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(28,25,23,0.95)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-20, -30);
    ctx.lineTo(6, -46);
    ctx.lineTo(30, -34);
    ctx.lineTo(10, -14);
    ctx.closePath();
    ctx.fillStyle = 'rgba(231,229,228,0.28)';
    ctx.fill();

    // Hit face
    ctx.beginPath();
    ctx.moveTo(-62, 12);
    ctx.lineTo(-50, -14);
    ctx.lineTo(-22, -20);
    ctx.lineTo(-30, 20);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fill();

    ctx.strokeStyle = 'rgba(28,25,23,0.6)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-4, -44);
    ctx.lineTo(2, -6);
    ctx.lineTo(18, 16);
    ctx.moveTo(2, -6);
    ctx.lineTo(-24, 8);
    ctx.stroke();

    if (impact > 0.2) {
      ctx.strokeStyle = `rgba(255, 236, 200, ${0.65 * impact})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-50, 0);
      ctx.lineTo(-32, 8);
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawCrashSequence = (ctx, width, height, roadTop, sceneScale, mult) => {
    const crash = crashRef.current;
    const now = performance.now();
    const elapsed = (now - crash.t0) / 1000;
    stepCrashPhysics(crash, sceneScale, now);
    const p = crash.phys;
    if (!p) return;

    const hitAge = p.phase === 'run' ? 0 : Math.max(0, (now - p.hitAt) / 1000);
    const hardHit = p.phase === 'run' ? 0 : Math.exp(-hitAge * 9);

    let camX = 0;
    let camY = 0;
    if (hardHit > 0.04) {
      camX = (Math.random() - 0.5) * 16 * sceneScale * hardHit;
      camY = (Math.random() - 0.5) * 10 * sceneScale * hardHit;
    }

    ctx.save();
    ctx.translate(camX, camY);

    drawAviatorSpeedCurve(ctx, width, height, roadTop, crash.x, crash.y, crash.mult || mult, sceneScale);

    // Skid growing toward contact
    const skidEnd = Math.min(p.x, p.contactX);
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = Math.max(2.2, 3.6 * sceneScale);
    ctx.lineCap = 'round';
    [-6, 5].forEach((oy) => {
      ctx.beginPath();
      ctx.moveTo(crash.x - 36 * sceneScale, crash.y + (14 + oy) * sceneScale * 0.15 + 12 * sceneScale);
      ctx.lineTo(skidEnd - 8 * sceneScale, p.groundY + 14 * sceneScale + oy * 0.4);
      ctx.stroke();
    });
    // Post-hit scrape mark
    if (p.phase === 'settle') {
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(p.contactX - 10 * sceneScale, p.groundY + 16 * sceneScale);
      ctx.lineTo(p.x, p.groundY + 18 * sceneScale);
      ctx.stroke();
    }
    ctx.restore();

    // Stone first (bike hits INTO it) — always full size, planted
    drawCrashStone(ctx, p.stoneX, p.stoneY, sceneScale, hardHit);

    // Continuous scrape dust while sliding
    if (p.phase === 'settle' && p.scrapeDust > 0.15 && Math.random() > 0.55) {
      crash.dust.push({
        x: p.x - 10 * sceneScale,
        y: p.groundY + 8 * sceneScale,
        vx: (-0.5 - Math.random()) * sceneScale,
        vy: (-0.4 - Math.random() * 0.8) * sceneScale,
        life: 0.5 + Math.random() * 0.4,
        size: (6 + Math.random() * 10) * sceneScale,
        color: 'rgba(90,85,75,0.4)'
      });
    }

    const crashBike = bikeImgRef.current;
    if (crashBike && crashBike.complete && crashBike.naturalWidth) {
      const aspect = crashBike.naturalWidth / Math.max(1, crashBike.naturalHeight);
      const maxH = Math.max(64, 115 * sceneScale);
      const maxW = Math.max(110, 195 * sceneScale);
      let bikeHeight = maxH;
      let bikeWidth = bikeHeight * aspect;
      if (bikeWidth > maxW) {
        bikeWidth = maxW;
        bikeHeight = bikeWidth / aspect;
      }

      // Contact shadow on road
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(
        p.x,
        p.groundY + 16 * sceneScale,
        bikeWidth * 0.38,
        Math.max(3, 5 * sceneScale) * (p.phase === 'settle' ? 1.25 : 1),
        0, 0, Math.PI * 2
      );
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(p.x, p.y - bikeHeight * 0.16);
      ctx.rotate(p.rot);
      ctx.scale(1, p.squash);
      ctx.drawImage(crashBike, -bikeWidth / 2, -bikeHeight / 2, bikeWidth, bikeHeight);
      ctx.restore();
    }

    // Subtle impact flash only (no full-screen cartoon blast)
    if (hardHit > 0.25) {
      ctx.save();
      ctx.fillStyle = `rgba(255,255,255,${0.22 * hardHit})`;
      ctx.fillRect(-camX, -camY, width, height);
      ctx.restore();
    }

    (crash.dust || []).forEach((d) => {
      d.x += d.vx;
      d.y += d.vy;
      d.vx *= 0.97;
      d.vy *= 0.98;
      d.life -= 0.012;
      d.size *= 1.01;
      if (d.life <= 0) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(0.45, d.life * 0.45));
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.size, d.size * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    (crash.rocks || []).forEach((r) => {
      r.x += r.vx;
      r.y += r.vy;
      r.vy += 0.28 * sceneScale;
      r.rot += r.vr;
      r.life -= 0.012;
      if (r.life <= 0) return;
      // settle on road
      if (r.y > p.groundY + 18 * sceneScale) {
        r.y = p.groundY + 18 * sceneScale;
        r.vy *= -0.2;
        r.vx *= 0.7;
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, r.life));
      ctx.translate(r.x, r.y);
      ctx.rotate(r.rot);
      ctx.fillStyle = r.color;
      ctx.fillRect(-r.size / 2, -r.size / 2, r.size, r.size * 0.65);
      ctx.restore();
    });

    (crash.sparks || []).forEach((sp) => {
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.vy += 0.25 * sceneScale;
      sp.life -= 0.028;
      if (sp.life <= 0) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, sp.life);
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = Math.max(1, 1.3 * sceneScale);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y);
      ctx.lineTo(sp.x - sp.vx * 1.3, sp.y - sp.vy * 1.3);
      ctx.stroke();
      ctx.restore();
    });

    ctx.restore();

    // Soft vignette — short
    if (elapsed < 0.9) {
      const v = Math.max(0, 1 - elapsed / 0.9) * 0.28;
      const vig = ctx.createRadialGradient(
        width * 0.5, height * 0.45, Math.min(width, height) * 0.22,
        width * 0.5, height * 0.45, Math.max(width, height) * 0.8
      );
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, `rgba(40, 8, 0, ${v})`);
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, width, height);
    }
  };

  // Smooth road-speed trail behind the bike (subtle, not neon scribble)
  const drawAviatorSpeedCurve = (ctx, width, height, roadTop, vx, vy, mult, sceneScale = 1) => {
    const originX = 4;
    const originY = roadTop + Math.max(10, 16 * sceneScale);
    const targetX = vx - Math.max(34, 46 * sceneScale);
    const targetY = vy + Math.max(4, 8 * sceneScale);

    if (targetX <= originX + 8) return;

    // Gentle lift with multiplier — stays near the road, not a steep ski-jump
    const lift = Math.min(height * 0.1, Math.log(Math.max(1.01, mult)) * 12 * sceneScale);
    const cp1x = originX + (targetX - originX) * 0.28;
    const cp1y = originY - lift * 0.08;
    const cp2x = originX + (targetX - originX) * 0.7;
    const cp2y = targetY - lift * 0.55;

    let strokeColor = '#f87171';
    if (mult >= 5 && mult < 15) strokeColor = '#4ade80';
    else if (mult >= 15) strokeColor = '#fbbf24';

    const lw = Math.max(1.6, 2.2 * sceneScale);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Soft under-fill (very light)
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, targetX, targetY);
    ctx.lineTo(targetX, originY + 2);
    ctx.lineTo(originX, originY + 2);
    ctx.closePath();
    const fillGrad = ctx.createLinearGradient(0, Math.min(cp2y, targetY) - 8, 0, originY + 4);
    fillGrad.addColorStop(0, `${strokeColor}18`);
    fillGrad.addColorStop(0.55, `${strokeColor}08`);
    fillGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Fade stroke from soft start → solid near bike
    const strokeGrad = ctx.createLinearGradient(originX, originY, targetX, targetY);
    strokeGrad.addColorStop(0, `${strokeColor}00`);
    strokeGrad.addColorStop(0.18, `${strokeColor}55`);
    strokeGrad.addColorStop(0.55, `${strokeColor}cc`);
    strokeGrad.addColorStop(1, strokeColor);

    // Outer soft halo (no heavy shadowBlur — that was looking muddy)
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, targetX, targetY);
    ctx.strokeStyle = `${strokeColor}33`;
    ctx.lineWidth = lw * 3.2;
    ctx.stroke();

    // Main trail
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, targetX, targetY);
    ctx.strokeStyle = strokeGrad;
    ctx.lineWidth = lw;
    ctx.stroke();

    // Bright core tip near the bike
    ctx.beginPath();
    ctx.moveTo(cp2x, cp2y);
    ctx.bezierCurveTo(
      cp2x + (targetX - cp2x) * 0.4,
      cp2y + (targetY - cp2y) * 0.4,
      targetX,
      targetY,
      targetX,
      targetY
    );
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = Math.max(0.8, lw * 0.45);
    ctx.stroke();

    ctx.restore();
  };

  // --- DRAW ROYAL ENFIELD BULLET 350 MOTORCYCLE ---
  const drawRoyalEnfield = (ctx, bx, by, currentMult, state, mult, sceneScale = 1) => {
    const img = bikeImgRef.current;
    if (!img || !img.complete || !img.naturalWidth) return;

    // Contain within a box using the image's real aspect — never stretch
    const aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
    // Prefer width on short mobile stages so the bike doesn't look tall/skinny
    const maxW = Math.max(125, 220 * sceneScale);
    const maxH = Math.max(74, 130 * sceneScale);
    let bikeWidth = maxW;
    let bikeHeight = bikeWidth / aspect;
    if (bikeHeight > maxH) {
      bikeHeight = maxH;
      bikeWidth = bikeHeight * aspect;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const bAngle = state === 'FLYING' ? -Math.min(0.06, (mult - 1) * 0.015) : 0;

    ctx.save();
    ctx.translate(bx, by - bikeHeight * 0.22);
    ctx.rotate(bAngle);

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, bikeHeight * 0.42, bikeWidth * 0.34, Math.max(3, 5 * sceneScale), 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.40)';
    ctx.fill();
    ctx.restore();

    ctx.drawImage(
      img,
      -bikeWidth / 2,
      -bikeHeight / 2,
      bikeWidth,
      bikeHeight
    );

    ctx.restore();
  };

  // Day → evening → night → dawn — wide overlapping S-curves for a buttery blend
  const getDayCycleFromPhase = (phase) => {
    // Night rises slowly through evening, holds, then eases out at dawn
    let night = 0;
    if (phase >= 0.18 && phase < 0.42) night = smoothstep((phase - 0.18) / 0.24);
    else if (phase >= 0.42 && phase < 0.60) night = 1;
    else if (phase >= 0.60 && phase < 0.88) night = 1 - smoothstep((phase - 0.60) / 0.28);

    // Golden hour starts in late day, peaks while night is climbing, then dissolves into night
    let golden = 0;
    if (phase >= 0.10 && phase < 0.22) golden = smoothstep((phase - 0.10) / 0.12);
    else if (phase >= 0.22 && phase < 0.34) golden = 1;
    else if (phase >= 0.34 && phase < 0.48) golden = 1 - smoothstep((phase - 0.34) / 0.14);
    // Dawn glow
    else if (phase >= 0.60 && phase < 0.74) golden = smoothstep((phase - 0.60) / 0.14);
    else if (phase >= 0.74 && phase < 0.90) golden = 1 - smoothstep((phase - 0.74) / 0.16);

    // How “daytime bright” the street still feels (for facades / palms)
    const dayLite = Math.max(0, 1 - night) * (1 - golden * 0.25);

    return { phase, night, golden, dayLite };
  };

  const smoothstep = (t) => {
    const x = Math.max(0, Math.min(1, t));
    return x * x * (3 - 2 * x);
  };

  const lerp = (a, b, t) => a + (b - a) * t;

  const lerpHex = (a, b, t) => {
    const pa = parseInt(a.replace('#', ''), 16);
    const pb = parseInt(b.replace('#', ''), 16);
    const r = Math.round(lerp((pa >> 16) & 0xff, (pb >> 16) & 0xff, t));
    const g = Math.round(lerp((pa >> 8) & 0xff, (pb >> 8) & 0xff, t));
    const bl = Math.round(lerp(pa & 0xff, pb & 0xff, t));
    return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
  };

  const celestialPos = (phase, width, skyHeight, isMoon) => {
    // Sun rises ~0.74, sets ~0.32; moon is opposite (+0.5)
    const rise = 0.74;
    const set = 0.32;
    const local = isMoon ? (phase + 0.5) % 1 : phase;
    const daySpan = (1 - rise) + set;

    let arcT;
    if (local >= rise) arcT = (local - rise) / daySpan;
    else if (local <= set) arcT = ((1 - rise) + local) / daySpan;
    else return null;

    // π (left/east) → π/2 (zenith) → 0 (right/west)
    const angle = Math.PI - arcT * Math.PI;
    const cx = width * 0.5;
    const cy = skyHeight * 0.92;
    const rx = width * 0.46;
    const ry = skyHeight * 0.78;
    const elev = Math.max(0, Math.sin(angle));
    return {
      x: cx + Math.cos(angle) * rx,
      y: cy - elev * ry,
      elev
    };
  };

  const drawModernSky = (ctx, width, height, offset, cycle, sceneScale = 1) => {
    const skyHeight = height * 0.72;
    const { night, golden } = cycle;

    // Bright day blues → soft evening → deep night (all via continuous lerp)
    const dayTop = '#2a6cb0';
    const dayMid = '#4a92c8';
    const daySoft = '#6eb0d8';
    const dayWarm = '#9ecae4';
    const dayHorizon = '#c5dcec';

    const nightTop = '#060a16';
    const nightMid = '#0e1830';
    const nightSoft = '#162240';
    const nightWarm = '#1c1a32';
    const nightHorizon = '#12101e';

    const goldTop = '#3a4578';
    const goldMid = '#7a5a80';
    const goldSoft = '#c87858';
    const goldWarm = '#e89858';
    const goldHorizon = '#f0b878';

    // Prefer golden over night during early dusk so evening reads clearly before full dark
    const eve = Math.max(golden, night * 0.35);
    const mix = (day, gold, dark) =>
      lerpHex(lerpHex(day, gold, eve), dark, night);

    const grad = ctx.createLinearGradient(0, 0, 0, skyHeight);
    grad.addColorStop(0, mix(dayTop, goldTop, nightTop));
    grad.addColorStop(0.28, mix(dayMid, goldMid, nightMid));
    grad.addColorStop(0.55, mix(daySoft, goldSoft, nightSoft));
    grad.addColorStop(0.8, mix(dayWarm, goldWarm, nightWarm));
    grad.addColorStop(1, mix(dayHorizon, goldHorizon, nightHorizon));

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Soft radial sun bloom in upper sky (day) — depth, not flat fill
    if (night < 0.6) {
      const bloomX = width * (0.62 + golden * 0.1);
      const bloomY = skyHeight * (0.18 - golden * 0.05);
      const bloom = ctx.createRadialGradient(bloomX, bloomY, 10, bloomX, bloomY, width * 0.55);
      const ba = (1 - night) * (0.22 + golden * 0.12);
      bloom.addColorStop(0, golden > 0.25
        ? `rgba(255, 200, 140, ${ba * 0.55})`
        : `rgba(180, 220, 255, ${ba * 0.45})`);
      bloom.addColorStop(0.45, golden > 0.25
        ? `rgba(255, 170, 100, ${ba * 0.12})`
        : `rgba(120, 180, 230, ${ba * 0.1})`);
      bloom.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, width, skyHeight);
    }

    // Stars — sharp sparkles (cross rays), not filled circles
    if (night > 0.08) {
      const tw = performance.now() * 0.001;
      const starScale = Math.max(0.55, Math.min(1, sceneScale));
      starsRef.current.forEach((s) => {
        const base = night * (0.3 + s.bright * 0.55);
        let pulse = 1;
        if (s.blinks) {
          const wave = 0.5 + 0.5 * Math.sin(tw * s.speed + s.twinkle);
          pulse = s.blinkStrong
            ? 0.08 + 0.92 * wave // clear on/off twinkle
            : 0.28 + 0.72 * wave;
        }
        const alpha = base * pulse;
        if (alpha < 0.05) return;
        const px = s.x * width;
        const py = s.y * skyHeight;
        const arm = s.size * starScale * (0.9 + (s.blinks ? 0.35 * pulse : 0));
        const a = Math.min(0.98, alpha);

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(s.rot || 0);
        ctx.strokeStyle = `rgba(235, 242, 255, ${a})`;
        ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
        ctx.lineCap = 'round';

        // Main cross
        ctx.lineWidth = Math.max(0.6, arm * 0.28);
        ctx.beginPath();
        ctx.moveTo(0, -arm);
        ctx.lineTo(0, arm);
        ctx.moveTo(-arm, 0);
        ctx.lineTo(arm, 0);
        ctx.stroke();

        // Diagonal rays on larger / glowing stars
        if (s.glow || s.size > 1.0) {
          const d = arm * 0.55;
          ctx.lineWidth = Math.max(0.45, arm * 0.18);
          ctx.globalAlpha = a * 0.7;
          ctx.beginPath();
          ctx.moveTo(-d, -d);
          ctx.lineTo(d, d);
          ctx.moveTo(d, -d);
          ctx.lineTo(-d, d);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // Tiny bright core (sub-pixel diamond, not a disc)
        const c = Math.max(0.35, arm * 0.22);
        ctx.beginPath();
        ctx.moveTo(0, -c);
        ctx.lineTo(c * 0.55, 0);
        ctx.lineTo(0, c);
        ctx.lineTo(-c * 0.55, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
    }

    // Sun (visible during day / golden hour)
    const sun = celestialPos(cycle.phase, width, skyHeight, false);
    if (sun && night < 0.92) {
      const sunAlpha = Math.max(0, 1 - night * 1.15) * (0.55 + sun.elev * 0.45);
      const warm = golden > 0.2;
      const glowR = (warm ? 100 : 70) + sun.elev * (warm ? 90 : 55);
      const sunGlow = ctx.createRadialGradient(sun.x, sun.y, 3, sun.x, sun.y, glowR);
      sunGlow.addColorStop(0, warm
        ? `rgba(255, 205, 120, ${0.88 * sunAlpha})`
        : `rgba(255, 248, 220, ${0.7 * sunAlpha})`);
      sunGlow.addColorStop(0.4, warm
        ? `rgba(255, 150, 80, ${0.28 * sunAlpha})`
        : `rgba(180, 220, 255, ${0.18 * sunAlpha})`);
      sunGlow.addColorStop(1, 'rgba(255, 200, 120, 0)');
      ctx.fillStyle = sunGlow;
      ctx.fillRect(0, 0, width, skyHeight);

      const sunR = (warm ? 13 : 11) + sun.elev * 5;
      ctx.beginPath();
      ctx.arc(sun.x, sun.y, sunR, 0, Math.PI * 2);
      ctx.fillStyle = warm
        ? `rgba(255, 200, 100, ${0.95 * sunAlpha})`
        : `rgba(255, 252, 235, ${0.92 * sunAlpha})`;
      ctx.fill();
    }

    // Moon — soft crescent with sky-matched cutout
    const moon = celestialPos(cycle.phase, width, skyHeight, true);
    if (moon && night > 0.12) {
      const moonAlpha = Math.min(1, night * 1.15) * (0.55 + moon.elev * 0.45);
      const glowR = (55 + moon.elev * 40) * Math.max(0.7, sceneScale);
      const moonGlow = ctx.createRadialGradient(moon.x, moon.y, 2, moon.x, moon.y, glowR);
      moonGlow.addColorStop(0, `rgba(200, 220, 255, ${0.4 * moonAlpha})`);
      moonGlow.addColorStop(0.45, `rgba(140, 170, 230, ${0.12 * moonAlpha})`);
      moonGlow.addColorStop(1, 'rgba(100, 130, 200, 0)');
      ctx.fillStyle = moonGlow;
      ctx.fillRect(0, 0, width, skyHeight);

      const r = (10 + moon.elev * 5) * Math.max(0.75, sceneScale);
      ctx.beginPath();
      ctx.arc(moon.x, moon.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(232, 238, 255, ${0.95 * moonAlpha})`;
      ctx.fill();

      // Crescent cutout uses current night sky tone (no hard black disk)
      const cut = mix(dayMid, goldMid, nightMid);
      const cr = parseInt(cut.slice(1, 3), 16);
      const cg = parseInt(cut.slice(3, 5), 16);
      const cb = parseInt(cut.slice(5, 7), 16);
      ctx.beginPath();
      ctx.arc(moon.x + r * 0.38, moon.y - r * 0.12, r * 0.86, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${0.92 * moonAlpha})`;
      ctx.fill();
    }

    // Clouds — almost gone at deep night; thin slate wisps only
    if (night < 0.92) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - night * 0.92);
      drawFluffyClouds(ctx, width, height, offset, sceneScale, cycle);
      ctx.restore();
    }
  };

  // Distinct puff layouts so clouds don't look cloned
  const CLOUD_SHAPES = [
    // long flat streusel
    {
      blobs: [[0, 2, 11], [10, -2, 13], [22, 1, 12], [34, -3, 10], [46, 1, 9], [14, 6, 8], [30, 6, 8]],
      hi: [[10, -4, 6], [24, -3, 5], [38, -5, 5]]
    },
    // tall puffy cumulus
    {
      blobs: [[4, 4, 10], [14, -6, 14], [26, -2, 12], [36, 3, 10], [18, 5, 9], [8, 0, 8], [30, -8, 9]],
      hi: [[14, -10, 7], [26, -6, 6]]
    },
    // short chubby
    {
      blobs: [[0, 1, 12], [12, -3, 14], [24, 0, 11], [10, 5, 9], [20, 5, 8]],
      hi: [[8, -4, 6], [18, -5, 7]]
    },
    // wispy / stretched
    {
      blobs: [[0, 0, 8], [9, -2, 10], [20, -1, 9], [32, -3, 11], [44, 0, 8], [55, -1, 7], [16, 3, 6], [38, 3, 6]],
      hi: [[12, -4, 5], [34, -5, 5], [48, -3, 4]]
    },
    // two-hump
    {
      blobs: [[0, 2, 11], [10, -1, 12], [20, 3, 9], [32, -4, 13], [44, 0, 11], [14, 6, 7], [38, 5, 8]],
      hi: [[8, -3, 5], [34, -7, 7]]
    },
    // dense cluster
    {
      blobs: [[2, 0, 10], [12, -5, 12], [22, -2, 13], [32, -6, 11], [40, 1, 10], [8, 5, 8], [18, 4, 9], [28, 5, 8]],
      hi: [[12, -8, 6], [24, -5, 7], [34, -8, 5]]
    }
  ];

  const drawFluffyCloud = (ctx, x, y, scale = 1, cycle = { night: 0, golden: 0 }, shapeIdx = 0, stretchX = 1) => {
    const { night = 0, golden = 0 } = cycle;
    const shape = CLOUD_SHAPES[shapeIdx % CLOUD_SHAPES.length];
    const blobs = shape.blobs;
    const highlights = shape.hi;

    const top = night > 0.45
      ? [55, 65, 90]
      : golden > 0.2
        ? [255, 236, 214]
        : [248, 252, 255];
    const bottom = night > 0.45
      ? [35, 42, 62]
      : golden > 0.2
        ? [255, 200, 160]
        : [180, 205, 230];

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(stretchX, 1);
    ctx.globalAlpha = night > 0.45
      ? 0.22 + night * 0.08
      : (0.42 + (1 - night) * 0.28) * (0.85 + golden * 0.1);

    // Soft underside (volume)
    ctx.fillStyle = `rgba(${bottom[0]}, ${bottom[1]}, ${bottom[2]}, 0.35)`;
    ctx.beginPath();
    blobs.forEach(([dx, dy, r]) => {
      const rr = r * scale * 0.95;
      ctx.moveTo(dx * scale + rr, (dy + 4) * scale);
      ctx.arc(dx * scale, (dy + 4) * scale, rr, 0, Math.PI * 2);
    });
    ctx.fill();

    // Main body
    ctx.fillStyle = `rgba(${top[0]}, ${top[1]}, ${top[2]}, 0.78)`;
    ctx.beginPath();
    blobs.forEach(([dx, dy, r]) => {
      const rr = r * scale;
      ctx.moveTo(dx * scale + rr, dy * scale);
      ctx.arc(dx * scale, dy * scale, rr, 0, Math.PI * 2);
    });
    ctx.fill();

    // Bright rim highlight — skip when night clouds are slate
    if (night < 0.5) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.22 * (1 - night * 0.5)})`;
      ctx.beginPath();
      highlights.forEach(([dx, dy, r]) => {
        const rr = r * scale;
        ctx.moveTo(dx * scale + rr, dy * scale);
        ctx.arc(dx * scale, dy * scale, rr, 0, Math.PI * 2);
      });
      ctx.fill();
    }
    ctx.restore();
  };

  const drawFluffyClouds = (ctx, width, height, offset, sceneScale = 1, cycle = { night: 0, golden: 0 }) => {
    // Keep clouds modest on mobile; fuller on desktop
    const cloudScale = Math.max(0.32, Math.min(1.05, Math.min(width / 680, height / 360)));
    const s = cloudScale * Math.max(0.75, sceneScale);
    const period = Math.max(820, Math.round(1280 * Math.max(0.6, s)));
    const shift = offset % period;
    const skyY = (t) => height * t;

    const clouds = [
      { x: 0.06 * period, y: skyY(0.10), s: 0.88, shape: 0, sx: 1.15 },
      { x: 0.22 * period, y: skyY(0.17), s: 0.58, shape: 2, sx: 0.9 },
      { x: 0.38 * period, y: skyY(0.08), s: 0.95, shape: 1, sx: 1.0 },
      { x: 0.55 * period, y: skyY(0.14), s: 0.72, shape: 3, sx: 1.25 },
      { x: 0.70 * period, y: skyY(0.11), s: 0.8, shape: 4, sx: 1.05 },
      { x: 0.86 * period, y: skyY(0.16), s: 0.55, shape: 5, sx: 0.85 },
      { x: 0.96 * period, y: skyY(0.09), s: 0.68, shape: 2, sx: 1.1 }
    ];

    const margin = 120 * s;
    [-period, 0, period].forEach((bx) => {
      clouds.forEach((c) => {
        const dx = c.x + bx - shift;
        if (dx > -margin && dx < width + margin) {
          drawFluffyCloud(ctx, dx, c.y, c.s * s, cycle, c.shape, c.sx);
        }
      });
    });
  };

  // --- FAR SILHOUETTES ---
  const drawFarSilhouettes = (ctx, width, baseY, dayCycle, offset, sceneScale = 1) => {
    const cycle = 1000;
    const shift = offset % cycle;
    const hScale = 0.75 * sceneScale;
    const { night, golden } = dayCycle;

    // Soft layered haze — day blue → evening rose → deep night indigo
    const dayCol = [110, 145, 175];
    const goldCol = [165, 115, 105];
    const nightCol = [28, 32, 52];
    const c = dayCol.map((d, i) =>
      Math.round(lerp(lerp(d, goldCol[i], golden), nightCol[i], night))
    );
    const alpha = lerp(0.28, 0.55, night) + golden * 0.06;
    const peaks = [
      [60, 48], [140, 78], [230, 42], [340, 90],
      [450, 55], [560, 85], [680, 40], [800, 72], [920, 50]
    ];

    const drawLayer = (yOff, hMul, aMul) => {
      ctx.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha * aMul})`;
      [-cycle, 0, cycle].forEach((bx) => {
        const start = bx - shift * (0.7 + aMul * 0.3);
        ctx.beginPath();
        ctx.moveTo(start - 40, baseY + yOff);
        peaks.forEach(([px, ph]) => {
          ctx.lineTo(start + px, baseY + yOff - ph * hScale * hMul);
        });
        ctx.lineTo(start + cycle + 40, baseY + yOff);
        ctx.closePath();
        ctx.fill();
      });
    };

    ctx.save();
    drawLayer(-6 * sceneScale, 1.15, 0.55);
    drawLayer(0, 1, 1);

    // Sparse far-city window pinpricks at night
    if (night > 0.35) {
      const la = Math.min(1, (night - 0.35) / 0.4) * 0.55;
      ctx.fillStyle = `rgba(255, 210, 140, ${la})`;
      const lights = [
        [95, 38], [155, 58], [280, 34], [360, 70],
        [480, 42], [590, 62], [720, 30], [840, 55]
      ];
      [-cycle, 0, cycle].forEach((bx) => {
        const start = bx - shift;
        lights.forEach(([px, ph], i) => {
          if (i % 3 === 1) return;
          const lx = start + px;
          const ly = baseY - ph * hScale * 0.85;
          if (lx > -4 && lx < width + 4) {
            ctx.fillRect(lx, ly, 1.5 * sceneScale, 1.5 * sceneScale);
          }
        });
      });
    }
    ctx.restore();
  };

  const drawPalm = (ctx, x, baseY, scale = 1, dayCycle = { night: 0, golden: 0 }) => {
    const { night = 0, golden = 0 } = dayCycle;
    const trunk = lerpHex(
      lerpHex('#9a7048', '#7a5538', golden),
      '#0c1210',
      night
    );
    const leafA = lerpHex(
      lerpHex('#3caa62', '#6a9a48', golden),
      '#0a1210',
      night
    );
    const leafB = lerpHex(
      lerpHex('#2f8a50', '#508038', golden),
      '#080e0c',
      night
    );
    ctx.save();
    ctx.globalAlpha = 0.9 - night * 0.35;
    ctx.strokeStyle = trunk;
    ctx.lineWidth = Math.max(2, 4.2 * scale);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.quadraticCurveTo(x - 8 * scale, baseY - 42 * scale, x - 5 * scale, baseY - 86 * scale);
    ctx.stroke();

    const crownX = x - 5 * scale;
    const crownY = baseY - 86 * scale;
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8 - Math.PI / 2;
      ctx.fillStyle = i % 2 === 0 ? leafA : leafB;
      ctx.beginPath();
      ctx.ellipse(
        crownX + Math.cos(a) * 14 * scale,
        crownY + Math.sin(a) * 9 * scale,
        14 * scale,
        4.5 * scale,
        a,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.restore();
  };

  // --- CITY SKYLINE — attractive day facades that melt into night ---
  const drawCityTown = (ctx, width, baseY, dayCycle, offset, sceneScale = 1) => {
    const s = Math.max(0.5, sceneScale * 0.85);
    const { night, golden, dayLite = Math.max(0, 1 - night) } = dayCycle;
    // Warm street palette by day → slate by night (all colors lerp smoothly)
    const buildings = [
      { dayColor: '#e8c9a8', eveColor: '#c48868', nightColor: '#161c28', roofDay: '#8a6548', roofNight: '#0e141c', accent: '#d4564a', w: 72, h: 70, palm: true, palmScale: 0.9, style: 'shop' },
      { dayColor: '#7eb0c4', eveColor: '#5a7a98', nightColor: '#121820', roofDay: '#4a6a78', roofNight: '#0c1218', accent: '#f0c56a', w: 66, h: 82, palm: false, style: 'tall' },
      { dayColor: '#f2e2c4', eveColor: '#d4a878', nightColor: '#181e28', roofDay: '#9a7858', roofNight: '#10161e', accent: '#5a9e7a', w: 74, h: 64, palm: true, palmScale: 1.0, style: 'villa' },
      { dayColor: '#8eb8c8', eveColor: '#688898', nightColor: '#141a24', roofDay: '#4a6878', roofNight: '#0e141c', accent: '#e87860', w: 68, h: 76, palm: false, style: 'tall' },
      { dayColor: '#e2b898', eveColor: '#b87858', nightColor: '#161c26', roofDay: '#7a5840', roofNight: '#0e141c', accent: '#f0b050', w: 76, h: 68, palm: true, palmScale: 0.85, style: 'shop' },
      { dayColor: '#c8d4c8', eveColor: '#889888', nightColor: '#141a22', roofDay: '#5a7060', roofNight: '#0c1218', accent: '#68a090', w: 70, h: 60, palm: false, style: 'villa' },
      { dayColor: '#dca888', eveColor: '#b06850', nightColor: '#181e2a', roofDay: '#7a5040', roofNight: '#10161e', accent: '#e8c060', w: 72, h: 74, palm: true, palmScale: 0.95, style: 'shop' }
    ];

    const gap = Math.max(10, 14 * s);
    const cycleWidth = buildings.reduce((a, b) => a + b.w * s + gap, 0);
    const shift = offset % cycleWidth;

    const groundGrad = ctx.createLinearGradient(0, baseY - 16 * s, 0, baseY);
    const gAlpha = lerp(0.32, 0.1, night);
    groundGrad.addColorStop(0, 'rgba(200, 180, 140, 0)');
    groundGrad.addColorStop(1, `rgba(${Math.round(lerp(190, 40, night))}, ${Math.round(lerp(160, 50, night))}, ${Math.round(lerp(120, 70, night))}, ${gAlpha})`);
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, baseY - 18 * s, width, 18 * s);

    [-cycleWidth, 0, cycleWidth, cycleWidth * 2].forEach((blockX) => {
      let cx = blockX - shift;
      buildings.forEach((b, bi) => {
        const bw = b.w * s;
        const bh = b.h * s;
        if (cx > -120 && cx < width + 120) {
          if (b.palm) {
            drawPalm(ctx, cx - 6 * s, baseY, (b.palmScale || 1) * s, dayCycle);
          }

          // day → evening → night facade blend
          const dayEve = lerpHex(b.dayColor, b.eveColor, golden);
          const facadeColor = lerpHex(dayEve, b.nightColor, night);
          const roofColor = lerpHex(
            lerpHex(b.roofDay, shadeHex(b.roofDay, -10), golden),
            b.roofNight,
            night
          );

          const facade = ctx.createLinearGradient(cx, baseY - bh, cx + bw, baseY);
          facade.addColorStop(0, shadeHex(facadeColor, Math.round(14 * dayLite)));
          facade.addColorStop(0.4, facadeColor);
          facade.addColorStop(1, shadeHex(facadeColor, -16));
          ctx.fillStyle = facade;
          ctx.fillRect(cx, baseY - bh, bw, bh);

          // Roof overhang
          ctx.fillStyle = roofColor;
          ctx.fillRect(cx - 3 * s, baseY - bh - 5 * s, bw + 6 * s, 5 * s);
          if (dayLite > 0.2) {
            ctx.fillStyle = `rgba(255,240,220,${0.2 * dayLite})`;
            ctx.fillRect(cx - 3 * s, baseY - bh - 5 * s, bw + 6 * s, 1.5 * s);
          }

          // Accent stripe / awning (shops) — day/evening only
          if (b.style === 'shop' && dayLite > 0.12) {
            const awningY = baseY - bh * 0.42;
            ctx.fillStyle = lerpHex(b.accent, shadeHex(b.accent, -30), night);
            ctx.globalAlpha = 0.35 + dayLite * 0.55;
            ctx.fillRect(cx - 2 * s, awningY, bw + 4 * s, 5 * s);
            ctx.fillStyle = `rgba(255,255,255,${0.2 * dayLite})`;
            for (let i = 0; i < 5; i++) {
              ctx.fillRect(cx + i * (bw / 5), awningY, bw / 10, 5 * s);
            }
            ctx.globalAlpha = 1;
          }

          // Door — warm porch spill at night for shops
          const doorW = 12 * s;
          const doorH = 18 * s;
          const doorX = cx + bw * 0.5 - doorW / 2;
          ctx.fillStyle = lerpHex('#5a3a28', '#0a0e14', night);
          ctx.fillRect(doorX, baseY - doorH, doorW, doorH);
          if (dayLite > 0.3) {
            ctx.fillStyle = `rgba(255,220,160,${0.25 * dayLite})`;
            ctx.fillRect(doorX + 2 * s, baseY - doorH + 3 * s, 3 * s, 4 * s);
          } else if (night > 0.4 && b.style === 'shop') {
            const porch = Math.min(1, (night - 0.4) / 0.35);
            ctx.fillStyle = `rgba(255, 195, 120, ${0.4 * porch})`;
            ctx.fillRect(doorX + 2 * s, baseY - doorH + 4 * s, doorW - 4 * s, 5 * s);
          }

          // Windows with frames
          const winW = 11 * s;
          const winH = 13 * s;
          const cols = [9 * s, bw - 22 * s];
          const rows = b.style === 'tall'
            ? [10 * s, 28 * s, 46 * s, 64 * s]
            : [10 * s, 28 * s, 46 * s];
          rows.forEach((ry, ri) => {
            if (ry + winH < bh - doorH - 4 * s) {
              cols.forEach((rx, ci) => {
                // Stable per-building pattern (no scroll flicker / blink)
                const seed = (bi * 11 + ri * 3 + ci * 7) % 5;
                const lit = night > 0.28 && seed !== 1 && seed !== 4;
                // Frame
                if (dayLite > 0.15) {
                  ctx.fillStyle = `rgba(255,245,230,${0.35 * dayLite})`;
                  ctx.fillRect(cx + rx - 1.5 * s, baseY - bh + ry - 1.5 * s, winW + 3 * s, winH + 3 * s);
                }
                if (lit) {
                  const glow = Math.min(1, (night - 0.28) / 0.4);
                  const wx = cx + rx;
                  const wy = baseY - bh + ry;
                  ctx.fillStyle = `rgba(255, ${Math.round(lerp(205, 185, glow))}, ${Math.round(lerp(145, 105, glow))}, ${0.6 + glow * 0.3})`;
                  ctx.fillRect(wx, wy, winW, winH);
                  ctx.fillStyle = `rgba(255, 240, 200, ${0.22 * glow})`;
                  ctx.fillRect(wx + 1.5 * s, wy + 1.5 * s, winW - 3 * s, winH * 0.3);
                } else {
                  // Day glass → dark night glass
                  const skyR = Math.round(lerp(150, 18, night));
                  const skyG = Math.round(lerp(200, 24, night));
                  const skyB = Math.round(lerp(230, 36, night));
                  ctx.fillStyle = `rgba(${skyR}, ${skyG}, ${skyB}, ${0.55 + dayLite * 0.25 - night * 0.15})`;
                  ctx.fillRect(cx + rx, baseY - bh + ry, winW, winH);
                  if (dayLite > 0.25) {
                    ctx.fillStyle = `rgba(255,255,255,${0.35 * dayLite})`;
                    ctx.fillRect(cx + rx, baseY - bh + ry, winW, 2.5 * s);
                    ctx.fillRect(cx + rx, baseY - bh + ry, 2 * s, winH);
                  }
                }
              });
            }
          });

          // Balcony rail on villas
          if (b.style === 'villa' && dayLite > 0.1) {
            const by = baseY - bh * 0.55;
            ctx.strokeStyle = `rgba(255,240,220,${0.35 * dayLite + golden * 0.15})`;
            ctx.lineWidth = Math.max(1, 1.5 * s);
            ctx.beginPath();
            ctx.moveTo(cx + 4 * s, by);
            ctx.lineTo(cx + bw - 4 * s, by);
            ctx.stroke();
            for (let i = 0; i < 4; i++) {
              const bx = cx + 8 * s + i * ((bw - 16 * s) / 3);
              ctx.beginPath();
              ctx.moveTo(bx, by);
              ctx.lineTo(bx, by + 8 * s);
              ctx.stroke();
            }
          }

          // Sun / evening rim — gone at night
          if (dayLite > 0.08 || golden > 0.12) {
            ctx.fillStyle = golden > 0.15
              ? `rgba(255, 180, 100, ${(1 - night) * 0.12 + golden * 0.14})`
              : `rgba(200, 230, 255, ${dayLite * 0.14})`;
            ctx.fillRect(cx, baseY - bh, 2.5 * s, bh);
          }
        }
        cx += bw + gap;
      });
    });
  };

  const drawStreetlights = (ctx, width, roadTop, curbH, roadHeight, dayCycle, offset, sceneScale = 1) => {
    const { night = 0, dayLite = Math.max(0, 1 - night) } = dayCycle;
    const s = Math.max(0.55, sceneScale * 0.9);
    const spacing = Math.max(210, 280 * s);
    const shift = offset % spacing;
    const lit = Math.min(1, Math.max(0, (night - 0.2) / 0.45));
    const groundY = roadTop + curbH * 0.4;
    const poleH = 68 * s;
    const arm = 34 * s;
    const metal = lerpHex('#7a828c', '#1c222c', Math.max(night, 0.5));

    ctx.save();
    for (let x = -spacing - shift; x < width + spacing; x += spacing) {
      const px = x + spacing * 0.4;
      const top = groundY - poleH;
      const lampX = px + arm;
      const lampY = top + 10 * s;

      // Soft fan of light — wide, fades out, no round pool
      if (lit > 0.05) {
        const reach = roadHeight * 0.55;
        const fan = ctx.createLinearGradient(lampX, lampY, lampX, groundY + reach);
        fan.addColorStop(0, `rgba(255, 220, 160, ${0.18 * lit})`);
        fan.addColorStop(0.35, `rgba(255, 195, 120, ${0.1 * lit})`);
        fan.addColorStop(1, 'rgba(255, 170, 90, 0)');
        ctx.fillStyle = fan;
        ctx.beginPath();
        ctx.moveTo(lampX - 4 * s, lampY + 2 * s);
        ctx.lineTo(lampX + 4 * s, lampY + 2 * s);
        ctx.lineTo(lampX + 95 * s, groundY + reach);
        ctx.lineTo(lampX - 55 * s, groundY + reach);
        ctx.closePath();
        ctx.fill();

        // Gentle horizontal fade on asphalt (rectangle gradient, not a disc)
        const wash = ctx.createLinearGradient(lampX - 90 * s, 0, lampX + 110 * s, 0);
        wash.addColorStop(0, 'rgba(255, 190, 110, 0)');
        wash.addColorStop(0.35, `rgba(255, 200, 130, ${0.08 * lit})`);
        wash.addColorStop(0.55, `rgba(255, 210, 140, ${0.11 * lit})`);
        wash.addColorStop(0.75, `rgba(255, 195, 120, ${0.07 * lit})`);
        wash.addColorStop(1, 'rgba(255, 180, 100, 0)');
        ctx.fillStyle = wash;
        ctx.fillRect(lampX - 90 * s, groundY, 200 * s, reach * 0.85);
      }

      // Simple clean post
      ctx.fillStyle = metal;
      ctx.fillRect(px - 4 * s, groundY - 3 * s, 8 * s, 4 * s);
      ctx.fillRect(px - 2 * s, top + 6 * s, 4 * s, groundY - top - 8 * s);

      ctx.strokeStyle = metal;
      ctx.lineWidth = Math.max(2.5, 3.5 * s);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px, top + 8 * s);
      ctx.quadraticCurveTo(px + arm * 0.4, top - 2 * s, lampX, lampY);
      ctx.stroke();

      // Compact lamp head
      ctx.fillStyle = metal;
      ctx.beginPath();
      ctx.moveTo(lampX - 7 * s, lampY);
      ctx.lineTo(lampX + 7 * s, lampY);
      ctx.lineTo(lampX + 5 * s, lampY + 5 * s);
      ctx.lineTo(lampX - 5 * s, lampY + 5 * s);
      ctx.closePath();
      ctx.fill();

      if (lit > 0.05) {
        ctx.fillStyle = `rgba(255, 235, 190, ${0.85 * lit})`;
        ctx.beginPath();
        ctx.ellipse(lampX, lampY + 5.5 * s, 4.5 * s, 2.8 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        const tip = ctx.createRadialGradient(lampX, lampY + 5 * s, 0.5, lampX, lampY + 5 * s, 12 * s);
        tip.addColorStop(0, `rgba(255, 230, 170, ${0.4 * lit})`);
        tip.addColorStop(1, 'rgba(255, 200, 120, 0)');
        ctx.fillStyle = tip;
        ctx.beginPath();
        ctx.arc(lampX, lampY + 5 * s, 12 * s, 0, Math.PI * 2);
        ctx.fill();
      } else if (dayLite > 0.4) {
        ctx.fillStyle = `rgba(200, 210, 220, ${0.35 * dayLite})`;
        ctx.beginPath();
        ctx.ellipse(lampX, lampY + 5.5 * s, 4 * s, 2.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  };

  const shadeHex = (hex, amount) => {
    const n = hex.replace('#', '');
    const num = parseInt(n, 16);
    let r = Math.min(255, Math.max(0, (num >> 16) + amount));
    let g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
    let b = Math.min(255, Math.max(0, (num & 0xff) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  };

  const glassBtn =
    'w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/55 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center backdrop-blur-md shadow-lg transition-all cursor-pointer';

  return (
    <div className="relative w-full h-full min-h-[160px] rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_12px_36px_rgba(0,0,0,0.5)] select-none border border-white/10 bg-[#0a1520]">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* TOP-RIGHT: Sound / Fullscreen / Menu */}
      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex items-center gap-1.5 sm:gap-2 z-20">
        <button
          onClick={onToggleSound}
          title={soundEnabled ? 'Mute' : 'Unmute'}
          className={glassBtn}
        >
          {soundEnabled ? (
            <IconVolumeUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          ) : (
            <IconVolumeMute className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
          )}
        </button>

        <button
          onClick={onOpenMenu}
          title="Menu"
          className={glassBtn}
        >
          <IconMenu className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
        </button>
      </div>

      {/* Dark wash + sunburst — same look for waiting loader and crash HUD */}
      {(state === 'WAITING' || state === 'CRASHED') && (
        <div className="absolute inset-0 z-[9] pointer-events-none wait-stage-wash" aria-hidden>
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(18,20,24,0.72) 0%, rgba(8,10,14,0.88) 70%, rgba(5,8,12,0.94) 100%)'
            }}
          />
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(100%,520px)] h-[min(100%,520px)] opacity-50"
            style={{
              background:
                'repeating-conic-gradient(from 0deg, rgba(255,255,255,0.09) 0deg 7deg, transparent 7deg 14deg)',
              maskImage: 'radial-gradient(circle, black 12%, transparent 62%)',
              WebkitMaskImage: 'radial-gradient(circle, black 12%, transparent 62%)'
            }}
          />
        </div>
      )}

      {/* CENTER HUD */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-10 pb-2 sm:pb-4">
        {state === 'WAITING' && (
          <div className="relative flex flex-col items-center justify-center animate-fade-in px-5">
            <div className="relative mb-4 sm:mb-5 wait-propeller">
              <IconPropeller className="w-14 h-14 sm:w-16 sm:h-16 text-[#ff2d55]" />
            </div>

            <p
              className="relative text-white text-[13px] sm:text-[15px] font-extrabold uppercase tracking-[0.26em] sm:tracking-[0.32em] text-center leading-snug"
              style={{
                textShadow:
                  '0 1px 0 rgba(0,0,0,0.9), 0 2px 12px rgba(0,0,0,0.95), 0 0 24px rgba(0,0,0,0.7)'
              }}
            >
              Waiting for next round
            </p>

            <div className="relative mt-4 w-[200px] sm:w-[240px] h-[6px] rounded-full bg-[#3a3f48] border border-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#ff2d55] transition-[width] duration-200 ease-linear"
                style={{
                  width: `${Math.max(3, Math.min(100, (1 - (countdownProgress ?? 1)) * 100))}%`,
                  boxShadow: '0 0 12px rgba(255,45,85,0.9)'
                }}
              />
            </div>
          </div>
        )}

        {state === 'FLYING' && (
          <div className="text-center animate-fade-in relative">
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-24 blur-3xl opacity-70"
              style={{
                background:
                  multiplier >= 10
                    ? 'radial-gradient(circle, rgba(34,197,94,0.55), transparent 70%)'
                    : multiplier >= 2
                      ? 'radial-gradient(circle, rgba(56,189,248,0.45), transparent 70%)'
                      : 'radial-gradient(circle, rgba(251,191,36,0.4), transparent 70%)'
              }}
            />
            <span
              className="relative font-black tracking-tight text-5xl sm:text-7xl"
              style={{
                fontFamily: "'Chakra Petch', sans-serif",
                color: multiplier >= 10 ? '#4ade80' : multiplier >= 2 ? '#67e8f9' : '#fff',
                textShadow:
                  multiplier >= 10
                    ? '0 0 28px rgba(74,222,128,0.85), 0 6px 18px rgba(0,0,0,0.9)'
                    : multiplier >= 2
                      ? '0 0 28px rgba(103,232,249,0.75), 0 6px 18px rgba(0,0,0,0.9)'
                      : '0 0 24px rgba(251,191,36,0.55), 0 6px 18px rgba(0,0,0,0.9)'
              }}
            >
              {multiplier.toFixed(2)}x
            </span>
          </div>
        )}

        {state === 'CRASHED' && (
          <div className="text-center flex flex-col items-center relative crash-impact">
            <div className="pointer-events-none absolute inset-[-40%] crash-screen-flash rounded-full" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-32 bg-red-600/35 blur-3xl" />

            <div className="relative mb-1.5 px-3 py-0.5 rounded-full border border-red-400/40 bg-black/50 backdrop-blur-sm">
              <span
                className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.28em] text-[#ff6b6b]"
                style={{ textShadow: '0 0 12px rgba(239,68,68,0.8)' }}
              >
                WIPED OUT
              </span>
            </div>

            <span
              className="relative font-black text-[#ff3b3b] text-5xl sm:text-7xl leading-none crash-mult-pop"
              style={{
                fontFamily: "'Chakra Petch', sans-serif",
                textShadow:
                  '0 0 30px rgba(239,68,68,0.95), 0 0 60px rgba(255,80,40,0.45), 0 8px 18px rgba(0,0,0,0.95)'
              }}
            >
              {multiplier.toFixed(2)}x
            </span>

            <span
              className="relative mt-2 text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-white/80"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
            >
              Round crashed
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
