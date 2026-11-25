import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const STYLES = {
  error: {
    Icon: AlertCircle,
    wrap: 'border-red-500/35 bg-[#1a1014]/95 text-red-100',
    icon: 'text-red-400',
    bar: 'bg-red-500'
  },
  success: {
    Icon: CheckCircle2,
    wrap: 'border-emerald-500/35 bg-[#0f1a16]/95 text-emerald-100',
    icon: 'text-emerald-400',
    bar: 'bg-emerald-500'
  },
  info: {
    Icon: Info,
    wrap: 'border-sky-500/35 bg-[#0f1620]/95 text-sky-100',
    icon: 'text-sky-400',
    bar: 'bg-sky-500'
  }
};

export default function Toast({ toast, onDismiss }) {
  const type = STYLES[toast?.type] ? toast.type : 'info';
  const { Icon, wrap, icon, bar } = STYLES[type];
  const duration = toast?.duration ?? 3200;

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => onDismiss?.(toast.id), duration);
    return () => clearTimeout(t);
  }, [toast, duration, onDismiss]);

  if (!toast) return null;

  return (
    <div
      role="status"
      className={`pointer-events-auto w-[min(92vw,380px)] rounded-2xl border shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md overflow-hidden ${wrap}`}
    >
      <div className="flex items-start gap-3 px-3.5 py-3">
        <Icon size={18} strokeWidth={2.25} className={`shrink-0 mt-0.5 ${icon}`} />
        <p className="flex-1 text-[13px] font-semibold leading-snug pt-0.5">{toast.message}</p>
        <button
          type="button"
          onClick={() => onDismiss?.(toast.id)}
          className="shrink-0 p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      </div>
      <div className={`h-0.5 ${bar} opacity-70 origin-left animate-[toastbar_var(--d)_linear_forwards]`} style={{ ['--d']: `${duration}ms` }} />
      <style>{`@keyframes toastbar{from{transform:scaleX(1)}to{transform:scaleX(0)}}`}</style>
    </div>
  );
}

export function ToastStack({ toasts, onDismiss }) {
  if (!toasts?.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[100] flex flex-col items-center gap-2 px-3">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
