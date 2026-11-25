import React, { useEffect, useRef } from 'react';

export default function AviatorCanvas({ state, multiplier, countdownProgress }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const propellerAngleRef = useRef(0);
  const planePosRef = useRef({ x: 60, y: 300, angle: 0 });
  const flyAwayProgressRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Reset fly-away animation state on state changes
    if (state === 'FLYING') {
      flyAwayProgressRef.current = 0;
    }

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      // 1. Spribe Authentic Dark Cockpit Backdrop
      ctx.fillStyle = '#0f1015';
      ctx.fillRect(0, 0, width, height);

      // Subtle fine grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const numCols = 12;
      const numRows = 7;
      for (let i = 1; i < numCols; i++) {
        const x = (width / numCols) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let j = 1; j < numRows; j++) {
        const y = (height / numRows) * j;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Flight Trajectory Setup
      const startX = 35;
      const startY = height - 35;
      const targetMaxX = width - 85;
      const targetMaxY = 55;

      propellerAngleRef.current += 0.55;

      if (state === 'FLYING') {
        // Multiplier progression curve (logarithmic smooth climbing)
        const progress = Math.min(1, Math.log(Math.max(1, multiplier)) / Math.log(20));
        const currentX = startX + (targetMaxX - startX) * Math.min(1, progress * 0.9 + 0.08);
        const currentY = startY - (startY - targetMaxY) * Math.min(0.92, Math.pow(progress, 0.8) * 0.9 + 0.03);

        // Calculate tangent angle for plane banking
        const cpX = startX + (currentX - startX) * 0.5;
        const cpY = startY - (startY - currentY) * 0.12;
        const tangentAngle = -Math.atan2(startY - currentY, currentX - startX) * 0.65;

        planePosRef.current = { x: currentX, y: currentY, angle: tangentAngle };

        // Draw curved trajectory path
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cpX, cpY, currentX, currentY);

        // Signature Aviator Red Glowing Stroke
        ctx.strokeStyle = '#e51b24';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = 'rgba(229, 27, 36, 0.7)';
        ctx.shadowBlur = 15;
        ctx.stroke();

        // Altitude gradient fill under curve
        ctx.lineTo(currentX, startY);
        ctx.lineTo(startX, startY);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, currentY, 0, startY);
        grad.addColorStop(0, 'rgba(229, 27, 36, 0.28)');
        grad.addColorStop(0.5, 'rgba(229, 27, 36, 0.08)');
        grad.addColorStop(1, 'rgba(229, 27, 36, 0.0)');
        ctx.fillStyle = grad;
        ctx.shadowBlur = 0;
        ctx.fill();
        ctx.restore();

        // Draw the Red Airplane
        drawAviatorPlane(ctx, currentX, currentY, tangentAngle, propellerAngleRef.current);
      } else if (state === 'CRASHED') {
        // Smooth fly-away animation: plane zooms off top-right edge
        flyAwayProgressRef.current = Math.min(1, flyAwayProgressRef.current + 0.04);
        const p = flyAwayProgressRef.current;
        const flyX = planePosRef.current.x + p * 300;
        const flyY = planePosRef.current.y - p * 200;
        const flyAngle = planePosRef.current.angle - p * 0.3;

        if (p < 1) {
          drawAviatorPlane(ctx, flyX, flyY, flyAngle, propellerAngleRef.current * 1.5, 1 - p * 0.5);
        }
      } else {
        // WAITING: Plane parked on the runway baseline
        const waitX = startX + 25;
        const waitY = startY - 8;
        drawAviatorPlane(ctx, waitX, waitY, 0, propellerAngleRef.current * 0.2);
      }

      // X and Y Baseline Reference Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(width - 15, startY);
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX, 20);
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [state, multiplier]);

  // Vector drawing of the iconic Spribe Aviator Red Aircraft
  const drawAviatorPlane = (ctx, x, y, angle, propAngle, opacity = 1) => {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(x, y);
    ctx.rotate(angle);

    const s = 1.2;
    ctx.scale(s, s);

    // Fuselage main body
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.quadraticCurveTo(14, -8, -16, -7);
    ctx.lineTo(-26, -16);
    ctx.lineTo(-30, -15);
    ctx.lineTo(-25, 0);
    ctx.lineTo(-30, 5);
    ctx.lineTo(-26, 5);
    ctx.quadraticCurveTo(-16, 7, 14, 7);
    ctx.closePath();

    const bodyGrad = ctx.createLinearGradient(0, -12, 0, 10);
    bodyGrad.addColorStop(0, '#ff3848');
    bodyGrad.addColorStop(0.4, '#e51b24');
    bodyGrad.addColorStop(1, '#9b0b12');
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Racing white stripes
    ctx.beginPath();
    ctx.moveTo(3, -7);
    ctx.lineTo(11, -7);
    ctx.lineTo(8, 7);
    ctx.lineTo(0, 7);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Aviator Cockpit Glass (Tinted cyan-blue reflection)
    ctx.beginPath();
    ctx.moveTo(13, -6);
    ctx.quadraticCurveTo(6, -9, 0, -6);
    ctx.lineTo(2, -1);
    ctx.closePath();
    ctx.fillStyle = '#67c3f3';
    ctx.fill();

    // Main Swept Wing
    ctx.beginPath();
    ctx.moveTo(9, 2);
    ctx.lineTo(-5, 20);
    ctx.lineTo(-13, 19);
    ctx.lineTo(-5, 2);
    ctx.closePath();
    const wingGrad = ctx.createLinearGradient(0, 0, 0, 20);
    wingGrad.addColorStop(0, '#e51b24');
    wingGrad.addColorStop(1, '#82070e');
    ctx.fillStyle = wingGrad;
    ctx.fill();

    // Propeller Nose Cone
    ctx.beginPath();
    ctx.arc(25, 0, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#f0f3f6';
    ctx.fill();

    // Spinning propeller blur ellipse
    ctx.save();
    ctx.translate(27, 0);
    ctx.rotate(propAngle);
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.8, 15, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fill();
    ctx.restore();

    ctx.restore();
  };

  return (
    <div className="relative w-full h-[280px] sm:h-[350px] md:h-[400px] rounded-2xl overflow-hidden bg-[#0f1015] border border-white/10 shadow-2xl select-none">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Central HUD Multiplier Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-10">
        {state === 'FLYING' && (
          <div className="text-center animate-fade-in">
            <span
              className="font-black tracking-tight text-white drop-shadow-[0_4px_30px_rgba(229,27,36,0.6)]"
              style={{
                fontFamily: "'Chakra Petch', 'Inter', sans-serif",
                fontSize: 'clamp(3.2rem, 8vw, 6rem)',
                lineHeight: 1
              }}
            >
              {multiplier.toFixed(2)}x
            </span>
          </div>
        )}

        {state === 'CRASHED' && (
          <div className="text-center flex flex-col items-center animate-fade-in">
            <span
              className="text-[#e51b24] font-black uppercase tracking-widest text-lg sm:text-2xl drop-shadow-md"
              style={{ fontFamily: "'Chakra Petch', sans-serif" }}
            >
              FLEW AWAY!
            </span>
            <span
              className="font-black text-[#e51b24] drop-shadow-[0_2px_25px_rgba(229,27,36,0.9)]"
              style={{
                fontFamily: "'Chakra Petch', 'Inter', sans-serif",
                fontSize: 'clamp(3rem, 7.5vw, 5.5rem)',
                lineHeight: 1.1
              }}
            >
              {multiplier.toFixed(2)}x
            </span>
          </div>
        )}

        {state === 'WAITING' && (
          <div className="flex flex-col items-center gap-3 bg-[#151722]/85 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 shadow-2xl">
            <div className="w-9 h-9 border-3 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
            <span
              className="text-xs sm:text-sm font-bold tracking-widest uppercase text-gray-200"
              style={{ fontFamily: "'Chakra Petch', sans-serif" }}
            >
              WAITING FOR NEXT ROUND
            </span>
            {/* Progress loading bar */}
            <div className="w-48 sm:w-60 h-2 bg-gray-900 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-rose-400 transition-all duration-100 ease-linear rounded-full"
                style={{ width: `${(countdownProgress || 1) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
