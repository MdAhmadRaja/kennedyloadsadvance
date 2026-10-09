import React, { useState, useMemo } from 'react';
import { AdvanceRecord, TransportLoad, TripRecord } from '../types';
import { deleteAdvance } from '../firebase/firestoreService';
import {
  formatCurrency,
  safeEmailDisplay,
  safeDateDisplay,
  cleanVehicleKey,
  formatVehiclePlate,
  formatWeight,
} from '../utils/formatUtils';
import { buildVehicleTrips } from '../utils/tripUtils';
import {
  Banknote,
  Search,
  PlusCircle,
  Edit2,
  Trash2,
  Calendar,
  CheckCircle2,
  Truck,
  ArrowRight,
  Filter,
  AlertTriangle,
  Clock,
  DollarSign,
} from 'lucide-react';

interface Props {
  advances: AdvanceRecord[];
  loads: TransportLoad[];
  onOpenAddAdvance: (prefillVehicle?: string) => void;
  onEditAdvance: (advance: AdvanceRecord) => void;
  onSelectVehicle: (vehicleNumber: string) => void;
  onSettleRestBalance?: (trip: TripRecord) => void;
}

export const AdvanceRegister: React.FC<Props> = ({
  advances = [],
  loads = [],
  onOpenAddAdvance,
  onEditAdvance,
  onSelectVehicle,
  onSettleRestBalance,
}) => {
  // KPI View Switcher: 'all_advance_vehicles' | 'left_with_advance' | 'left_with_settlement'
  const [activeKpiView, setActiveKpiView] = useState<'all_advance_vehicles' | 'left_with_advance' | 'left_with_settlement'>('all_advance_vehicles');
  const [searchTerm, setSearchTerm] = useState('');
  const [senderFilter, setSenderFilter] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Group unique senders for filter
  const senders = useMemo(() => {
    const set = new Set<string>();
    (advances || []).forEach((a) => {
      if (a && a.advanceSender) set.add(a.advanceSender.trim());
    });
    return Array.from(set).sort();
  }, [advances]);

  // Compute all trips across vehicles using full chronological builder
  const allTripsAcrossFleet = useMemo(() => {
    const loadsByVeh = new Map<string, TransportLoad[]>();
    (loads || []).forEach((l) => {
      const k = cleanVehicleKey(l.vehicleNumber);
      if (k) {
        const arr = loadsByVeh.get(k) || [];
        arr.push(l);
        loadsByVeh.set(k, arr);
      }
    });

    const advancesByVeh = new Map<string, AdvanceRecord[]>();
    (advances || []).forEach((a) => {
      const k = cleanVehicleKey(a.vehicleNumber);
      if (k) {
        const arr = advancesByVeh.get(k) || [];
        arr.push(a);
        advancesByVeh.set(k, arr);
      }
    });

    const trips: TripRecord[] = [];
    const allKeys = new Set<string>([...loadsByVeh.keys(), ...advancesByVeh.keys()]);
    allKeys.forEach((k) => {
      const vLoads = loadsByVeh.get(k) || [];
      const vAdvances = advancesByVeh.get(k) || [];
      const vTrips = buildVehicleTrips(vLoads, vAdvances);
      trips.push(...vTrips);
    });

    return trips;
  }, [loads, advances]);

  // Check which vehicles have existing loads
  const vehicleHasLoadSet = useMemo(() => {
    const set = new Set<string>();
    (loads || []).forEach((l) => {
      const k = cleanVehicleKey(l.vehicleNumber);
      if (k) set.add(k);
    });
    return set;
  }, [loads]);

  // 1. Total advance (total no of vehicle whom i paid advance)
  const uniqueAdvanceVehicleKeys = useMemo(() => {
    const set = new Set<string>();
    (advances || []).forEach((a) => {
      const k = cleanVehicleKey(a.vehicleNumber);
      if (k) set.add(k);
    });
    return set;
  }, [advances]);
  const totalVehiclesPaidAdvance = uniqueAdvanceVehicleKeys.size;

  // 2. Total Vehicle Left with Advance:
  // Vehicles whose load is booked BUT advance has NOT been paid yet!
  // Once advance is paid, it is NO LONGER left with advance (moves to left with settlement).
  const tripsLeftWithAdvance = useMemo(() => {
    return allTripsAcrossFleet
      .filter((t) => t.status === 'pending_advance')
      .sort((a, b) => {
        const dA = a.load.bookingDate || a.load.createdAt;
        const dB = b.load.bookingDate || b.load.createdAt;
        return dB.localeCompare(dA);
      });
  }, [allTripsAcrossFleet]);

  const vehiclesLeftWithAdvanceKeys = useMemo(() => {
    const set = new Set<string>();
    tripsLeftWithAdvance.forEach((t) => {
      const k = cleanVehicleKey(t.load.vehicleNumber);
      if (k) set.add(k);
    });
    return set;
  }, [tripsLeftWithAdvance]);
  const totalVehiclesLeftWithAdvance = vehiclesLeftWithAdvanceKeys.size;

  // 3. Vehicle Left with Settlement:
  // Vehicles whose advance has been paid and rest balance is pending/due to be settled!
  const tripsLeftWithSettlement = useMemo(() => {
    return allTripsAcrossFleet
      .filter((t) => t.status === 'pending_settlement')
      .sort((a, b) => {
        const dA = a.load.bookingDate || a.load.createdAt;
        const dB = b.load.bookingDate || b.load.createdAt;
        return dB.localeCompare(dA);
      });
  }, [allTripsAcrossFleet]);

  const vehiclesLeftWithSettlementKeys = useMemo(() => {
    const set = new Set<string>();
    tripsLeftWithSettlement.forEach((t) => {
      const k = cleanVehicleKey(t.load.vehicleNumber);
      if (k) set.add(k);
    });
    return set;
  }, [tripsLeftWithSettlement]);
  const totalVehiclesLeftWithSettlement = vehiclesLeftWithSettlementKeys.size;

  // Filtered views based on search term & sender filter
  const filteredAdvances = useMemo(() => {
    const rawTerm = (searchTerm || '').trim();
    const cleanTerm = cleanVehicleKey(rawTerm);
    const lowerTerm = rawTerm.toLowerCase();

    return (advances || []).filter((adv) => {
      if (!adv) return false;
      const sender = String(adv.advanceSender || '').toLowerCase();
      const veh = String(adv.vehicleNumber || '');
      const vClean = cleanVehicleKey(veh);

      let matchSearch = true;
      if (rawTerm) {
        matchSearch =
          (cleanTerm ? vClean.includes(cleanTerm) : false) ||
          veh.toLowerCase().includes(lowerTerm) ||
          sender.includes(lowerTerm);
      }

      const matchSender = !senderFilter || adv.advanceSender.trim() === senderFilter;
      return matchSearch && matchSender;
    });
  }, [advances, searchTerm, senderFilter]);

  const filteredTripsLeftWithAdvance = useMemo(() => {
    const rawTerm = (searchTerm || '').trim();
    const cleanTerm = cleanVehicleKey(rawTerm);
    const lowerTerm = rawTerm.toLowerCase();

    return tripsLeftWithAdvance.filter((trip) => {
      const veh = trip.load.vehicleNumber || '';
      const vClean = cleanVehicleKey(veh);
      const comp = (trip.load.loadCompany || '').toLowerCase();
      const origin = (trip.load.loadingPoint || '').toLowerCase();
      const dest = (trip.load.destination || '').toLowerCase();

      let matchSearch = true;
      if (rawTerm) {
        matchSearch =
          (cleanTerm ? vClean.includes(cleanTerm) : false) ||
          veh.toLowerCase().includes(lowerTerm) ||
          comp.includes(lowerTerm) ||
          origin.includes(lowerTerm) ||
          dest.includes(lowerTerm);
      }

      return matchSearch;
    });
  }, [tripsLeftWithAdvance, searchTerm]);

  const filteredTripsLeftWithSettlement = useMemo(() => {
    const rawTerm = (searchTerm || '').trim();
    const cleanTerm = cleanVehicleKey(rawTerm);
    const lowerTerm = rawTerm.toLowerCase();

    return tripsLeftWithSettlement.filter((trip) => {
      const veh = trip.load.vehicleNumber || '';
      const vClean = cleanVehicleKey(veh);
      const comp = (trip.load.loadCompany || '').toLowerCase();

      let matchSearch = true;
      if (rawTerm) {
        matchSearch =
          (cleanTerm ? vClean.includes(cleanTerm) : false) ||
          veh.toLowerCase().includes(lowerTerm) ||
          comp.includes(lowerTerm) ||
          trip.advances.some((a) => (a.advanceSender || '').toLowerCase().includes(lowerTerm));
      }

      const matchSender =
        !senderFilter ||
        trip.advances.some((a) => a.advanceSender.trim() === senderFilter);

      return matchSearch && matchSender;
    });
  }, [tripsLeftWithSettlement, searchTerm, senderFilter]);

  const handleDelete = async (adv: AdvanceRecord) => {
    try {
      await deleteAdvance(adv.id, adv.vehicleNumber);
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
            <Banknote className="w-6 h-6 text-emerald-700" />
            <span>Advance Register</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Click on any KPI to open its dedicated view &mdash; all advance vehicles, vehicles awaiting advance, or vehicles awaiting settlement
          </p>
        </div>

        <button
          onClick={() => onOpenAddAdvance()}
          className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold rounded-2xl shadow-sm hover:shadow transition self-start sm:self-auto cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Advance</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* STRICT 3 KPIS AS REQUESTED:                                                */}
      {/* 1. Total Advance (total no of vehicle whom i paid advance)                */}
      {/* 2. Total Vehicle Left with Advance (Advance Awaiting Payment)             */}
      {/* 3. Vehicle Left with Settlement (Rest Balance Due)                        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* KPI 1: Total Advance (Total Vehicles Paid Advance) */}
        <button
          type="button"
          onClick={() => setActiveKpiView('all_advance_vehicles')}
          className={`text-left p-6 sm:p-7 rounded-3xl border transition-all cursor-pointer shadow-sm relative ${
            activeKpiView === 'all_advance_vehicles'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-4 ring-slate-900/20'
              : 'bg-white text-slate-800 border-slate-200/90 hover:border-slate-400 hover:bg-slate-50/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs uppercase font-bold tracking-wider ${
                activeKpiView === 'all_advance_vehicles' ? 'text-slate-300' : 'text-slate-500'
              }`}
            >
              Total Advance (Vehicles)
            </span>
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                activeKpiView === 'all_advance_vehicles'
                  ? 'bg-white/10 text-white'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black mt-3 tracking-tight">
            {totalVehiclesPaidAdvance} Vehicles
          </div>
          <div className="mt-3 pt-3 border-t border-current/10 flex items-center justify-between text-xs">
            <span className={activeKpiView === 'all_advance_vehicles' ? 'text-slate-300' : 'text-slate-500'}>
              {advances.length} advance entries paid
            </span>
            {activeKpiView === 'all_advance_vehicles' ? (
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <span>Active View</span> &rarr;
              </span>
            ) : (
              <span className="text-slate-400 font-semibold">Click to open &rarr;</span>
            )}
          </div>
        </button>

        {/* KPI 2: Total Vehicle Left with Advance (Advance Awaiting Payment) */}
        <button
          type="button"
          onClick={() => setActiveKpiView('left_with_advance')}
          className={`text-left p-6 sm:p-7 rounded-3xl border-2 transition-all cursor-pointer shadow-sm relative ${
            activeKpiView === 'left_with_advance'
              ? 'bg-amber-900 text-white border-amber-900 shadow-md ring-4 ring-amber-600/30'
              : 'bg-white text-slate-800 border-amber-300 hover:border-amber-400 hover:bg-amber-50/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs uppercase font-bold tracking-wider ${
                activeKpiView === 'left_with_advance' ? 'text-amber-200' : 'text-amber-900'
              }`}
            >
              Total Vehicle Left with Advance
            </span>
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                activeKpiView === 'left_with_advance'
                  ? 'bg-amber-700 text-white'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black mt-3 tracking-tight">
            {totalVehiclesLeftWithAdvance} Vehicles
          </div>
          <div className="mt-3 pt-3 border-t border-current/10 flex items-center justify-between text-xs">
            <span className={activeKpiView === 'left_with_advance' ? 'text-amber-200' : 'text-amber-800/80'}>
              Loads booked &bull; Advance pending
            </span>
            {activeKpiView === 'left_with_advance' ? (
              <span className="font-bold text-amber-300 flex items-center gap-1">
                <span>Active View</span> &rarr;
              </span>
            ) : (
              <span className="text-amber-800 font-bold">Click to pay &rarr;</span>
            )}
          </div>
        </button>

        {/* KPI 3: Vehicle Left with Settlement */}
        <button
          type="button"
          onClick={() => setActiveKpiView('left_with_settlement')}
          className={`text-left p-6 sm:p-7 rounded-3xl border-2 transition-all cursor-pointer shadow-sm relative ${
            activeKpiView === 'left_with_settlement'
              ? 'bg-rose-900 text-white border-rose-900 shadow-md ring-4 ring-rose-600/30'
              : 'bg-white text-slate-800 border-rose-300 hover:border-rose-400 hover:bg-rose-50/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs uppercase font-bold tracking-wider ${
                activeKpiView === 'left_with_settlement' ? 'text-rose-200' : 'text-rose-900'
              }`}
            >
              Vehicle Left with Settlement
            </span>
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                activeKpiView === 'left_with_settlement'
                  ? 'bg-rose-700 text-white'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black mt-3 tracking-tight">
            {totalVehiclesLeftWithSettlement} Vehicles
          </div>
          <div className="mt-3 pt-3 border-t border-current/10 flex items-center justify-between text-xs">
            <span className={activeKpiView === 'left_with_settlement' ? 'text-rose-200' : 'text-rose-800/80'}>
              {tripsLeftWithSettlement.length} trips awaiting rest balance
            </span>
            {activeKpiView === 'left_with_settlement' ? (
              <span className="font-bold text-rose-300 flex items-center gap-1">
                <span>Active View</span> &rarr;
              </span>
            ) : (
              <span className="text-rose-800 font-bold">Click to settle &rarr;</span>
            )}
          </div>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search vehicle number (e.g. JH11D0037 or JH11D 0037), company, sender..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 text-sm border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition"
          />
        </div>

        {activeKpiView === 'all_advance_vehicles' && (
          <div className="w-full md:w-auto">
            <select
              value={senderFilter}
              onChange={(e) => setSenderFilter(e.target.value)}
              className="w-full md:w-auto px-4 py-3 text-sm border-2 border-slate-200 rounded-2xl bg-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
            >
              <option value="">All Advance Senders ({senders.length})</option>
              {senders.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SEPARATE INTERFACE 1: TOTAL ADVANCE (VEHICLES PAID ADVANCE)                */}
      {/* ========================================================================= */}
      {activeKpiView === 'all_advance_vehicles' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2.5">
              <Banknote className="w-5 h-5 text-slate-700" />
              <h3 className="text-base font-black text-slate-900">
                All Advance Payments ({filteredAdvances.length} Records across {totalVehiclesPaidAdvance} Vehicles)
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Auto-matched to loads by vehicle number
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-xs">
                  <tr>
                    <th className="py-4 px-5">Vehicle Number</th>
                    <th className="py-4 px-5">Advance Sender</th>
                    <th className="py-4 px-5 text-right">Amount (₹)</th>
                    <th className="py-4 px-5">Payment Date</th>
                    <th className="py-4 px-5 text-center">Auto-Match Status</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAdvances.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No advance payment records found. Click &ldquo;+ Add Advance&rdquo; to record one.
                      </td>
                    </tr>
                  ) : (
                    filteredAdvances.map((adv) => {
                      const hasTrip = vehicleHasLoadSet.has(cleanVehicleKey(adv.vehicleNumber));
                      const isConfirmingDelete = deleteConfirmId === adv.id;

                      return (
                        <tr key={adv.id} className="hover:bg-slate-50/80 transition">
                          {/* Vehicle Number */}
                          <td className="py-4 px-5 font-bold">
                            <button
                              onClick={() => onSelectVehicle(adv.vehicleNumber)}
                              className="font-mono text-emerald-900 hover:text-emerald-700 hover:underline flex items-center gap-2 cursor-pointer text-sm"
                              title="Open Vehicle Ledger"
                            >
                              <Truck className="w-4 h-4 text-slate-400" />
                              <span>{formatVehiclePlate(adv.vehicleNumber)}</span>
                            </button>
                          </td>

                          {/* Advance Sender */}
                          <td className="py-4 px-5 font-semibold text-slate-900">
                            {adv.advanceSender}
                          </td>

                          {/* Amount in Rupees */}
                          <td className="py-4 px-5 text-right font-black text-emerald-800 text-base">
                            ₹{formatCurrency(adv.amount)}
                          </td>

                          {/* Payment Date */}
                          <td className="py-4 px-5 text-slate-600 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-mono text-xs">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{safeDateDisplay(adv.paymentDate)}</span>
                            </div>
                          </td>

                          {/* Matching Status */}
                          <td className="py-4 px-5 text-center">
                            {hasTrip ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-950 border border-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                                Matched to Vehicle
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                Advance Stored (Load Pending)
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            {isConfirmingDelete ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleDelete(adv)}
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
                                <button
                                  onClick={() => onSelectVehicle(adv.vehicleNumber)}
                                  className="px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50 rounded-xl transition cursor-pointer"
                                  title="View Ledger"
                                >
                                  Ledger
                                </button>
                                <button
                                  onClick={() => onEditAdvance(adv)}
                                  className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition cursor-pointer"
                                  title="Edit Advance"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(adv.id)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                                  title="Delete Advance"
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
      {/* SEPARATE INTERFACE 2: TOTAL VEHICLE LEFT WITH ADVANCE                      */}
      {/* STRICTLY VEHICLES WHOSE LOAD IS BOOKED BUT ADVANCE NOT PAID YET!          */}
      {/* ========================================================================= */}
      {activeKpiView === 'left_with_advance' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-amber-700" />
              <h3 className="text-base font-black text-slate-900">
                Vehicles Left with Advance ({filteredTripsLeftWithAdvance.length} Booked Trips &bull; {totalVehiclesLeftWithAdvance} Vehicles Awaiting Advance)
              </h3>
            </div>
            <span className="text-xs text-amber-900 font-bold bg-amber-100 border border-amber-300 px-3 py-1 rounded-full uppercase">
              Load Booked &bull; Advance Payment Pending
            </span>
          </div>

          <div className="bg-white rounded-3xl border-2 border-amber-300 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-amber-50/80 text-amber-950 font-bold border-b border-amber-200 uppercase tracking-wider text-xs">
                  <tr>
                    <th className="py-4 px-5">Vehicle Number</th>
                    <th className="py-4 px-5">Company & Route</th>
                    <th className="py-4 px-5 text-right">Total Freight</th>
                    <th className="py-4 px-5">Booking Date</th>
                    <th className="py-4 px-5 text-center">Advance Status</th>
                    <th className="py-4 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  {filteredTripsLeftWithAdvance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No vehicles currently left awaiting advance. All booked loads have their advance recorded!
                      </td>
                    </tr>
                  ) : (
                    filteredTripsLeftWithAdvance.map((trip) => (
                      <tr key={trip.load.id} className="hover:bg-amber-50/40 transition">
                        <td className="py-4 px-5 font-bold">
                          <button
                            onClick={() => onSelectVehicle(trip.load.vehicleNumber)}
                            className="font-mono text-slate-900 hover:text-amber-800 hover:underline flex items-center gap-2 cursor-pointer text-sm"
                          >
                            <Truck className="w-4 h-4 text-amber-600" />
                            <span>{formatVehiclePlate(trip.load.vehicleNumber)}</span>
                          </button>
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

                        <td className="py-4 px-5 text-right font-black text-slate-900 text-base">
                          ₹{formatCurrency(trip.freight)}
                        </td>

                        <td className="py-4 px-5 font-mono text-xs text-slate-600">
                          {safeDateDisplay(trip.load.bookingDate)}
                        </td>

                        <td className="py-4 px-5 text-center">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300">
                            <Clock className="w-3.5 h-3.5 text-amber-700" />
                            Advance Pending
                          </span>
                        </td>

                        <td className="py-4 px-5 text-right">
                          <button
                            onClick={() => onOpenAddAdvance(trip.load.vehicleNumber)}
                            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer ml-auto"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>+ Pay Advance</span>
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
      {/* SEPARATE INTERFACE 3: VEHICLE LEFT WITH SETTLEMENT                         */}
      {/* STRICTLY VEHICLES WHERE ADVANCE PAID AND REST BALANCE IS DUE!             */}
      {/* ========================================================================= */}
      {activeKpiView === 'left_with_settlement' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-700" />
              <h3 className="text-base font-black text-slate-900">
                Vehicles Left with Settlement ({filteredTripsLeftWithSettlement.length} Active Trips &bull; {totalVehiclesLeftWithSettlement} Vehicles Awaiting Rest Balance)
              </h3>
            </div>
            <span className="text-xs text-rose-900 font-bold bg-rose-100 border border-rose-300 px-3 py-1 rounded-full uppercase">
              Advance Done &bull; Rest Balance Due
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
                  {filteredTripsLeftWithSettlement.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No vehicles currently left with pending rest settlement. All recorded trips are settled!
                      </td>
                    </tr>
                  ) : (
                    filteredTripsLeftWithSettlement.map((trip) => (
                      <tr key={trip.load.id} className="hover:bg-rose-50/40 transition">
                        <td className="py-4 px-5 font-bold">
                          <button
                            onClick={() => onSelectVehicle(trip.load.vehicleNumber)}
                            className="font-mono text-slate-900 hover:text-emerald-800 hover:underline flex items-center gap-2 cursor-pointer text-sm"
                          >
                            <Truck className="w-4 h-4 text-rose-700" />
                            <span>{formatVehiclePlate(trip.load.vehicleNumber)}</span>
                          </button>
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
                              by {trip.advanceSender}
                            </span>
                          )}
                          <span className="text-xs text-slate-400 block font-mono">
                            {safeDateDisplay(trip.advanceDate)}
                          </span>
                        </td>

                        <td className="py-4 px-5 text-right">
                          <div className="text-base font-black text-rose-950">
                            ₹{formatCurrency(trip.restBalanceDue)}
                          </div>
                          <span className="text-xs text-rose-800 font-bold uppercase">
                            Pending Due
                          </span>
                        </td>

                        <td className="py-4 px-5 text-center">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-950 border border-rose-300">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
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
