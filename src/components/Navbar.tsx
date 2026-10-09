import React from 'react';
import { useAuth } from '../context/AuthContext';
import { AdminPresence } from '../types';
import {
  Truck,
  LayoutDashboard,
  FileSpreadsheet,
  Banknote,
  Search,
  Download,
  History,
  LogOut,
  PlusCircle,
  Shield,
  Circle,
} from 'lucide-react';

export type ActiveTab = 'dashboard' | 'loads' | 'advances' | 'vehicleSearch' | 'export' | 'activity';

interface Props {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAddLoad: () => void;
  onOpenAddAdvance: () => void;
  presences: AdminPresence[];
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  onOpenAddLoad,
  onOpenAddAdvance,
  presences,
}) => {
  const { currentUser, logout } = useAuth();

  // Find partner admin presence
  const currentEmail = currentUser?.email?.toLowerCase();
  const partnerAdmin = presences.find((p) => p.email.toLowerCase() !== currentEmail);
  const isPartnerOnline = partnerAdmin
    ? (Date.now() - new Date(partnerAdmin.lastActive).getTime()) / 1000 < 90
    : false;

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'loads', label: 'Load Register', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'advances', label: 'Advance Register', icon: <Banknote className="w-4 h-4" /> },
    { id: 'vehicleSearch', label: 'Vehicle Search', icon: <Search className="w-4 h-4" /> },
    { id: 'export', label: 'Export & Reports', icon: <Download className="w-4 h-4" /> },
    { id: 'activity', label: 'Activity History', icon: <History className="w-4 h-4" /> },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      {/* Top Banner with Brand and Partner Status */}
      <div className="bg-emerald-800 text-white px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-700/80 border border-emerald-600 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide">KENNEDY TRAILER SERVICES</span>
                <span className="text-[10px] bg-emerald-700/90 text-emerald-200 px-1.5 py-0.5 rounded font-mono">
                  Desk
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/90 hidden sm:block">
                Simple Transport Management & Fast Vehicle Accounting
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {/* Partner Presence Badge */}
            {partnerAdmin && (
              <div className="hidden md:flex items-center gap-2 bg-emerald-900/60 border border-emerald-700/60 px-2.5 py-1 rounded-full text-[11px]">
                <span className="text-emerald-300">Partner:</span>
                <span className="font-medium text-white">{partnerAdmin.displayName}</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isPartnerOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                  }`}
                  title={isPartnerOnline ? 'Online' : 'Offline'}
                />
              </div>
            )}

            {/* Current Admin badge & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-emerald-700">
              <div className="flex items-center gap-1.5 bg-emerald-700/70 px-2.5 py-1 rounded-full">
                <Shield className="w-3.5 h-3.5 text-emerald-300" />
                <span className="font-medium truncate max-w-[140px] sm:max-w-[200px]">
                  {currentUser?.email?.split('@')[0]}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              <button
                onClick={() => logout()}
                className="p-1.5 rounded-lg hover:bg-emerald-700/80 text-emerald-200 hover:text-white transition"
                title="Log out of Transport Desk"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                  }`}
                >
                  <span className={isActive ? 'text-emerald-700' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenAddAdvance}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold rounded-lg shadow-2xs transition"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>+ Add Advance</span>
            </button>
            <button
              onClick={onOpenAddLoad}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Add Load</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
