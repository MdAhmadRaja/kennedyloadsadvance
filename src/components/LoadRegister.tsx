import React, { useState, useMemo } from 'react';
import { TransportLoad, AdvanceRecord, TripRecord } from '../types';
import { deleteLoad } from '../firebase/firestoreService';
import {
  formatCurrency,
  formatWeight,
  safeDateDisplay,
  cleanVehicleKey,
  formatVehiclePlate,
} from '../utils/formatUtils';
import { buildVehicleTrips } from '../utils/tripUtils';
import {
  Truck,
  Search,
  PlusCircle,
  Edit2,
  Trash2,
  Calendar,
  Building2,
  MapPin,
  Phone,
  Banknote,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface Props {
  loads: TransportLoad[];
  advances: AdvanceRecord[];
  onOpenAddLoad: () => void;
  onEditLoad: (load: TransportLoad) => void;
  onSelectVehicle: (vehicleNumber: string) => void;
  onSettleRestBalance?: (trip: TripRecord) => void;
}

export const LoadRegister: React.FC<Props> = ({
  loads = [],
  advances = [],
  onOpenAddLoad,
  onEditLoad,
  onSelectVehicle,
  onSettleRestBalance,
}) => {
  // KPI View Switcher: 'all_loads' | 'completed' | 'settlement_due'
  const [activeKpiView, setActiveKpiView] = useState<'all_loads' | 'completed' | 'settlement_due'>('all_loads');
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Group trips by vehicle
  const tripsByLoadId = useMemo(() => {
    const loadsByVeh = new Map<string, TransportLoad[]>();
    (loads || []).forEach((l) => {
      const k = cleanVehicleKey(l.vehicleNumber);
      if (k) {
        const list = loadsByVeh.get(k) || [];
        list.push(l);
        loadsByVeh.set(k, list);
      }
    });

    const advancesByVeh = new Map<string, AdvanceRecord[]>();
    (advances || []).forEach((a) => {
      const k = cleanVehicleKey(a.vehicleNumber);
      if (k) {
        const list = advancesByVeh.get(k) || [];
        list.push(a);
        advancesByVeh.set(k, list);
      }
    });

    const tripMap = new Map<string, TripRecord>();
    loadsByVeh.forEach((vLoads, k) => {
      const vAdvances = advancesByVeh.get(k) || [];
      const vTrips = buildVehicleTrips(vLoads, vAdvances);
      vTrips.forEach((t) => {
        tripMap.set(t.load.id, t);
      });
    });

    return tripMap;
  }, [loads, advances]);

  // Unique companies for filter
  const companies = useMemo(() => {
    const set = new Set<string>();
    (loads || []).forEach((l) => {
      if (l && l.loadCompany) set.add(String(l.loadCompany));
    });
    return Array.from(set).sort();
  }, [loads]);

  // All completed trips across fleet
  const completedTripsList = useMemo(() => {
    const list: TripRecord[] = [];
    tripsByLoadId.forEach((t) => {
      if (t.status === 'completed') {
        list.push(t);
      }
    });
    return list.sort((a, b) => {
      const dA = a.restSettledDate || a.load.bookingDate || a.load.createdAt;
      const dB = b.restSettledDate || b.load.bookingDate || b.load.createdAt;
      return dB.localeCompare(dA);
    });
  }, [tripsByLoadId]);

  // All pending settlement trips (advance done, rest balance not settled)
  const settlementDueTripsList = useMemo(() => {
    const list: TripRecord[] = [];
    tripsByLoadId.forEach((t) => {
      if (t.status === 'pending_settlement') {
        list.push(t);
      }
    });
    return list.sort((a, b) => {
      const dA = a.load.bookingDate || a.load.createdAt;
      const dB = b.load.bookingDate || b.load.createdAt;
      return dB.localeCompare(dA);
    });
  }, [tripsByLoadId]);

  // Distinct vehicles with settlement due
  const settlementDueVehiclesMap = useMemo(() => {
    const map = new Map<string, TripRecord[]>();
    settlementDueTripsList.forEach((t) => {
      const k = cleanVehicleKey(t.load.vehicleNumber);
      if (k) {
        const arr = map.get(k) || [];
        arr.push(t);
        map.set(k, arr);
      }
    });
    return map;
  }, [settlementDueTripsList]);

  // STRICT 3 KPIS:
  // 1. Total loads added
  const totalLoadsAdded = loads.length;
  // 2. Total completed (trips)
  const totalCompletedTrips = completedTripsList.length;
  // 3. Total settlement due (in number total vehicles)
  const totalSettlementDueVehicles = settlementDueVehiclesMap.size;

  // Filtered views based on search term & company filter
  const filteredAllLoads = useMemo(() => {
    const rawTerm = (searchTerm || '').trim();
    const cleanTerm = cleanVehicleKey(rawTerm);
    const lowerTerm = rawTerm.toLowerCase();

    return (loads || []).filter((load) => {
      if (!load) return false;
      const veh = String(load.vehicleNumber || '');
      const comp = String(load.loadCompany || '').toLowerCase();
      const origin = String(load.loadingPoint || '').toLowerCase();
      const dest = String(load.destination || '').toLowerCase();

      let matchSearch = true;
      if (rawTerm) {
        const vClean = cleanVehicleKey(veh);
        matchSearch =
          (cleanTerm ? vClean.includes(cleanTerm) : false) ||
          veh.toLowerCase().includes(lowerTerm) ||
          comp.includes(lowerTerm) ||
          origin.includes(lowerTerm) ||
          dest.includes(lowerTerm);
      }

      const matchCompany = !companyFilter || load.loadCompany === companyFilter;
      return matchSearch && matchCompany;
    });
  }, [loads, searchTerm, companyFilter]);

  const filteredCompletedTrips = useMemo(() => {
    const rawTerm = (searchTerm || '').trim();
    const cleanTerm = cleanVehicleKey(rawTerm);
    const lowerTerm = rawTerm.toLowerCase();

    return completedTripsList.filter((trip) => {
      const veh = trip.load.vehicleNumber || '';
      const comp = (trip.load.loadCompany || '').toLowerCase();
      const origin = (trip.load.loadingPoint || '').toLowerCase();
      const dest = (trip.load.destination || '').toLowerCase();

      let matchSearch = true;
      if (rawTerm) {
        const vClean = cleanVehicleKey(veh);
        matchSearch =
          (cleanTerm ? vClean.includes(cleanTerm) : false) ||
          veh.toLowerCase().includes(lowerTerm) ||
          comp.includes(lowerTerm) ||
          origin.includes(lowerTerm) ||
          dest.includes(lowerTerm);
      }

      const matchCompany = !companyFilter || trip.load.loadCompany === companyFilter;
      return matchSearch && matchCompany;
    });
  }, [completedTripsList, searchTerm, companyFilter]);

  const filteredSettlementDueTrips = useMemo(() => {
    const rawTerm = (searchTerm || '').trim();
    const cleanTerm = cleanVehicleKey(rawTerm);
    const lowerTerm = rawTerm.toLowerCase();

    return settlementDueTripsList.filter((trip) => {
      const veh = trip.load.vehicleNumber || '';
      const comp = (trip.load.loadCompany || '').toLowerCase();
      const origin = (trip.load.loadingPoint || '').toLowerCase();
      const dest = (trip.load.destination || '').toLowerCase();

      let matchSearch = true;
      if (rawTerm) {
        const vClean = cleanVehicleKey(veh);
        matchSearch =
          (cleanTerm ? vClean.includes(cleanTerm) : false) ||
          veh.toLowerCase().includes(lowerTerm) ||
          comp.includes(lowerTerm) ||
          origin.includes(lowerTerm) ||
          dest.includes(lowerTerm);
      }

      const matchCompany = !companyFilter || trip.load.loadCompany === companyFilter;
      return matchSearch && matchCompany;
    });
  }, [settlementDueTripsList, searchTerm, companyFilter]);

  const handleDelete = async (load: TransportLoad) => {
    try {
      await deleteLoad(load.id, load.vehicleNumber);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-emerald-700" />
            <span>Load Register</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Click on any KPI to open its dedicated view &mdash; all loads, completed trips, or vehicles with settlement due
          </p>
        </div>

        <button
          onClick={onOpenAddLoad}
          className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold rounded-2xl shadow-sm hover:shadow transition self-start sm:self-auto cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Load</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ONLY 3 KPIS AS REQUESTED:                                                  */}
      {/* 1. Total Loads Added                                                      */}
      {/* 2. Total Completed (Trips)                                                */}
      {/* 3. Total Settlement Due (in number total vehicles)                        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* KPI 1: Total Loads Added */}
        <button
          type="button"
          onClick={() => setActiveKpiView('all_loads')}
          className={`text-left p-6 sm:p-7 rounded-3xl border transition-all cursor-pointer shadow-sm relative ${
            activeKpiView === 'all_loads'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-4 ring-slate-900/20'
              : 'bg-white text-slate-800 border-slate-200/90 hover:border-slate-400 hover:bg-slate-50/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs uppercase font-bold tracking-wider ${
                activeKpiView === 'all_loads' ? 'text-slate-300' : 'text-slate-500'
              }`}
            >
              Total Loads Added
            </span>
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                activeKpiView === 'all_loads'
                  ? 'bg-white/10 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black mt-3 tracking-tight">
            {totalLoadsAdded} Loads
          </div>
          <div className="mt-3 pt-3 border-t border-current/10 flex items-center justify-between text-xs">
            <span className={activeKpiView === 'all_loads' ? 'text-slate-300' : 'text-slate-500'}>
              View all booked loads
            </span>
            {activeKpiView === 'all_loads' ? (
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <span>Active View</span> &rarr;
              </span>
            ) : (
              <span className="text-slate-400 font-semibold">Click to open &rarr;</span>
            )}
          </div>
        </button>

        {/* KPI 2: Total Completed (Trips) */}
        <button
          type="button"
          onClick={() => setActiveKpiView('completed')}
          className={`text-left p-6 sm:p-7 rounded-3xl border-2 transition-all cursor-pointer shadow-sm relative ${
            activeKpiView === 'completed'
              ? 'bg-emerald-900 text-white border-emerald-900 shadow-md ring-4 ring-emerald-700/30'
              : 'bg-white text-slate-800 border-emerald-300 hover:border-emerald-400 hover:bg-emerald-50/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs uppercase font-bold tracking-wider ${
                activeKpiView === 'completed' ? 'text-emerald-200' : 'text-emerald-800'
              }`}
            >
              Total Completed (Trips)
            </span>
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                activeKpiView === 'completed'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black mt-3 tracking-tight">
            {totalCompletedTrips} Trips
          </div>
          <div className="mt-3 pt-3 border-t border-current/10 flex items-center justify-between text-xs">
            <span className={activeKpiView === 'completed' ? 'text-emerald-200' : 'text-slate-500'}>
              Advance & rest both settled
            </span>
            {activeKpiView === 'completed' ? (
              <span className="font-bold text-emerald-300 flex items-center gap-1">
                <span>Active View</span> &rarr;
              </span>
            ) : (
              <span className="text-emerald-700 font-bold">Click to open &rarr;</span>
            )}
          </div>
        </button>

        {/* KPI 3: Total Settlement Due (in number total vehicles) */}
        <button
          type="button"
          onClick={() => setActiveKpiView('settlement_due')}
          className={`text-left p-6 sm:p-7 rounded-3xl border-2 transition-all cursor-pointer shadow-sm relative ${
            activeKpiView === 'settlement_due'
              ? 'bg-rose-900 text-white border-rose-900 shadow-md ring-4 ring-rose-600/30'
              : 'bg-white text-slate-800 border-rose-300 hover:border-rose-400 hover:bg-rose-50/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs uppercase font-bold tracking-wider ${
                activeKpiView === 'settlement_due' ? 'text-rose-200' : 'text-rose-900'
              }`}
            >
              Total Settlement Due
            </span>
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                activeKpiView === 'settlement_due'
                  ? 'bg-rose-700 text-white'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black mt-3 tracking-tight">
            {totalSettlementDueVehicles} Vehicles
          </div>
          <div className="mt-3 pt-3 border-t border-current/10 flex items-center justify-between text-xs">
            <span className={activeKpiView === 'settlement_due' ? 'text-rose-200' : 'text-slate-500'}>
              {settlementDueTripsList.length} trips awaiting rest balance
            </span>
            {activeKpiView === 'settlement_due' ? (
              <span className="font-bold text-rose-300 flex items-center gap-1">
                <span>Active View</span> &rarr;
              </span>
            ) : (
              <span className="text-rose-800 font-bold">Click to open &rarr;</span>
            )}
          </div>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search vehicle number (e.g. JH11D0037 or JH11D 0037), company, route..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 text-sm border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Company Filter */}
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="px-4 py-3 text-sm border-2 border-slate-200 rounded-2xl bg-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none flex-1 md:flex-none font-semibold text-slate-700"
          >
            <option value="">All Companies ({companies.length})</option>
            {companies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEPARATE INTERFACE 1: TOTAL LOADS ADDED                                    */}
      {/* ========================================================================= */}
      {activeKpiView === 'all_loads' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2.5">
              <Truck className="w-5 h-5 text-slate-700" />
              <h3 className="text-base font-black text-slate-900">
                All Loads Added ({filteredAllLoads.length} Records)
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Showing complete transportation load booking register
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-xs">
                  <tr>
                    <th className="py-4 px-5">Vehicle</th>
                    <th className="py-4 px-5">Company</th>
                    <th className="py-4 px-5">Route</th>
                    <th className="py-4 px-5 text-right">Weight</th>
                    <th className="py-4 px-5 text-right">Freight</th>
                    <th className="py-4 px-5">Advance Paid</th>
                    <th className="py-4 px-5">Rest Balance</th>
                    <th className="py-4 px-5 text-center">Status</th>
                    <th className="py-4 px-5">Booking Date</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAllLoads.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        No loads found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAllLoads.map((load) => {
                      const trip = tripsByLoadId.get(load.id);
                      const isSettled = Boolean(load.isRestBalanceSettled);
                      const advanceTotal = trip ? trip.totalAdvances : 0;
                      const restDue = trip ? trip.restBalanceDue : Math.max(0, (load.calculatedFreight || 0) - advanceTotal);
                      const isConfirmingDelete = deleteConfirmId === load.id;

                      return (
                        <tr key={load.id} className="hover:bg-slate-50/80 transition">
                          {/* Vehicle Number */}
                          <td className="py-4 px-5 font-bold">
                            <button
                              onClick={() => onSelectVehicle(load.vehicleNumber)}
                              className="font-mono text-emerald-900 hover:text-emerald-700 hover:underline flex items-center gap-1.5 cursor-pointer text-sm"
                              title="Open in Vehicle Ledger"
                            >
                              <span>{formatVehiclePlate(load.vehicleNumber)}</span>
                            </button>
                            {load.driverContact && (
                              <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3" />
                                <span>{load.driverContact}</span>
                              </div>
                            )}
                          </td>

                          {/* Company */}
                          <td className="py-4 px-5">
                            <div className="font-bold text-slate-900">{load.loadCompany}</div>
                          </td>

                          {/* Route */}
                          <td className="py-4 px-5 text-slate-700">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900">{load.loadingPoint}</span>
                              <span className="text-slate-400">&rarr;</span>
                              <span className="font-semibold text-slate-900">{load.destination}</span>
                            </div>
                          </td>

                          {/* Weight */}
                          <td className="py-4 px-5 text-right font-semibold text-slate-800">
                            {formatWeight(load.weight)} MT
                          </td>

                          {/* Freight */}
                          <td className="py-4 px-5 text-right font-black text-slate-900 text-base">
                            ₹{formatCurrency(load.calculatedFreight)}
                          </td>

                          {/* Advance Paid */}
                          <td className="py-4 px-5 text-slate-700">
                            {advanceTotal > 0 ? (
                              <div>
                                <span className="font-bold text-emerald-800 text-sm">
                                  ₹{formatCurrency(advanceTotal)}
                                </span>
                                {trip?.advanceSender && (
                                  <span className="text-xs text-emerald-900 block font-medium truncate max-w-[140px]" title={trip.advanceSender}>
                                    by {trip.advanceSender}
                                  </span>
                                )}
                                {trip?.advanceDate && (
                                  <span className="text-xs text-slate-400 block font-mono">
                                    {safeDateDisplay(trip.advanceDate)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-amber-800 font-semibold text-xs bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                Awaiting Advance
                              </span>
                            )}
                          </td>

                          {/* Rest Balance */}
                          <td className="py-4 px-5">
                            {isSettled ? (
                              <div>
                                <span className="text-emerald-800 font-bold text-sm">
                                  ₹{formatCurrency(load.restBalanceAmount || restDue)}
                                </span>
                                {load.restBalancePaidBy && (
                                  <span className="text-xs text-emerald-900 block font-medium truncate max-w-[140px]" title={load.restBalancePaidBy}>
                                    by {load.restBalancePaidBy}
                                  </span>
                                )}
                                <span className="text-xs text-emerald-600 block">
                                  Settled ({safeDateDisplay(load.restBalanceDate)})
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="text-rose-900 font-black text-base">
                                  ₹{formatCurrency(restDue)}
                                </span>
                                {advanceTotal > 0 && onSettleRestBalance && trip && (
                                  <button
                                    onClick={() => onSettleRestBalance(trip)}
                                    className="text-xs text-emerald-700 hover:underline block font-bold mt-1 cursor-pointer"
                                  >
                                    Settle Now &rarr;
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-4 px-5 text-center">
                            {isSettled ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-950 border border-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                                Completed
                              </span>
                            ) : advanceTotal > 0 ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-950 border border-rose-300">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                                Rest Due
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300">
                                <Clock className="w-3.5 h-3.5 text-amber-700" />
                                Advance Pending
                              </span>
                            )}
                          </td>

                          {/* Booking Date */}
                          <td className="py-4 px-5 text-slate-600 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-mono text-xs">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{safeDateDisplay(load.bookingDate)}</span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            {isConfirmingDelete ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleDelete(load)}
                                  className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 cursor-pointer"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs hover:bg-slate-300 cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                {trip && onSettleRestBalance && (
                                  <button
                                    onClick={() => onSettleRestBalance(trip)}
                                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition cursor-pointer"
                                    title="Settle or review rest balance"
                                  >
                                    {isSettled ? 'View Settle' : 'Settle'}
                                  </button>
                                )}
                                <button
                                  onClick={() => onEditLoad(load)}
                                  className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition cursor-pointer"
                                  title="Edit Load"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(load.id)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                                  title="Delete Load"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEPARATE INTERFACE 2: TOTAL COMPLETED (TRIPS)                              */}
      {/* ========================================================================= */}
      {activeKpiView === 'completed' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              <h3 className="text-base font-black text-slate-900">
                Completed & Settled Trips ({filteredCompletedTrips.length} Trips)
              </h3>
            </div>
            <span className="text-xs text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full uppercase">
              Advance and rest balance both settled
            </span>
          </div>

          <div className="bg-white rounded-3xl border-2 border-emerald-300 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-emerald-50/80 text-emerald-950 font-bold border-b border-emerald-200 uppercase tracking-wider text-xs">
                  <tr>
                    <th className="py-4 px-5">Vehicle</th>
                    <th className="py-4 px-5">Company & Route</th>
                    <th className="py-4 px-5 text-right">Cleared Freight</th>
                    <th className="py-4 px-5">Advance Paid</th>
                    <th className="py-4 px-5">Rest Balance Settled</th>
                    <th className="py-4 px-5 text-center">Status</th>
                    <th className="py-4 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50">
                  {filteredCompletedTrips.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No completed trips match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCompletedTrips.map((trip) => (
                      <tr key={trip.load.id} className="hover:bg-emerald-50/30 transition">
                        <td className="py-4 px-5 font-bold">
                          <button
                            onClick={() => onSelectVehicle(trip.load.vehicleNumber)}
                            className="font-mono text-emerald-950 hover:text-emerald-700 hover:underline flex items-center gap-2 cursor-pointer text-sm"
                          >
                            <Truck className="w-4 h-4 text-emerald-600" />
                            <span>{formatVehiclePlate(trip.load.vehicleNumber)}</span>
                          </button>
                          <span className="text-xs text-slate-400 block mt-0.5">
                            Booked: {safeDateDisplay(trip.load.bookingDate)}
                          </span>
                        </td>

                        <td className="py-4 px-5">
                          <div className="font-bold text-slate-900">{trip.load.loadCompany}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span>{trip.load.loadingPoint}</span>
                            <span>&rarr;</span>
                            <span>{trip.load.destination}</span>
                            <span>({formatWeight(trip.load.weight)} MT)</span>
                          </div>
                        </td>

                        <td className="py-4 px-5 text-right font-black text-emerald-900 text-base">
                          ₹{formatCurrency(trip.freight)}
                        </td>

                        <td className="py-4 px-5">
                          <div className="font-bold text-emerald-800 text-sm">
                            ₹{formatCurrency(trip.totalAdvances)}
                          </div>
                          {trip.advanceSender && (
                            <span className="text-xs text-emerald-900 block font-medium">
                              Paid by: {trip.advanceSender}
                            </span>
                          )}
                          <span className="text-xs text-slate-400 block font-mono">
                            Date: {safeDateDisplay(trip.advanceDate)}
                          </span>
                        </td>

                        <td className="py-4 px-5">
                          <div className="font-bold text-emerald-900 text-sm">
                            ₹{formatCurrency(trip.restSettledAmount || trip.restBalanceDue)}
                          </div>
                          {trip.restSettledPaidBy && (
                            <span className="text-xs text-emerald-900 block font-medium">
                              Paid by: {trip.restSettledPaidBy}
                            </span>
                          )}
                          <span className="text-xs text-emerald-600 block font-mono font-bold">
                            Date: {safeDateDisplay(trip.restSettledDate)}
                          </span>
                        </td>

                        <td className="py-4 px-5 text-center">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-950 border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            Completed
                          </span>
                        </td>

                        <td className="py-4 px-5 text-right">
                          <button
                            onClick={() => onSelectVehicle(trip.load.vehicleNumber)}
                            className="px-4 py-2 text-xs font-bold text-emerald-900 hover:text-emerald-950 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition cursor-pointer"
                          >
                            View Ledger &rarr;
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEPARATE INTERFACE 3: TOTAL SETTLEMENT DUE (IN NUMBER TOTAL VEHICLES)      */}
      {/* ========================================================================= */}
      {activeKpiView === 'settlement_due' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-700" />
              <h3 className="text-base font-black text-slate-900">
                Vehicles With Settlement Due ({totalSettlementDueVehicles} Vehicles • {filteredSettlementDueTrips.length} Active Trips)
              </h3>
            </div>
            <span className="text-xs text-rose-900 font-bold bg-rose-100 border border-rose-300 px-3 py-1 rounded-full uppercase">
              Advance Paid &bull; Awaiting Rest Balance
            </span>
          </div>

          <div className="bg-white rounded-3xl border-2 border-rose-300 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-rose-50/80 text-rose-950 font-bold border-b border-rose-200 uppercase tracking-wider text-xs">
                  <tr>
                    <th className="py-4 px-5">Vehicle Number</th>
                    <th className="py-4 px-5">Company & Route</th>
                    <th className="py-4 px-5 text-right">Total Freight</th>
                    <th className="py-4 px-5">Advance Paid</th>
                    <th className="py-4 px-5 text-right">Rest Balance Due</th>
                    <th className="py-4 px-5 text-center">Status</th>
                    <th className="py-4 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100">
                  {filteredSettlementDueTrips.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No vehicles or trips currently awaiting rest balance settlement.
                      </td>
                    </tr>
                  ) : (
                    filteredSettlementDueTrips.map((trip) => (
                      <tr key={trip.load.id} className="hover:bg-rose-50/40 transition">
                        <td className="py-4 px-5 font-bold">
                          <button
                            onClick={() => onSelectVehicle(trip.load.vehicleNumber)}
                            className="font-mono text-slate-900 hover:text-emerald-800 hover:underline flex items-center gap-2 cursor-pointer text-sm"
                          >
                            <Truck className="w-4 h-4 text-rose-700" />
                            <span>{formatVehiclePlate(trip.load.vehicleNumber)}</span>
                          </button>
                          <span className="text-xs text-slate-400 block mt-0.5">
                            Booked: {safeDateDisplay(trip.load.bookingDate)}
                          </span>
                        </td>

                        <td className="py-4 px-5">
                          <div className="font-bold text-slate-900">{trip.load.loadCompany}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span>{trip.load.loadingPoint}</span>
                            <span>&rarr;</span>
                            <span>{trip.load.destination}</span>
                          </div>
                        </td>

                        <td className="py-4 px-5 text-right font-bold text-slate-800">
                          ₹{formatCurrency(trip.freight)}
                        </td>

                        <td className="py-4 px-5">
                          <div className="font-bold text-emerald-800 text-sm">
                            ₹{formatCurrency(trip.totalAdvances)}
                          </div>
                          {trip.advanceSender && (
                            <span className="text-xs text-emerald-900 block font-medium">
                              Paid by: {trip.advanceSender}
                            </span>
                          )}
                          <span className="text-xs text-slate-400 block font-mono">
                            Date: {safeDateDisplay(trip.advanceDate)}
                          </span>
                        </td>

                        <td className="py-4 px-5 text-right">
                          <div className="text-base font-black text-rose-950">
                            ₹{formatCurrency(trip.restBalanceDue)}
                          </div>
                          <span className="text-xs text-rose-800 font-bold uppercase">
                            Pending Settlement
                          </span>
                        </td>

                        <td className="py-4 px-5 text-center">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-950 border border-rose-300">
                            <Clock className="w-3.5 h-3.5 text-rose-700" />
                            Rest Due
                          </span>
                        </td>

                        <td className="py-4 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {onSettleRestBalance && (
                              <button
                                onClick={() => onSettleRestBalance(trip)}
                                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Settle Rest</span>
                              </button>
                            )}
                            <button
                              onClick={() => onSelectVehicle(trip.load.vehicleNumber)}
                              className="px-3 py-2 text-xs font-bold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                            >
                              Ledger &rarr;
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
