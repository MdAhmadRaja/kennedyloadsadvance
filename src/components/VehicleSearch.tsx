import React, { useState, useMemo } from 'react';
import { TransportLoad, AdvanceRecord, TripRecord } from '../types';
import {
  cleanVehicleKey,
  formatCurrency,
  formatWeight,
  safeEmailDisplay,
  safeDateDisplay,
  formatVehiclePlate,
} from '../utils/formatUtils';
import { buildVehicleTrips } from '../utils/tripUtils';
import {
  Search,
  Truck,
  Banknote,
  Calendar,
  Building2,
  MapPin,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  ChevronRight,
  PlusCircle,
  ShieldCheck,
  ArrowRight,
  Info,
  X,
  FileText,
  UserCheck,
} from 'lucide-react';

interface Props {
  loads: TransportLoad[];
  advances: AdvanceRecord[];
  initialVehicleNumber?: string;
  onOpenAddLoadForVehicle: (vehicleNumber: string) => void;
  onOpenAddAdvanceForVehicle: (vehicleNumber: string) => void;
  onSettleRestBalance: (trip: TripRecord) => void;
  onEditLoad?: (load: TransportLoad) => void;
  onEditAdvance?: (adv: AdvanceRecord) => void;
}

export const VehicleSearch: React.FC<Props> = ({
  loads = [],
  advances = [],
  initialVehicleNumber = '',
  onOpenAddLoadForVehicle,
  onOpenAddAdvanceForVehicle,
  onSettleRestBalance,
  onEditLoad,
  onEditAdvance,
}) => {
  const [searchInput, setSearchInput] = useState(initialVehicleNumber);
  const [selectedTripDetails, setSelectedTripDetails] = useState<TripRecord | null>(null);

  // Group all trips across all vehicles automatically
  const allTripsAcrossFleet = useMemo(() => {
    // 1. Group loads by cleanVehicleKey
    const loadsByVeh = new Map<string, TransportLoad[]>();
    (loads || []).forEach((l) => {
      const k = cleanVehicleKey(l.vehicleNumber);
      if (k) {
        const list = loadsByVeh.get(k) || [];
        list.push(l);
        loadsByVeh.set(k, list);
      }
    });

    // 2. Group advances by cleanVehicleKey
    const advancesByVeh = new Map<string, AdvanceRecord[]>();
    (advances || []).forEach((a) => {
      const k = cleanVehicleKey(a.vehicleNumber);
      if (k) {
        const list = advancesByVeh.get(k) || [];
        list.push(a);
        advancesByVeh.set(k, list);
      }
    });

    // 3. Build trips for each unique vehicle key
    const allKeys = new Set<string>([...loadsByVeh.keys(), ...advancesByVeh.keys()]);
    const trips: TripRecord[] = [];

    allKeys.forEach((key) => {
      const vLoads = loadsByVeh.get(key) || [];
      const vAdvances = advancesByVeh.get(key) || [];
      const vTrips = buildVehicleTrips(vLoads, vAdvances);
      trips.push(...vTrips);
    });

    return trips;
  }, [loads, advances]);

  // Unique registered vehicles list
  const uniqueVehicles = useMemo(() => {
    const map = new Map<string, string>();
    (loads || []).forEach((l) => {
      const k = cleanVehicleKey(l.vehicleNumber);
      if (k && !map.has(k)) map.set(k, l.vehicleNumber);
    });
    (advances || []).forEach((a) => {
      const k = cleanVehicleKey(a.vehicleNumber);
      if (k && !map.has(k)) map.set(k, a.vehicleNumber);
    });
    return Array.from(map.entries()).map(([key, display]) => ({ key, display }));
  }, [loads, advances]);

  // Filter trips based on search input (case-insensitive, space-insensitive, partial matching)
  const filteredTrips = useMemo(() => {
    const rawTerm = (searchInput || '').trim();
    if (!rawTerm) return allTripsAcrossFleet;

    const cleanTerm = cleanVehicleKey(rawTerm);
    const lowerTerm = rawTerm.toLowerCase();

    return allTripsAcrossFleet.filter((trip) => {
      const vNum = trip.load.vehicleNumber || '';
      const vClean = cleanVehicleKey(vNum);

      // Match vehicle number (handles 'JH11D0037' === 'JH11D 0037' === 'jh11d0037')
      if (cleanTerm && vClean.includes(cleanTerm)) return true;
      if (vNum.toLowerCase().includes(lowerTerm)) return true;

      // Match company, route, sender
      if ((trip.load.loadCompany || '').toLowerCase().includes(lowerTerm)) return true;
      if ((trip.load.loadingPoint || '').toLowerCase().includes(lowerTerm)) return true;
      if ((trip.load.destination || '').toLowerCase().includes(lowerTerm)) return true;
      if (trip.advances.some((a) => (a.advanceSender || '').toLowerCase().includes(lowerTerm))) return true;

      return false;
    });
  }, [allTripsAcrossFleet, searchInput]);

  // CATEGORIZATION AS SPECIFIED BY USER:
  // 1. TOP SECTION: Advance Done & Rest Balance NOT Done (High Priority Action)
  const pendingSettlementTrips = useMemo(() => {
    return filteredTrips
      .filter((t) => t.status === 'pending_settlement')
      .sort((a, b) => {
        const dA = a.load.bookingDate || a.load.createdAt;
        const dB = b.load.bookingDate || b.load.createdAt;
        return dB.localeCompare(dA);
      });
  }, [filteredTrips]);

  // 2. BELOW SECTION: Rest All Completed (Both advance and rest balance settled)
  const completedTrips = useMemo(() => {
    return filteredTrips
      .filter((t) => t.status === 'completed')
      .sort((a, b) => {
        const dA = a.restSettledDate || a.load.bookingDate || a.load.createdAt;
        const dB = b.restSettledDate || b.load.bookingDate || b.load.createdAt;
        return dB.localeCompare(dA);
      });
  }, [filteredTrips]);

  // 3. OPTIONAL SECTION: Loads booked with advance still pending
  const pendingAdvanceTrips = useMemo(() => {
    return filteredTrips
      .filter((t) => t.status === 'pending_advance')
      .sort((a, b) => {
        const dA = a.load.bookingDate || a.load.createdAt;
        const dB = b.load.bookingDate || b.load.createdAt;
        return dB.localeCompare(dA);
      });
  }, [filteredTrips]);

  // Section KPIs
  const totalPendingRestDue = pendingSettlementTrips.reduce((s, t) => s + t.restBalanceDue, 0);
  const totalCompletedSettled = completedTrips.reduce((s, t) => s + t.restSettledAmount, 0);
  const totalAdvancesFiltered = filteredTrips.reduce((s, t) => s + t.totalAdvances, 0);
  const totalFreightFiltered = filteredTrips.reduce((s, t) => s + t.freight, 0);

  const handleSelectBadge = (display: string) => {
    setSearchInput(display);
  };

  const handleClearSearch = () => {
    setSearchInput('');
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Search className="w-5 h-5 text-emerald-700" />
            <span>Vehicle Search & Rest Balance Ledger</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-matched vehicle accounts: Pending settlements on top, completed records below.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenAddLoadForVehicle(searchInput)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Load</span>
          </button>
          <button
            onClick={() => onOpenAddAdvanceForVehicle(searchInput)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold rounded-lg shadow-2xs transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Advance</span>
          </button>
        </div>
      </div>

      {/* 2. Large Search Bar (Case-insensitive & Space-insensitive) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Type vehicle number (e.g. JH11D0037 or JH11D 0037), company, route..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-12 pr-12 py-3.5 text-base sm:text-lg font-mono uppercase font-black border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none shadow-2xs transition bg-slate-50/50 focus:bg-white"
          />
          {searchInput && (
            <button
              onClick={handleClearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition cursor-pointer"
              title="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Quick Vehicle Badges */}
        {uniqueVehicles.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Registered Vehicles ({uniqueVehicles.length}):
              </span>
              {searchInput && (
                <button
                  onClick={handleClearSearch}
                  className="text-xs text-emerald-700 hover:underline font-bold cursor-pointer"
                >
                  Show All Vehicles
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {uniqueVehicles.slice(0, 16).map(({ key, display }) => {
                const isSelected =
                  cleanVehicleKey(searchInput) === key ||
                  searchInput.toUpperCase().trim() === display.toUpperCase().trim();
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectBadge(display)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-mono font-bold transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-600'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {display}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. STRICT 4 KPIS FOR SEARCHED VEHICLE ONLY */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm">
        {/* KPI 1: Total Load of that searched vehicle */}
        <div>
          <span className="text-xs uppercase font-bold text-slate-500 block">
            Total Load
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            {filteredTrips.length} {filteredTrips.length === 1 ? 'Trip' : 'Trips'}
          </div>
          <span className="text-xs text-slate-500 font-mono font-bold mt-1 block">
            {cleanVehicleKey(searchInput) ? formatVehiclePlate(searchInput) : 'All Vehicles'}
          </span>
        </div>

        {/* KPI 2: Total Completed of that vehicle (trips) */}
        <div className="border-l border-slate-100 pl-4">
          <span className="text-xs uppercase font-bold text-emerald-700 block">
            Total Completed (Trips)
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-900 mt-1">
            {completedTrips.length} Trips
          </div>
          <span className="text-xs text-emerald-700 font-bold mt-1 block">
            ₹{formatCurrency(totalCompletedSettled)} Settled
          </span>
        </div>

        {/* KPI 3: Pending of that (trip) */}
        <div className="border-l border-slate-100 pl-4">
          <span className="text-xs uppercase font-bold text-amber-700 block">
            Pending Trips
          </span>
          <div className="text-2xl sm:text-3xl font-black text-amber-900 mt-1">
            {pendingSettlementTrips.length + pendingAdvanceTrips.length} Trips
          </div>
          <span className="text-xs text-amber-800 font-bold mt-1 block">
            {pendingSettlementTrips.length} Awaiting Rest Balance
          </span>
        </div>

        {/* KPI 4: Pending Amount for that vehicle only */}
        <div className="border-l border-slate-100 pl-4">
          <span className="text-xs uppercase font-bold text-rose-700 block">
            Pending Amount
          </span>
          <div className="text-2xl sm:text-3xl font-black text-rose-950 mt-1">
            ₹{formatCurrency(totalPendingRestDue)}
          </div>
          <span className="text-xs text-rose-800 font-black mt-1 block">
            Rest Due for Vehicle
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. SECTION 1 (TOP): ADVANCE DONE & REST BALANCE NOT DONE (STRICTLY ON TOP) */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Pending Rest Balance (Advance Done • Rest Balance Due)
            </h3>
          </div>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
            {pendingSettlementTrips.length} Trips • ₹{formatCurrency(totalPendingRestDue)} Due
          </span>
        </div>

        {pendingSettlementTrips.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-amber-200 p-6 text-center text-xs text-slate-400">
            No pending settlements found. All advances with loads have had their rest balance settled!
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {pendingSettlementTrips.map((trip) => (
              <div
                key={trip.load.id}
                onClick={() => setSelectedTripDetails(trip)}
                className="bg-white rounded-2xl border-2 border-amber-300 hover:border-amber-400 p-4 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Vehicle Plate & Route */}
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="px-3 py-1 bg-amber-500 text-white rounded-lg text-sm font-mono font-black tracking-wider shadow-2xs">
                      {formatVehiclePlate(trip.load.vehicleNumber)}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {trip.load.loadCompany}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 uppercase">
                      Action Required: Settle Rest
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 flex items-center gap-1.5 flex-wrap">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {trip.load.loadingPoint} &rarr; {trip.load.destination}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>Booked: {safeDateDisplay(trip.load.bookingDate)}</span>
                    {trip.load.driverContact && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span>Driver: {trip.load.driverContact}</span>
                      </>
                    )}
                  </div>

                  {/* Advance details pill */}
                  <div className="text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg inline-flex items-center gap-2">
                    <Banknote className="w-3.5 h-3.5 text-emerald-700" />
                    <span>
                      Advance Paid: <strong className="font-bold">₹{formatCurrency(trip.totalAdvances)}</strong>
                    </span>
                    <span className="text-slate-400">•</span>
                    <span>Date: {safeDateDisplay(trip.advanceDate)}</span>
                    {trip.advanceSender && (
                      <>
                        <span className="text-slate-400">•</span>
                        <span>Sender: {trip.advanceSender}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Freight Math & Settle Action */}
                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-amber-100">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Total Freight: ₹{formatCurrency(trip.freight)}
                    </span>
                    <span className="text-[10px] text-amber-800 uppercase font-black block">
                      Rest Balance Due
                    </span>
                    <span className="text-xl font-black text-amber-950">
                      ₹{formatCurrency(trip.restBalanceDue)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSettleRestBalance(trip);
                      }}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition shrink-0"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Settle Rest</span>
                    </button>
                    <div className="p-2 text-slate-400 hover:text-slate-700 rounded-lg">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. SECTION 2 (BELOW): COMPLETED & SETTLED TRIPS (ALL DETAILS SHOWN)       */}
      {/* ========================================================================= */}
      <div className="space-y-3 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Completed Trips (Both Advance & Rest Balance Settled)
            </h3>
          </div>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
            {completedTrips.length} Completed • ₹{formatCurrency(totalCompletedSettled)} Settled
          </span>
        </div>

        {completedTrips.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
            No completed trips match the current search.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {completedTrips.map((trip) => (
              <div
                key={trip.load.id}
                onClick={() => setSelectedTripDetails(trip)}
                className="bg-emerald-50/20 rounded-2xl border-2 border-emerald-300 hover:border-emerald-500 p-4 shadow-2xs hover:shadow-xs transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Plate & Trip info */}
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="px-2.5 py-1 bg-emerald-900 text-white rounded-lg text-xs font-mono font-bold tracking-wider shadow-2xs">
                      {formatVehiclePlate(trip.load.vehicleNumber)}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {trip.load.loadCompany}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-700" />
                      Completed & Settled
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 flex items-center gap-1.5 flex-wrap">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {trip.load.loadingPoint} &rarr; {trip.load.destination}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>Booked: {safeDateDisplay(trip.load.bookingDate)}</span>
                    <span className="text-slate-300">•</span>
                    <span>Freight: ₹{formatCurrency(trip.freight)}</span>
                  </div>

                  {/* Advance Date & Rest Date Comparison Badges with Member Names */}
                  <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
                    <span className="bg-emerald-50 text-emerald-900 border border-emerald-200/80 px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1.5">
                      <Banknote className="w-3.5 h-3.5 text-emerald-700" />
                      <span>
                        Advance: <strong>₹{formatCurrency(trip.totalAdvances)}</strong>
                      </span>
                      {trip.advanceSender ? (
                        <span className="font-bold text-emerald-950">
                          • Paid by: <span className="underline decoration-emerald-400">{trip.advanceSender}</span>
                        </span>
                      ) : null}
                      <span className="text-slate-500 font-mono">({safeDateDisplay(trip.advanceDate)})</span>
                    </span>

                    <span className="text-slate-400 font-bold">&rarr;</span>

                    <span className="bg-teal-50 text-teal-900 border border-teal-200/80 px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                      <span>
                        Rest Paid: <strong>₹{formatCurrency(trip.restSettledAmount || trip.restBalanceDue)}</strong>
                      </span>
                      {trip.restSettledPaidBy ? (
                        <span className="font-bold text-teal-950">
                          • Settled by: <span className="underline decoration-teal-400">{trip.restSettledPaidBy}</span>
                        </span>
                      ) : null}
                      <span className="text-slate-500 font-mono">({safeDateDisplay(trip.restSettledDate)})</span>
                    </span>
                  </div>
                </div>

                {/* Right: Settle Review & Click for details */}
                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Total Cleared
                    </span>
                    <span className="text-base font-black text-emerald-800">
                      ₹{formatCurrency(trip.freight)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSettleRestBalance(trip);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                    >
                      View Settle
                    </button>
                    <div className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. SECTION 3 (OPTIONAL): PENDING ADVANCE (LOAD BOOKED, ADVANCE PENDING)    */}
      {/* ========================================================================= */}
      {pendingAdvanceTrips.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">
                Pending Advance ({pendingAdvanceTrips.length} Loads Booked Without Advance)
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pendingAdvanceTrips.map((trip) => (
              <div
                key={trip.load.id}
                onClick={() => setSelectedTripDetails(trip)}
                className="bg-white rounded-xl border border-slate-200 p-3.5 hover:border-slate-300 transition cursor-pointer flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-mono font-bold text-xs text-slate-900">
                    {formatVehiclePlate(trip.load.vehicleNumber)} • {trip.load.loadCompany}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {trip.load.loadingPoint} &rarr; {trip.load.destination} (
                    {safeDateDisplay(trip.load.bookingDate)})
                  </div>
                  <div className="text-xs font-bold text-slate-800 mt-1">
                    Freight: ₹{formatCurrency(trip.freight)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAddAdvanceForVehicle(trip.load.vehicleNumber);
                  }}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg shrink-0"
                >
                  + Add Advance
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. DETAILED TRIP & VEHICLE LEDGER MODAL (ON CLICKING ANY TRIP)             */}
      {/* ========================================================================= */}
      {selectedTripDetails && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-emerald-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-800 border border-emerald-700 flex items-center justify-center">
                  <Truck className="w-6 h-6 text-emerald-100" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-300 block">
                    Kennedy Trailer Services — Trip Ledger
                  </span>
                  <h3 className="text-xl font-mono font-black tracking-wider">
                    {formatVehiclePlate(selectedTripDetails.load.vehicleNumber)}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-800 rounded-lg transition"
                  title="Print Slip"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTripDetails(null)}
                  className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-800 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Complete, Easy-to-Understand Lifecycle */}
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Status Header Badge */}
              <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Lifecycle Status
                  </span>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {selectedTripDetails.status === 'completed' && (
                      <span className="text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Trip Completed & Settled
                      </span>
                    )}
                    {selectedTripDetails.status === 'pending_settlement' && (
                      <span className="text-amber-700 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        Destination Reached • Rest Balance Due
                      </span>
                    )}
                    {selectedTripDetails.status === 'pending_advance' && (
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        Load Booked • Advance Awaiting
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Load Company
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {selectedTripDetails.load.loadCompany}
                  </span>
                </div>
              </div>

              {/* Step 1: Trip & Freight Details */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-white text-[11px] font-bold flex items-center justify-center">
                    1
                  </span>
                  <span>Trip Booking & Freight</span>
                </h4>

                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block">
                      Route
                    </span>
                    <span className="font-bold text-slate-800">
                      {selectedTripDetails.load.loadingPoint} &rarr; {selectedTripDetails.load.destination}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block">
                      Booking Date
                    </span>
                    <span className="font-bold text-slate-800 font-mono">
                      {safeDateDisplay(selectedTripDetails.load.bookingDate)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block">
                      Driver Contact
                    </span>
                    <span className="font-bold text-slate-800">
                      {selectedTripDetails.load.driverContact || 'Not recorded'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block">
                      Weight (MT)
                    </span>
                    <span className="font-bold text-slate-800">
                      {formatWeight(selectedTripDetails.load.weight)} MT
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block">
                      Rate
                    </span>
                    <span className="font-bold text-slate-800">
                      ₹{formatCurrency(selectedTripDetails.load.rate)} ({selectedTripDetails.load.rateUnit})
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block">
                      Total Freight
                    </span>
                    <span className="font-black text-emerald-800 text-sm">
                      ₹{formatCurrency(selectedTripDetails.freight)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 2: Advance Payment Details */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center">
                    2
                  </span>
                  <span>Advance Payment (Auto-Matched by Vehicle)</span>
                </h4>

                {selectedTripDetails.advances.length === 0 ? (
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-dashed border-slate-200 text-xs text-slate-500 flex items-center justify-between">
                    <span>No advance has been recorded for this trip.</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTripDetails(null);
                        onOpenAddAdvanceForVehicle(selectedTripDetails.load.vehicleNumber);
                      }}
                      className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold"
                    >
                      + Add Advance Now
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedTripDetails.advances.map((adv) => (
                      <div
                        key={adv.id}
                        className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-emerald-950 text-sm">
                            ₹{formatCurrency(adv.amount)}
                          </span>
                          <span className="text-slate-500 block text-[11px]">
                            Sender: <strong>{adv.advanceSender}</strong> • Paid on{' '}
                            <span className="font-mono">{safeDateDisplay(adv.paymentDate)}</span>
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Auto-Linked
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 3: Destination Reached & Rest Balance Settlement */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[11px] font-bold flex items-center justify-center">
                    3
                  </span>
                  <span>Destination Reached & Rest Balance (Final Settlement)</span>
                </h4>

                <div
                  className={`rounded-xl p-4 border text-xs space-y-2 ${
                    selectedTripDetails.isRestSettled
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-amber-50 border-amber-300'
                  }`}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-semibold block">
                        Settlement Status
                      </span>
                      <span
                        className={`font-black ${
                          selectedTripDetails.isRestSettled ? 'text-emerald-800' : 'text-amber-900'
                        }`}
                      >
                        {selectedTripDetails.isRestSettled ? 'Settled & Cleared' : 'Pending Payment'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-semibold block">
                        Rest Amount
                      </span>
                      <span className="font-black text-sm text-slate-900">
                        ₹
                        {formatCurrency(
                          selectedTripDetails.isRestSettled
                            ? selectedTripDetails.restSettledAmount
                            : selectedTripDetails.restBalanceDue
                        )}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-semibold block">
                        Date of Rest Balance
                      </span>
                      <span className="font-bold text-slate-800 font-mono">
                        {safeDateDisplay(selectedTripDetails.restSettledDate)}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-semibold block">
                        Who Paid Rest Balance
                      </span>
                      <span className="font-bold text-slate-800">
                        {selectedTripDetails.restSettledPaidBy || (selectedTripDetails.isRestSettled ? 'Admin' : 'Pending')}
                      </span>
                    </div>

                    {selectedTripDetails.load.restBalanceNotes && (
                      <div className="col-span-2">
                        <span className="text-slate-500 text-[10px] uppercase font-semibold block">
                          Notes / Remarks
                        </span>
                        <span className="text-slate-700">
                          {selectedTripDetails.load.restBalanceNotes}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Financial Calculation Balance Box */}
              <div className="bg-slate-900 text-white rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2">
                  Trip Financial Equation
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total Freight</span>
                    <span className="font-bold text-base text-white">
                      ₹{formatCurrency(selectedTripDetails.freight)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">- Advances</span>
                    <span className="font-bold text-base text-emerald-400">
                      ₹{formatCurrency(selectedTripDetails.totalAdvances)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">= Rest Balance</span>
                    <span
                      className={`font-black text-base ${
                        selectedTripDetails.isRestSettled ? 'text-teal-400' : 'text-amber-400'
                      }`}
                    >
                      ₹{formatCurrency(selectedTripDetails.restBalanceDue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedTripDetails(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {onEditLoad && (
                  <button
                    type="button"
                    onClick={() => {
                      const l = selectedTripDetails.load;
                      setSelectedTripDetails(null);
                      onEditLoad(l);
                    }}
                    className="px-3.5 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition"
                  >
                    Edit Load
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const t = selectedTripDetails;
                    setSelectedTripDetails(null);
                    onSettleRestBalance(t);
                  }}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {selectedTripDetails.isRestSettled
                      ? 'Review Settlement'
                      : 'Settle Rest Balance Now'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
