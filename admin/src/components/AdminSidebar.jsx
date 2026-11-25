import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Radar,
  Users,
  Settings2,
  Link2,
  ScrollText,
  CreditCard,
  X
} from 'lucide-react';

export const ADMIN_NAV = [
  { path: '/overview', label: 'Financial Overview', Icon: BarChart3 },
  { path: '/live-radar', label: 'Live Flight Radar', Icon: Radar },
  { path: '/players', label: 'Pilot Management', Icon: Users },
  { path: '/settings', label: 'Risk & Math Config', Icon: Settings2 },
  { path: '/provider', label: 'Provider Integration', Icon: Link2 },
  { path: '/rounds', label: 'Provably Fair Ledger', Icon: ScrollText },
  { path: '/transactions', label: 'All Transactions', Icon: CreditCard }
];

export default function AdminSidebar({ open = true, onClose }) {
  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/60 backdrop-blur-[2px] transition-opacity lg:hidden ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 max-w-[85vw] h-full
          bg-[#0a0d14] border-r border-white/10
          flex flex-col shrink-0 
          transition-transform duration-200 ease-out
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1.5">
          <div className="flex items-center justify-between px-3 mb-2 lg:block">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Platform Controls
            </div>
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden text-gray-400 hover:text-white p-1 rounded-lg"
              aria-label="Close menu"
            >
              <X size={16} strokeWidth={2.25} />
            </button>
          </div>

          {ADMIN_NAV.map(({ path, label, Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={onClose}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  isActive
                    ? 'bg-gradient-to-r from-red-600/20 to-rose-600/10 border border-red-500/30 text-white shadow-md'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={16}
                    strokeWidth={2.25}
                    className={`shrink-0 ${isActive ? 'text-red-400' : 'text-gray-500'}`}
                  />
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="shrink-0 p-4 pt-0">
          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl text-[11px] text-gray-400">
            <div className="font-bold text-gray-300 mb-1">Bullet Rani Engine</div>
            <div>WebSocket: <span className="text-emerald-400 font-mono">30Hz Active</span></div>
            <div>House Edge: <span className="text-amber-400 font-mono">3.0% (97% RTP)</span></div>
          </div>
        </div>
      </aside>
    </>
  );
}
