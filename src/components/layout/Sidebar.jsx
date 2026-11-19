/**
 * layout/Sidebar.jsx — Menu navigasi (sesuai Gambar 2)
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, PlusCircle, History, Settings, Wallet } from 'lucide-react';

export default function Sidebar({ onItemClick }) {
  const navItems = [
    { to: '/', label: 'Beranda', icon: Home },
    { to: '/catat', label: 'Pencatatan', icon: PlusCircle },
    { to: '/riwayat', label: 'Riwayat', icon: History },
    { to: '/pengaturan', label: 'Pengaturan', icon: Settings }
  ];

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-100 select-none">
      {/* Brand Header */}
      <div className="p-6 pb-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#007A78] flex items-center justify-center text-white shadow-xs flex-shrink-0">
          <Wallet className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-gray-900 text-base leading-tight tracking-tight">Keuangan</h1>
          <p className="text-[11px] text-gray-400">PWA Offline-First</p>
        </div>
      </div>

      {/* Nav Menu — Desain sesuai Gambar 2 */}
      <nav className="flex-1 px-4 py-3 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onItemClick}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[15px] font-medium transition-all ${
                  isActive
                    ? 'bg-[#EAF7F5] text-[#007A78] font-bold shadow-2xs'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.9} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
