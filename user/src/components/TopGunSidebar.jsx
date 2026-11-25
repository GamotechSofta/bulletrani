import React from 'react';
import {
  IconHome,
  IconClock,
  IconTrophy,
  IconWallet,
  IconGift,
  IconHeadset
} from './Icons';

export default function TopGunSidebar({
  activeTab = 'play',
  onSelectTab,
  onOpenLeaderboard,
  onOpenWallet,
  onOpenHistory,
  onOpenOffers,
  onOpenSupport
}) {
  const menuItems = [
    {
      id: 'play',
      label: 'Play',
      icon: <IconHome className="w-4 h-4" />,
      action: () => onSelectTab && onSelectTab('play')
    },
    {
      id: 'history',
      label: 'History',
      icon: <IconClock className="w-4 h-4" />,
      action: onOpenHistory
    },
    {
      id: 'leaderboard',
      label: 'Leaderboard',
      icon: <IconTrophy className="w-4 h-4 text-inherit" />,
      action: onOpenLeaderboard
    },
    {
      id: 'wallet',
      label: 'Wallet',
      icon: <IconWallet className="w-4 h-4 text-inherit" />,
      action: onOpenWallet
    },
    {
      id: 'offers',
      label: 'Offers',
      badge: true,
      icon: <IconGift className="w-4 h-4 text-inherit" />,
      action: onOpenOffers
    },
    {
      id: 'support',
      label: 'Support',
      icon: <IconHeadset className="w-4 h-4 text-inherit" />,
      action: onOpenSupport
    }
  ];

  return (
    <aside className="w-[148px] lg:w-[158px] shrink-0 hidden md:flex flex-col gap-1.5 pt-1 select-none">
      {menuItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => item.action && item.action()}
            className={`w-full flex items-center justify-start gap-2.5 px-3.5 py-3 rounded-xl text-[13px] transition-all relative cursor-pointer ${
              isActive
                ? 'bg-gradient-to-r from-[#f5b942] to-[#f59e0b] text-black shadow-lg shadow-orange-500/25 font-extrabold'
                : 'text-gray-300 hover:text-white hover:bg-white/5 font-semibold'
            }`}
          >
            <span className={isActive ? 'text-black' : 'text-gray-400'}>{item.icon}</span>
            <span>{item.label}</span>

            {item.badge && (
              <span className="w-2 h-2 rounded-full bg-red-500 absolute right-3 top-3.5 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
            )}
          </button>
        );
      })}
    </aside>
  );
}
