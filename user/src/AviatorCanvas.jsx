import React, { useEffect, useRef } from 'react';

export default function AviatorCanvas({ state, multiplier, countdownProgress, countdownSeconds }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const particlesRef = useRef([]);
  const propellerAngleRef = useRef(0);
  const planePosRef = useRef({ x: 50, y: 300, angle: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Handle high DPI display
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // Particle system for airplane smoke trail
    const updateParticles = (planeX, planeY, isFlying) => {
      if (isFlying && Math.random() > 0.2) {
        particlesRef.current.push({
          x: planeX - 18,
          y: planeY + 8 + (Math.random() * 4 - 2),
          vx: -(1.5 + Math.random() * 2),
          vy: Math.random() * 1.5 - 0.5,
          radius: 3 + Math.random() * 4,
          alpha: 0.6,
          color: Math.random() > 0.6 ? 'rgba(235, 59, 90,' : 'rgba(255, 121, 63,'
        });
      }

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.025;
        p.radius *= 0.98;
        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
        }
      }
    };

    let startTime = Date.now();

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      // Background grid & radial gradient
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, width);
      bgGrad.addColorStop(0, '#131722');
      bgGrad.addColorStop(1, '#090b10');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle cockpit radar grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
      ctx.lineWidth = 1;

      // Vertical grid lines
      const gridStepX = width / 10;
      for (let x = 0; x < width; x += gridStepX) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Horizontal grid lines
      const gridStepY = height / 6;
      for (let y = 0; y < height; y += gridStepY) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Trajectory calculation
      const originX = 40;
      const originY = height - 40;
      const maxW = width - 110;
      const maxH = height - 100;

      propellerAngleRef.current += 0.45;

      if (state === 'FLYING') {
        // Multiplier progression curve: smooth monotonic bezier
        const multNorm = Math.min(1, Math.log(multiplier) / Math.log(30));
        const progressX = originX + maxW * Math.min(1, multNorm * 0.95 + 0.05);
        const progressY = originY - maxH * Math.min(0.92, Math.pow(multNorm, 0.75) * 0.9 + 0.02);

        // Calculate smooth trajectory angle
        const angle = -Math.atan2(originY - progressY, progressX - originX) * 0.7;

        planePosRef.current = {
          x: progressX,
          y: progressY,
          angle: angle
        };

        // Draw curved flight trail
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        const cpX = originX + (progressX - originX) * 0.55;
        const cpY = originY - (originY - progressY) * 0.15;
        ctx.quadraticCurveTo(cpX, cpY, progressX, progressY);

        // Glowing red stroke
        ctx.strokeStyle = '#e5223c';
        ctx.lineWidth = 4;
        ctx.shadowColor = 'rgba(229, 34, 60, 0.7)';
        ctx.shadowBlur = 14;
        ctx.stroke();

        // Altitude Fill Gradient below curve
        ctx.lineTo(progressX, originY);
        ctx.lineTo(originX, originY);
        ctx.closePath();

        const fillGrad = ctx.createLinearGradient(0, progressY, 0, originY);
        fillGrad.addColorStop(0, 'rgba(229, 34, 60, 0.28)');
        fillGrad.addColorStop(0.7, 'rgba(229, 34, 60, 0.05)');
        fillGrad.addColorStop(1, 'rgba(229, 34, 60, 0.0)');
        ctx.fillStyle = fillGrad;
        ctx.shadowBlur = 0;
        ctx.fill();
        ctx.restore();

        // Update & draw smoke particles
        updateParticles(progressX, progressY, true);
        particlesRef.current.forEach(p => {
          ctx.save();
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `${p.color} ${p.alpha})`;
          ctx.fill();
          ctx.restore();
        });

        // Draw Animated Red Aviator Plane
        drawAirplane(ctx, progressX, progressY, angle, propellerAngleRef.current);
      } else if (state === 'CRASHED') {
        // Plane has flown away beyond screen
        // Draw residual particles decaying
        updateParticles(planePosRef.current.x, planePosRef.current.y, false);
        particlesRef.current.forEach(p => {
          ctx.save();
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `${p.color} ${p.alpha})`;
          ctx.fill();
          ctx.restore();
        });
      } else {
        // WAITING / COUNTDOWN
        // Stationary plane on the runway ready for takeoff
        const runwayX = originX + 25;
        const runwayY = originY - 10;
        drawAirplane(ctx, runwayX, runwayY, 0, propellerAngleRef.current * 0.3);
      }

      // X and Y Baseline Axes
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(width - 20, originY);
      ctx.moveTo(originX, originY);
      ctx.lineTo(originX, 30);
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [state, multiplier]);

  // Vector drawing of the iconic Aviator Red Propeller Plane
  const drawAirplane = (ctx, x, y, angle, propAngle) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Dynamic scale for plane
    const s = 1.15;
    ctx.scale(s, s);

    // Plane Fuselage (Aerodynamic Deep Crimson Body)
    ctx.beginPath();
    ctx.moveTo(25, 0); // nose
    ctx.quadraticCurveTo(15, -7, -15, -6); // upper spine
    ctx.lineTo(-24, -14); // rudder top
    ctx.lineTo(-28, -13);
    ctx.lineTo(-24, 0); // tail tip
    ctx.lineTo(-28, 4);
    ctx.lineTo(-24, 4);
    ctx.quadraticCurveTo(-15, 6, 15, 6); // belly
    ctx.closePath();

    const bodyGrad = ctx.createLinearGradient(0, -10, 0, 10);
    bodyGrad.addColorStop(0, '#ff4757');
    bodyGrad.addColorStop(0.4, '#e5223c');
    bodyGrad.addColorStop(1, '#b31228');
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // White racing / aviation stripes
    ctx.beginPath();
    ctx.moveTo(5, -6);
    ctx.lineTo(12, -6);
    ctx.lineTo(9, 6);
    ctx.lineTo(2, 6);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Aviator Cockpit Glass (Tinted blue-cyan visor)
    ctx.beginPath();
    ctx.moveTo(12, -5);
    ctx.quadraticCurveTo(5, -8, -1, -5);
    ctx.lineTo(3, -1);
    ctx.closePath();
    ctx.fillStyle = '#70a1ff';
    ctx.fill();

    // Main Wing (Swept forward monoplane wing)
    ctx.beginPath();
    ctx.moveTo(10, 2);
    ctx.lineTo(-4, 18);
    ctx.lineTo(-12, 17);
    ctx.lineTo(-4, 2);
    ctx.closePath();
    const wingGrad = ctx.createLinearGradient(0, 0, 0, 18);
    wingGrad.addColorStop(0, '#e5223c');
    wingGrad.addColorStop(1, '#980f21');
    ctx.fillStyle = wingGrad;
    ctx.fill();

    // Propeller Nose Cone & Spinning Blades
    ctx.beginPath();
    ctx.arc(26, 0, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#dfe4ea';
    ctx.fill();

    // Spinning propeller blur
    ctx.save();
    ctx.translate(28, 0);
    ctx.rotate(propAngle);
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.8, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fill();
    ctx.restore();

    ctx.restore();
  };

  return (
    <div className="relative w-full h-[280px] sm:h-[360px] md:h-[420px] rounded-2xl overflow-hidden bg-[#0a0d14] border border-white/10 shadow-2xl">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Center Dynamic HUD Multiplier Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-10">
        {state === 'FLYING' && (
          <div className="text-center animate-fade-in">
            <span
              className="font-bold tracking-tight text-white drop-shadow-[0_4px_25px_rgba(229,34,60,0.6)]"
              style={{
                fontFamily: "'Chakra Petch', sans-serif",
                fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
                lineHeight: 1
              }}
            >
              {multiplier.toFixed(2)}x
            </span>
          </div>
        )}

        {state === 'CRASHED' && (
          <div className="text-center flex flex-col items-center">
            <span
              className="text-red-500 font-bold uppercase tracking-wider text-xl sm:text-2xl drop-shadow-lg"
              style={{ fontFamily: "'Chakra Petch', sans-serif" }}
            >
              FLEW AWAY!
            </span>
            <span
              className="font-bold text-red-500 drop-shadow-[0_2px_15px_rgba(239,68,68,0.8)]"
              style={{
                fontFamily: "'Chakra Petch', sans-serif",
                fontSize: 'clamp(2.8rem, 7vw, 5.2rem)',
                lineHeight: 1.1
              }}
            >
              {multiplier.toFixed(2)}x
            </span>
          </div>
        )}

        {state === 'WAITING' && (
          <div className="flex flex-col items-center gap-3 bg-black/40 backdrop-blur-md px-6 py-4 rounded-xl border border-white/10">
            <div className="w-10 h-10 border-3 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
            <span
              className="text-xs sm:text-sm font-semibold tracking-widest uppercase text-gray-300"
              style={{ fontFamily: "'Chakra Petch', sans-serif" }}
            >
              WAITING FOR NEXT ROUND
            </span>
            {/* Progress loading bar */}
            <div className="w-48 sm:w-64 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-rose-400 transition-all duration-100 ease-linear"
                style={{ width: `${(countdownProgress || 1) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
