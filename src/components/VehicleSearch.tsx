import React, { useState, useMemo } from 'react';
import { TransportLoad, AdvanceRecord } from '../types';
import { normalizeVehicleNumber } from '../firebase/firestoreService';
import { formatCurrency, formatWeight } from '../utils/formatUtils';
import {
  Search,
  Truck,
  Banknote,
  Calendar,
  Building2,
  MapPin,
  Phone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  PlusCircle,
  Printer,
  Calculator,
  User,
  ArrowRight,
} from 'lucide-react';

interface Props {
  loads: TransportLoad[];
  advances: AdvanceRecord[];
  initialVehicleNumber?: string;
  onOpenAddLoadForVehicle: (vehicleNumber: string) => void;
  onOpenAddAdvanceForVehicle: (vehicleNumber: string) => void;
  onEditLoad: (load: TransportLoad) => void;
  onEditAdvance: (advance: AdvanceRecord) => void;
}

export const VehicleSearch: React.FC<Props> = ({
  loads,
  advances,
  initialVehicleNumber = '',
  onOpenAddLoadForVehicle,
  onOpenAddAdvanceForVehicle,
  onEditLoad,
  onEditAdvance,
}) => {
  const [searchInput, setSearchInput] = useState(initialVehicleNumber);
  const [selectedVehicle, setSelectedVehicle] = useState(initialVehicleNumber);

  // List of all unique vehicle numbers in system
  const allVehicleNumbers = useMemo(() => {
    const set = new Set<string>();
    loads.forEach((l) => set.add(l.vehicleNumber));
    advances.forEach((a) => set.add(a.vehicleNumber));
    return Array.from(set).sort();
  }, [loads, advances]);

  // Handle search submission
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchInput.trim()) return;
    setSelectedVehicle(normalizeVehicleNumber(searchInput));
  };

  const handleSelectVehicle = (veh: string) => {
    setSearchInput(veh);
    setSelectedVehicle(veh);
  };

  // Filter loads and advances for currently selected vehicle
  const currentVehicleLoads = useMemo(() => {
    if (!selectedVehicle) return [];
    return loads.filter((l) => l.vehicleNumber === selectedVehicle);
  }, [loads, selectedVehicle]);

  const currentVehicleAdvances = useMemo(() => {
    if (!selectedVehicle) return [];
    return advances.filter((a) => a.vehicleNumber === selectedVehicle);
  }, [advances, selectedVehicle]);

  // Financial calculations for this vehicle
  const totalFreight = currentVehicleLoads.reduce((sum, l) => sum + (l.calculatedFreight || 0), 0);
  const totalAdvances = currentVehicleAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);
  const netBalance = totalFreight - totalAdvances;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Search className="w-5 h-5 text-emerald-700" />
            <span>Vehicle Search & Single-Page Ledger</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Search any vehicle to see all trips, advances, matching status, and total balance
          </p>
        </div>

        {selectedVehicle && (
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-2xs transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Ledger</span>
            </button>
            <button
              onClick={() => onOpenAddLoadForVehicle(selectedVehicle)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Load</span>
            </button>
            <button
              onClick={() => onOpenAddAdvanceForVehicle(selectedVehicle)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold rounded-lg shadow-2xs transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Advance</span>
            </button>
          </div>
        )}
      </div>

      {/* Large Prominent Vehicle Search Box */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Enter Vehicle Number (e.g. MH 12 AB 1234)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
              className="w-full pl-12 pr-4 py-3 text-base font-mono uppercase font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-2xs"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold rounded-xl shadow-xs transition shrink-0"
          >
            Search Vehicle
          </button>
        </form>

        {/* Quick Click Badges for Registered Vehicles */}
        {allVehicleNumbers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Recent Vehicles in System:
            </span>
            <div className="flex flex-wrap gap-2">
              {allVehicleNumbers.slice(0, 10).map((v) => (
                <button
                  key={v}
                  onClick={() => handleSelectVehicle(v)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition ${
                    selectedVehicle === v
                      ? 'bg-emerald-700 text-white ring-2 ring-emerald-600'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* When No Vehicle is Selected Yet */}
      {!selectedVehicle && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No Vehicle Selected</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Type a vehicle number above or click one of the recent vehicle badges to inspect all
            loads, advances, and financial totals on a single page.
          </p>
        </div>
      )}

      {/* Selected Vehicle Ledger View */}
      {selectedVehicle && (
        <div className="space-y-6">
          {/* Vehicle Financial Summary Banner */}
          <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 rounded-2xl p-6 text-white shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-emerald-200 font-semibold block">
                  Vehicle Ledger Account
                </span>
                <h3 className="text-3xl font-black font-mono tracking-tight mt-0.5">
                  {selectedVehicle}
                </h3>
                <p className="text-xs text-emerald-100/80 mt-1">
                  Recorded Trips: {currentVehicleLoads.length} | Advance Payments: {currentVehicleAdvances.length}
                </p>
              </div>

              {/* Financial KPI Grid */}
              <div className="grid grid-cols-3 gap-4 bg-emerald-950/40 p-4 rounded-xl border border-emerald-700/60">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-200 block">
                    Total Freight
                  </span>
                  <div className="text-lg font-black text-white mt-0.5">
                    ₹{formatCurrency(totalFreight)}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-200 block">
                    Total Advances
                  </span>
                  <div className="text-lg font-black text-emerald-200 mt-0.5">
                    ₹{formatCurrency(totalAdvances)}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-200 block">
                    Net Balance
                  </span>
                  <div className={`text-lg font-black mt-0.5 ${netBalance >= 0 ? 'text-amber-300' : 'text-rose-300'}`}>
                    ₹{formatCurrency(netBalance)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 1. All Load Details for this Vehicle */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-700" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Recorded Loads for {selectedVehicle} ({currentVehicleLoads.length})
                </h4>
              </div>
              <button
                onClick={() => onOpenAddLoadForVehicle(selectedVehicle)}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Add Load for this vehicle</span>
              </button>
            </div>

            {currentVehicleLoads.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No loads recorded for vehicle {selectedVehicle} yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Booking Date</th>
                      <th className="py-2.5 px-4">Company</th>
                      <th className="py-2.5 px-4">Route</th>
                      <th className="py-2.5 px-4">Driver Contact</th>
                      <th className="py-2.5 px-4 text-right">Weight (MT)</th>
                      <th className="py-2.5 px-4 text-right">Rate</th>
                      <th className="py-2.5 px-4 text-right">Freight (₹)</th>
                      <th className="py-2.5 px-4">Added By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentVehicleLoads.map((load) => (
                      <tr key={load.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 whitespace-nowrap font-medium text-slate-700">
                          {load.bookingDate}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">
                          {load.loadCompany}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">
                          {load.loadingPoint} &rarr; {load.destination}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">
                          {load.driverContact || '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium text-slate-800">
                          {formatWeight(load.weight)} MT
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-700">
                          ₹{formatCurrency(load.rate)} ({load.rateUnit})
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-emerald-800">
                          ₹{formatCurrency(load.calculatedFreight)}
                        </td>
                        <td className="py-2.5 px-4 text-[11px] text-slate-500">
                          <div>{load.createdByEmail.split('@')[0]}</div>
                          <div className="text-[10px] text-slate-400">
                            {load.createdAt ? load.createdAt.split('T')[0] : ''}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 2. All Advance Details for this Vehicle */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-700" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Recorded Advances for {selectedVehicle} ({currentVehicleAdvances.length})
                </h4>
              </div>
              <button
                onClick={() => onOpenAddAdvanceForVehicle(selectedVehicle)}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Add Advance for this vehicle</span>
              </button>
            </div>

            {currentVehicleAdvances.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No advances recorded for vehicle {selectedVehicle} yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Payment Date</th>
                      <th className="py-2.5 px-4">Advance Sender</th>
                      <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                      <th className="py-2.5 px-4">Matching Status</th>
                      <th className="py-2.5 px-4">Added By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentVehicleAdvances.map((adv) => (
                      <tr key={adv.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 whitespace-nowrap font-medium text-slate-700">
                          {adv.paymentDate}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">
                          {adv.advanceSender}
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-emerald-800">
                          ₹{formatCurrency(adv.amount)}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              adv.matchingStatus === 'auto-linked' || adv.matchingStatus === 'manually-linked'
                                ? 'bg-emerald-100 text-emerald-800'
                                : adv.matchingStatus === 'multiple-possible'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {adv.matchingStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-[11px] text-slate-500">
                          <div>{adv.createdByEmail.split('@')[0]}</div>
                          <div className="text-[10px] text-slate-400">
                            {adv.createdAt ? adv.createdAt.split('T')[0] : ''}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
