import React, { useState } from 'react';

export default function HowToPlayModal({ onClose }) {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      title: "1. Place Your Bets",
      icon: "🎯",
      desc: "Select your desired bet amount before the round starts. You can place two independent bets simultaneously using Bet Panel 1 and Bet Panel 2 to maximize strategic flexibility.",
      tip: "Pro Tip: Use Auto-Bet to automatically participate in every round without clicking manually."
    },
    {
      title: "2. Watch the Multiplier Rise",
      icon: "✈️",
      desc: "As the lucky plane takes off, the multiplier curve ascends exponentially starting from 1.00x upwards. The higher it flies, the bigger your potential payout!",
      tip: "The multiplier is mathematically generated prior to takeoff and verified cryptographically via Provably Fair SHA-256."
    },
    {
      title: "3. Cash Out in Time!",
      icon: "💰",
      desc: "Click the big Cash Out button before the plane flies away! Your win equals your Bet Amount multiplied by the current Multiplier. If the plane flies away before you cash out, the bet is lost.",
      tip: "Strategic Move: Set Auto-Cashout on Panel 1 at 1.50x to secure your principal, and let Panel 2 ride for high multipliers like 10x or 50x!"
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-[#141824] border border-white/10 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold p-1 rounded-lg"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-2xl">
            ✈️
          </div>
          <h2 className="text-xl font-black tracking-wide" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>
            HOW TO PLAY AVIATOR
          </h2>
          <p className="text-xs text-gray-400">The world's most thrilling real multiplier crash game</p>
        </div>

        {/* Step indicator tabs */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {steps.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setActiveStep(idx)}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeStep === idx
                  ? 'border-red-500 bg-red-500/20 text-white shadow-md'
                  : 'border-white/5 bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <span>{s.icon}</span>
              <span>Step {idx + 1}</span>
            </button>
          ))}
        </div>

        {/* Active step content */}
        <div className="bg-black/40 border border-white/5 rounded-2xl p-5 mb-6 animate-fade-in min-h-[160px] flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-xl">{steps[activeStep].icon}</span>
              <span>{steps[activeStep].title}</span>
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed mb-4">
              {steps[activeStep].desc}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
            💡 <strong>Hint:</strong> {steps[activeStep].tip}
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
            disabled={activeStep === 0}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            ← Previous
          </button>

          <div className="flex gap-1.5">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  activeStep === idx ? 'bg-red-500 w-6' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>

          {activeStep < steps.length - 1 ? (
            <button
              onClick={() => setActiveStep(activeStep + 1)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-md transition-all"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md transition-all"
            >
              Start Playing!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
