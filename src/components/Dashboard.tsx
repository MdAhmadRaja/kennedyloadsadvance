import React, { useState } from 'react';
import { TransportLoad, AdvanceRecord, AdminPresence } from '../types';
import { AdminPresenceCard } from './AdminPresenceCard';
import { formatCurrency, formatWeight } from '../utils/formatUtils';
import {
  Truck,
  Banknote,
  Search,
  PlusCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  Building2,
  Calculator,
} from 'lucide-react';

interface Props {
  loads: TransportLoad[];
  advances: AdvanceRecord[];
  presences: AdminPresence[];
  currentAdminEmail?: string | null;
  onOpenAddLoad: () => void;
  onOpenAddAdvance: () => void;
  onSelectVehicle: (vehicleNumber: string) => void;
  onNavigateTab: (tab: any) => void;
  onReviewMatch: (advance: AdvanceRecord, candidateLoads: TransportLoad[]) => void;
}

export const Dashboard: React.FC<Props> = ({
  loads = [],
  advances = [],
  presences = [],
  currentAdminEmail,
  onOpenAddLoad,
  onOpenAddAdvance,
  onSelectVehicle,
  onNavigateTab,
  onReviewMatch,
}) => {
  const [vehicleQuery, setVehicleQuery] = useState('');

  // Financial aggregates with safe fallback
  const totalLoadsCount = loads.length;
  const totalAdvancesCount = advances.length;
  const totalAdvanceAmount = advances.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const totalFreightAmount = loads.reduce((s, l) => s + (Number(l.calculatedFreight) || 0), 0);

  const unmatchedAdvances = advances.filter(
    (a) => a.matchingStatus === 'unmatched' || a.matchingStatus === 'multiple-possible'
  );

  const handleVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (vehicleQuery.trim()) {
      onSelectVehicle(vehicleQuery.trim().toUpperCase());
    }
  };

  // Recent 5 loads and recent 5 advances safely sliced
  const recentLoads = Array.isArray(loads) ? loads.slice(0, 5) : [];
  const recentAdvances = Array.isArray(advances) ? advances.slice(0, 5) : [];

  return (
    <div className="space-y-6">
      {/* 1. Administrator Presence Banner (both admins' last active time & real-time status) */}
      <AdminPresenceCard presences={presences} currentAdminEmail={currentAdminEmail} />

      {/* 2. Large Prominent Vehicle Search Box */}
      <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Instant Vehicle Lookup & Ledger
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Search by registration plate</span>
        </div>

        <form onSubmit={handleVehicleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search vehicle number (e.g. MH 12 AB 1234)..."
              value={vehicleQuery}
              onChange={(e) => setVehicleQuery(e.target.value.toUpperCase())}
              className="w-full pl-11 pr-4 py-2.5 text-sm font-mono uppercase font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition shrink-0"
          >
            Search Vehicle
          </button>
        </form>
      </div>

      {/* 3. Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Loads */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Loads
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900">{totalLoadsCount}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Freight: ₹{formatCurrency(totalFreightAmount)}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => onNavigateTab('loads')}
              className="text-xs text-emerald-700 font-semibold hover:text-emerald-900 flex items-center gap-1"
            >
              <span>View all loads</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Total Advance Records */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Advances
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900">{totalAdvancesCount}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Total Recorded Payments
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => onNavigateTab('advances')}
              className="text-xs text-emerald-700 font-semibold hover:text-emerald-900 flex items-center gap-1"
            >
              <span>View advance register</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Total Recorded Advance Amount */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Recorded Advances
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-800">
              ₹{formatCurrency(totalAdvanceAmount)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Total business advances
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => onNavigateTab('export')}
              className="text-xs text-emerald-700 font-semibold hover:text-emerald-900 flex items-center gap-1"
            >
              <span>Export summary</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Unmatched / Uncertain Advances */}
        <div
          className={`bg-white p-5 rounded-2xl border shadow-2xs transition ${
            unmatchedAdvances.length > 0
              ? 'border-amber-300 bg-amber-50/20'
              : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Unmatched Advances
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                unmatchedAdvances.length > 0
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-3xl font-black ${
                unmatchedAdvances.length > 0 ? 'text-amber-700' : 'text-slate-900'
              }`}
            >
              {unmatchedAdvances.length}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {unmatchedAdvances.length === 0
                ? 'All advances connected'
                : 'Need load connection'}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => onNavigateTab('advances')}
              className="text-xs text-amber-700 font-semibold hover:text-amber-900 flex items-center gap-1"
            >
              <span>Review connections</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Side-by-Side: Recent Loads & Recent Advances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Loads */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Recent Loads
              </h4>
            </div>
            <button
              onClick={onOpenAddLoad}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Load</span>
            </button>
          </div>

          {recentLoads.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No loads recorded yet. Click "Add Load" to start.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentLoads.map((load) => (
                <div
                  key={load.id}
                  className="p-3.5 hover:bg-slate-50/70 transition flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <button
                      onClick={() => onSelectVehicle(load.vehicleNumber)}
                      className="font-mono font-bold text-xs text-emerald-900 hover:underline block"
                    >
                      {load.vehicleNumber}
                    </button>
                    <div className="text-xs text-slate-700 font-medium truncate mt-0.5">
                      {load.loadCompany}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {load.loadingPoint} &rarr; {load.destination} • {formatWeight(load.weight)} MT
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-emerald-800">
                      ₹{formatCurrency(load.calculatedFreight)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {load.bookingDate}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 bg-slate-50/80 border-t border-slate-100 text-center">
            <button
              onClick={() => onNavigateTab('loads')}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              View all {loads.length} loads &rarr;
            </button>
          </div>
        </div>

        {/* Recent Advances */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Recent Advances
              </h4>
            </div>
            <button
              onClick={onOpenAddAdvance}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Advance</span>
            </button>
          </div>

          {recentAdvances.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No advances recorded yet. Click "Add Advance" to start.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentAdvances.map((adv) => (
                <div
                  key={adv.id}
                  className="p-3.5 hover:bg-slate-50/70 transition flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <button
                      onClick={() => onSelectVehicle(adv.vehicleNumber)}
                      className="font-mono font-bold text-xs text-emerald-900 hover:underline block"
                    >
                      {adv.vehicleNumber}
                    </button>
                    <div className="text-xs text-slate-700 font-medium truncate mt-0.5">
                      Sender: {adv.advanceSender}
                    </div>
                    <div className="mt-0.5">
                      <span
                        className={`inline-block px-2 py-0.2 rounded-full text-[10px] font-semibold ${
                          adv.matchingStatus === 'auto-linked' ||
                          adv.matchingStatus === 'manually-linked'
                            ? 'bg-emerald-100 text-emerald-800'
                            : adv.matchingStatus === 'multiple-possible'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {adv.matchingStatus}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-emerald-800">
                      ₹{formatCurrency(adv.amount)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {adv.paymentDate}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 bg-slate-50/80 border-t border-slate-100 text-center">
            <button
              onClick={() => onNavigateTab('advances')}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              View all {advances.length} advances &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
