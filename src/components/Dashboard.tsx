import React, { useState, useMemo } from 'react';
import { TransportLoad, AdvanceRecord, AdminPresence, TripRecord } from '../types';
import { AdminPresenceCard } from './AdminPresenceCard';
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
  Banknote,
  Search,
  PlusCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Building2,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CreditCard,
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
  onSettleRestBalance: (trip: TripRecord) => void;
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
  onSettleRestBalance,
}) => {
  const [vehicleQuery, setVehicleQuery] = useState('');

  // Trip details filter after KPI: 2 options ('pending' or 'completed')
  const [dashboardTripFilter, setDashboardTripFilter] = useState<'pending' | 'completed'>('pending');
  // Max 3 vehicle details initially, then "See More" (+3 each time) or "See Less"
  const [visibleTripCount, setVisibleTripCount] = useState<number>(3);

  // Group all trips across all vehicles to compute exact active pending rest balances & completions
  const allVehicleTrips = useMemo(() => {
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

    const allTripsList: TripRecord[] = [];
    const allKeys = new Set<string>([...loadsByVeh.keys(), ...advancesByVeh.keys()]);
    allKeys.forEach((k) => {
      const vLoads = loadsByVeh.get(k) || [];
      const vAdvances = advancesByVeh.get(k) || [];
      const trips = buildVehicleTrips(vLoads, vAdvances);
      allTripsList.push(...trips);
    });

    return allTripsList;
  }, [loads, advances]);

  // Trips where advance is paid AND rest balance is NOT settled (Action required!)
  const activePendingSettlementTrips = useMemo(() => {
    return allVehicleTrips
      .filter((t) => t.status === 'pending_settlement')
      .sort((a, b) => {
        const dA = a.load.bookingDate || a.load.createdAt;
        const dB = b.load.bookingDate || b.load.createdAt;
        return dB.localeCompare(dA);
      });
  }, [allVehicleTrips]);

  // Trips completed & fully settled (both advance and rest balance settled)
  const completedTrips = useMemo(() => {
    return allVehicleTrips
      .filter((t) => t.status === 'completed')
      .sort((a, b) => {
        const dA = a.restSettledDate || a.load.bookingDate || a.load.createdAt;
        const dB = b.restSettledDate || b.load.bookingDate || b.load.createdAt;
        return dB.localeCompare(dA);
      });
  }, [allVehicleTrips]);

  // =========================================================================
  // STRICT 3 KPIS AS REQUESTED:
  // 1. Total loads
  // 2. Total vehicle left with advance (load booked BUT advance NOT paid yet!)
  // 3. Total vehicle left with settlement (advance paid & rest balance due!)
  // =========================================================================
  const totalLoadsCount = loads.length;

  // 2. Total vehicle left with advance:
  // Vehicles whose load is booked but advance has NOT been paid yet!
  // Once advance is paid, it is NO LONGER left with advance (moves to left with settlement).
  const vehiclesLeftWithAdvanceKeys = useMemo(() => {
    const set = new Set<string>();
    allVehicleTrips.forEach((t) => {
      if (t.status === 'pending_advance') {
        const k = cleanVehicleKey(t.load.vehicleNumber);
        if (k) set.add(k);
      }
    });
    return set;
  }, [allVehicleTrips]);
  const totalVehiclesLeftWithAdvance = vehiclesLeftWithAdvanceKeys.size;

  // 3. Total vehicle left with settlement:
  // Distinct vehicles whose advance has been paid and rest balance is pending/due to be settled!
  const vehiclesLeftWithSettlementKeys = useMemo(() => {
    const set = new Set<string>();
    activePendingSettlementTrips.forEach((t) => {
      const k = cleanVehicleKey(t.load.vehicleNumber);
      if (k) set.add(k);
    });
    return set;
  }, [activePendingSettlementTrips]);
  const totalVehiclesLeftWithSettlement = vehiclesLeftWithSettlementKeys.size;

  const totalPendingRestAmount = activePendingSettlementTrips.reduce(
    (s, t) => s + t.restBalanceDue,
    0
  );

  const handleVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (vehicleQuery.trim()) {
      onSelectVehicle(vehicleQuery.trim().toUpperCase());
    }
  };

  const handleSwitchFilter = (filter: 'pending' | 'completed') => {
    setDashboardTripFilter(filter);
    setVisibleTripCount(3); // Reset to max 3 vehicle details initially
  };

  const handleSeeMore = () => {
    setVisibleTripCount((prev) => prev + 3);
  };

  const handleSeeLess = () => {
    setVisibleTripCount(3);
  };

  // Active list based on 2-filter option
  const activeTripsDisplayList =
    dashboardTripFilter === 'pending' ? activePendingSettlementTrips : completedTrips;
  const visibleTrips = activeTripsDisplayList.slice(0, visibleTripCount);

  const recentLoads = Array.isArray(loads) ? loads.slice(0, 5) : [];
  const recentAdvances = Array.isArray(advances) ? advances.slice(0, 5) : [];

  return (
    <div className="space-y-8">
      {/* 1. Administrator Presence Banner */}
      <AdminPresenceCard presences={presences} currentAdminEmail={currentAdminEmail} />

      {/* 2. Large Prominent Vehicle Search Box */}
      <div className="bg-white rounded-3xl border border-emerald-200/90 p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Search className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                Instant Vehicle Lookup & Ledger
              </h3>
              <p className="text-xs text-slate-500">
                Search any vehicle (e.g. JH11D0037 or JH11D 0037) — case & space insensitive
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-600 self-start sm:self-auto">
            {allVehicleTrips.length} Total Trips Tracked
          </span>
        </div>

        <form onSubmit={handleVehicleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search vehicle number (e.g. JH11D0037 or JH11D 0037)..."
              value={vehicleQuery}
              onChange={(e) => setVehicleQuery(e.target.value.toUpperCase())}
              className="w-full pl-12 pr-4 py-3.5 text-base font-mono uppercase font-black border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition bg-slate-50/50 focus:bg-white"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-sm font-bold shadow-sm hover:shadow transition shrink-0 cursor-pointer flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            <span>Search Vehicle</span>
          </button>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* 3. STRICT 3 KPIS ON OVERALL HOME PAGE OF DASHBOARD AS REQUESTED:           */}
      {/*    1. Total Loads                                                         */}
      {/*    2. Total Vehicle Left with Advance (Advance Awaiting Payment)          */}
      {/*    3. Total Vehicle Left with Settlement (Rest Balance Due)               */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* KPI 1: Total Loads */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Loads
            </span>
            <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center">
              <Truck className="w-5 h-5 text-slate-700" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {totalLoadsCount}
            </div>
            <p className="text-xs font-medium text-slate-500 mt-1">
              All transportation load bookings recorded
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => onNavigateTab('loads')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Open load register</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-semibold text-slate-400">{loads.length} Loads</span>
          </div>
        </div>

        {/* KPI 2: Total Vehicle Left with Advance */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border-2 border-amber-300 bg-amber-50/20 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Total Vehicle Left with Advance
            </span>
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-700" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-black text-amber-950 tracking-tight">
              {totalVehiclesLeftWithAdvance} Vehicles
            </div>
            <p className="text-xs font-medium text-amber-800/80 mt-1">
              Loads booked &bull; Advance payment pending to give
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-amber-200/60 flex items-center justify-between">
            <button
              onClick={() => onNavigateTab('advances')}
              className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Pay advance in register</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900">
              Advance Pending
            </span>
          </div>
        </div>

        {/* KPI 3: Total Vehicle Left with Settlement */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border-2 border-rose-300 bg-rose-50/20 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-900">
              Total Vehicle Left with Settlement
            </span>
            <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-rose-700" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-black text-rose-950 tracking-tight">
              {totalVehiclesLeftWithSettlement} Vehicles
            </div>
            <p className="text-xs font-medium text-rose-800/80 mt-1">
              Advance done &bull; Rest due: <strong>₹{formatCurrency(totalPendingRestAmount)}</strong>
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-rose-200/60 flex items-center justify-between">
            <button
              onClick={() => onNavigateTab('loads')}
              className="text-xs font-bold text-rose-800 hover:text-rose-950 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Review settlements</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-200/80 text-rose-900">
              Action Required
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. AFTER KPI TRIP DETAILS: 2 FILTER OPTIONS (PENDING & COMPLETED)          */}
      {/*    Max 3 vehicle details, then "See More" (+3 each time) or "See Less"    */}
      {/*    With distinct color codes for Pending and Completed!                   */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-6">
        {/* Top bar with 2 Filter Options */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2.5">
              <span>Trip Details & Status Overview</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Select filter to view pending settlement trips or completed and cleared trips
            </p>
          </div>

          {/* 2 FILTER BUTTONS WITH PROMINENT DESIGN */}
          <div className="inline-flex p-1.5 bg-slate-100 rounded-2xl gap-1.5 shrink-0 border border-slate-200/70">
            {/* Filter Option 1: Pending */}
            <button
              type="button"
              onClick={() => handleSwitchFilter('pending')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
                dashboardTripFilter === 'pending'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Pending Settlement ({activePendingSettlementTrips.length})</span>
            </button>

            {/* Filter Option 2: Completed */}
            <button
              type="button"
              onClick={() => handleSwitchFilter('completed')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
                dashboardTripFilter === 'completed'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Completed & Settled ({completedTrips.length})</span>
            </button>
          </div>
        </div>

        {/* Showing indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 px-1">
          <span>
            Showing{' '}
            <strong className="text-slate-900 font-bold">
              {Math.min(visibleTrips.length, activeTripsDisplayList.length)}
            </strong>{' '}
            of <strong className="text-slate-900 font-bold">{activeTripsDisplayList.length}</strong> vehicles in{' '}
            <span className="capitalize font-bold text-slate-800">{dashboardTripFilter}</span> view
          </span>
          {activeTripsDisplayList.length > 3 && (
            <span className="text-xs text-slate-400 font-medium">
              Showing 3 per view &bull; click &ldquo;See More&rdquo; to expand 3 more
            </span>
          )}
        </div>

        {/* Empty state */}
        {activeTripsDisplayList.length === 0 ? (
          <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-400">
            {dashboardTripFilter === 'pending'
              ? 'No trips currently pending rest balance settlement. All recorded trips are settled!'
              : 'No completed trips found yet.'}
          </div>
        ) : (
          /* Trips List with Distinct Color Coding */
          <div className="grid grid-cols-1 gap-4">
            {visibleTrips.map((trip) => {
              const isPending = dashboardTripFilter === 'pending';

              return (
                <div
                  key={trip.load.id}
                  className={`p-5 sm:p-6 rounded-3xl border-2 transition flex flex-col md:flex-row md:items-center justify-between gap-5 ${
                    isPending
                      ? 'border-amber-400 bg-amber-50/40 hover:border-amber-500 shadow-sm'
                      : 'border-emerald-300 bg-emerald-50/30 hover:border-emerald-500 shadow-sm'
                  }`}
                >
                  {/* Left: Vehicle Plate & Trip details */}
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        onClick={() => onSelectVehicle(trip.load.vehicleNumber)}
                        className={`px-3.5 py-1.5 text-white rounded-xl text-sm font-mono font-black tracking-wider shadow-xs cursor-pointer ${
                          isPending ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-900 hover:bg-emerald-950'
                        }`}
                        title="Open Vehicle Ledger"
                      >
                        {formatVehiclePlate(trip.load.vehicleNumber)}
                      </button>

                      <span className="font-black text-slate-900 text-base">
                        {trip.load.loadCompany}
                      </span>

                      {/* Status badge with clear color code */}
                      {isPending ? (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-950 border border-amber-300 flex items-center gap-1.5 uppercase">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                          Pending Rest Balance Due
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 flex items-center gap-1.5 uppercase">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                          Completed & Cleared
                        </span>
                      )}
                    </div>

                    <div className="text-xs sm:text-sm text-slate-600 flex items-center gap-2 flex-wrap">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800">
                        {trip.load.loadingPoint} &rarr; {trip.load.destination}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>Weight: <strong>{formatWeight(trip.load.weight)} MT</strong></span>
                      <span className="text-slate-300">•</span>
                      <span>Booked: {safeDateDisplay(trip.load.bookingDate)}</span>
                    </div>

                    {/* Advance & Settlement Breakdown */}
                    <div className="flex items-center gap-2.5 flex-wrap text-xs sm:text-sm pt-1">
                      {/* Advance info */}
                      <span className="bg-white border border-slate-200/90 px-3 py-1.5 rounded-xl text-slate-800 inline-flex items-center gap-2 shadow-2xs">
                        <Banknote className="w-4 h-4 text-emerald-700" />
                        <span>
                          Advance: <strong className="text-emerald-800 font-bold">₹{formatCurrency(trip.totalAdvances)}</strong>
                        </span>
                        {trip.advanceSender && (
                          <span className="text-slate-600 font-medium">by {trip.advanceSender}</span>
                        )}
                        <span className="text-slate-400 font-mono text-xs">({safeDateDisplay(trip.advanceDate)})</span>
                      </span>

                      {/* If completed, show rest paid details */}
                      {!isPending && (
                        <>
                          <span className="text-slate-400 font-bold text-sm">&rarr;</span>
                          <span className="bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-xl text-teal-900 inline-flex items-center gap-2 shadow-2xs">
                            <ShieldCheck className="w-4 h-4 text-teal-700" />
                            <span>
                              Rest Paid: <strong>₹{formatCurrency(trip.restSettledAmount || trip.restBalanceDue)}</strong>
                            </span>
                            {trip.restSettledPaidBy && (
                              <span className="font-semibold">by {trip.restSettledPaidBy}</span>
                            )}
                            <span className="text-slate-500 font-mono text-xs">({safeDateDisplay(trip.restSettledDate)})</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right side: Financial amount & Action button */}
                  <div className="flex items-center justify-between md:justify-end gap-5 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-current/10">
                    <div className="text-right">
                      {isPending ? (
                        <>
                          <span className="text-xs text-amber-800 uppercase font-black block">
                            Rest Balance Due
                          </span>
                          <span className="text-2xl font-black text-amber-950">
                            ₹{formatCurrency(trip.restBalanceDue)}
                          </span>
                          <span className="text-xs text-slate-500 block">
                            Total Freight: ₹{formatCurrency(trip.freight)}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs text-emerald-800 uppercase font-black block">
                            Total Cleared Freight
                          </span>
                          <span className="text-2xl font-black text-emerald-950">
                            ₹{formatCurrency(trip.freight)}
                          </span>
                          <span className="text-xs text-emerald-600 font-semibold block">
                            Fully Settled
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isPending ? (
                        <button
                          onClick={() => onSettleRestBalance(trip)}
                          className="px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-sm flex items-center gap-2 transition cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Settle Rest</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onSelectVehicle(trip.load.vehicleNumber)}
                          className="px-4 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Ledger &rarr;</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SEE MORE / SEE LESS CONTROLS:
            "max 3 vehicle details then provide see more feature... and every time 3 then see more or see less type feature" */}
        {activeTripsDisplayList.length > 3 && (
          <div className="pt-3 flex items-center justify-center gap-3">
            {visibleTripCount < activeTripsDisplayList.length && (
              <button
                type="button"
                onClick={handleSeeMore}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-sm transition cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
                <span>
                  See More (+3 Vehicles) &bull; {activeTripsDisplayList.length - visibleTripCount} remaining
                </span>
              </button>
            )}

            {visibleTripCount > 3 && (
              <button
                type="button"
                onClick={handleSeeLess}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer"
              >
                <ChevronUp className="w-4 h-4" />
                <span>See Less (Show First 3)</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 5. Side-by-Side: Recent Loads & Recent Advances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Loads */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                <Truck className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Recent Loads
              </h4>
            </div>
            <button
              onClick={onOpenAddLoad}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Load</span>
            </button>
          </div>

          {recentLoads.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No loads recorded yet. Click &ldquo;Add Load&rdquo; to start.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentLoads.map((load) => (
                <div
                  key={load.id}
                  className="p-4 hover:bg-slate-50/70 transition flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <button
                      onClick={() => onSelectVehicle(load.vehicleNumber)}
                      className="font-mono font-bold text-xs sm:text-sm text-emerald-900 hover:underline block cursor-pointer"
                    >
                      {load.vehicleNumber}
                    </button>
                    <div className="text-xs sm:text-sm text-slate-700 font-semibold truncate mt-0.5">
                      {load.loadCompany}
                    </div>
                    <div className="text-xs text-slate-400">
                      {load.loadingPoint} &rarr; {load.destination} • {formatWeight(load.weight)} MT
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs sm:text-sm font-bold text-emerald-800">
                      ₹{formatCurrency(load.calculatedFreight)}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {safeDateDisplay(load.bookingDate)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Advances */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                <Banknote className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Recent Advances
              </h4>
            </div>
            <button
              onClick={onOpenAddAdvance}
              className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Advance</span>
            </button>
          </div>

          {recentAdvances.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No advances logged yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentAdvances.map((adv) => (
                <div
                  key={adv.id}
                  className="p-4 hover:bg-slate-50/70 transition flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <button
                      onClick={() => onSelectVehicle(adv.vehicleNumber)}
                      className="font-mono font-bold text-xs sm:text-sm text-emerald-900 hover:underline block cursor-pointer"
                    >
                      {adv.vehicleNumber}
                    </button>
                    <div className="text-xs sm:text-sm text-slate-700 font-semibold truncate mt-0.5">
                      {adv.advanceSender}
                    </div>
                    <div className="text-xs text-slate-400">
                      {safeDateDisplay(adv.paymentDate)}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs sm:text-sm font-bold text-emerald-800">
                      ₹{formatCurrency(adv.amount)}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Auto-matched
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
