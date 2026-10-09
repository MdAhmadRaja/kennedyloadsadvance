import React, { useState, useMemo } from 'react';
import { TransportLoad, AdvanceRecord } from '../types';
import { deleteLoad } from '../firebase/firestoreService';
import { formatCurrency, formatWeight } from '../utils/formatUtils';
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
} from 'lucide-react';

interface Props {
  loads: TransportLoad[];
  advances: AdvanceRecord[];
  onOpenAddLoad: () => void;
  onEditLoad: (load: TransportLoad) => void;
  onSelectVehicle: (vehicleNumber: string) => void;
}

export const LoadRegister: React.FC<Props> = ({
  loads,
  advances,
  onOpenAddLoad,
  onEditLoad,
  onSelectVehicle,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Unique companies for filter
  const companies = useMemo(() => {
    const set = new Set<string>();
    loads.forEach((l) => {
      if (l.loadCompany) set.add(l.loadCompany);
    });
    return Array.from(set).sort();
  }, [loads]);

  const filteredLoads = useMemo(() => {
    return loads.filter((load) => {
      const matchSearch =
        !searchTerm ||
        load.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        load.loadCompany.toLowerCase().includes(searchTerm.toLowerCase()) ||
        load.loadingPoint.toLowerCase().includes(searchTerm.toLowerCase()) ||
        load.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (load.driverContact && load.driverContact.includes(searchTerm));

      const matchCompany = !companyFilter || load.loadCompany === companyFilter;

      return matchSearch && matchCompany;
    });
  }, [loads, searchTerm, companyFilter]);

  // Aggregate stats
  const totalTonnage = filteredLoads.reduce((sum, l) => sum + (l.weight || 0), 0);
  const totalFreight = filteredLoads.reduce((sum, l) => sum + (l.calculatedFreight || 0), 0);

  // Map loads to their linked advances
  const advancesByLoadId = useMemo(() => {
    const map = new Map<string, AdvanceRecord[]>();
    advances.forEach((adv) => {
      if (adv.matchedLoadId) {
        const list = map.get(adv.matchedLoadId) || [];
        list.push(adv);
        map.set(adv.matchedLoadId, list);
      }
    });
    return map;
  }, [advances]);

  const handleDelete = async (load: TransportLoad) => {
    try {
      await deleteLoad(load.id, load.vehicleNumber);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-700" />
            <span>Load Register</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Record and review transport trips, weights, rates, and freight
          </p>
        </div>

        <button
          onClick={onOpenAddLoad}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Load</span>
        </button>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Total Loads
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {filteredLoads.length}
            {filteredLoads.length !== loads.length && (
              <span className="text-xs font-normal text-slate-400 ml-1.5">
                of {loads.length}
              </span>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Total Tonnage
          </span>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {formatWeight(totalTonnage)}
            <span className="text-xs font-bold text-slate-500 ml-1">MT</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Calculated Freight
          </span>
          <div className="text-2xl font-black text-emerald-800 mt-1">
            ₹{formatCurrency(totalFreight)}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by vehicle number, company, loading point, or destination..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
        </div>

        {companies.length > 0 && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white w-full md:w-48"
            >
              <option value="">All Companies</option>
              {companies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}

        {(searchTerm || companyFilter) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setCompanyFilter('');
            }}
            className="text-xs text-emerald-700 hover:underline shrink-0"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Loads Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Vehicle Number</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4 text-right">Weight (MT)</th>
                <th className="py-3 px-4 text-right">Rate</th>
                <th className="py-3 px-4 text-right">Freight (₹)</th>
                <th className="py-3 px-4">Booking Date</th>
                <th className="py-3 px-4">Linked Advances</th>
                <th className="py-3 px-4">Added By</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLoads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 text-xs">
                    No loads found. Click "+ Add New Load" to create the first record.
                  </td>
                </tr>
              ) : (
                filteredLoads.map((load) => {
                  const linkedAdv = advancesByLoadId.get(load.id) || [];
                  const linkedTotal = linkedAdv.reduce((s, a) => s + (a.amount || 0), 0);
                  const isConfirmingDelete = deleteConfirmId === load.id;

                  return (
                    <tr
                      key={load.id}
                      className="hover:bg-slate-50/70 transition group"
                    >
                      {/* Vehicle Number */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => onSelectVehicle(load.vehicleNumber)}
                          className="font-mono font-bold text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-1.5"
                          title="Click to view all records for this vehicle"
                        >
                          <span>{load.vehicleNumber}</span>
                          <ArrowRight className="w-3 h-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition" />
                        </button>
                        {load.driverContact && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                            <Phone className="w-2.5 h-2.5" />
                            <span>{load.driverContact}</span>
                          </div>
                        )}
                      </td>

                      {/* Company */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{load.loadCompany}</div>
                      </td>

                      {/* Route */}
                      <td className="py-3 px-4 text-slate-700">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{load.loadingPoint}</span>
                          <span className="text-slate-400">&rarr;</span>
                          <span className="font-medium">{load.destination}</span>
                        </div>
                      </td>

                      {/* Weight */}
                      <td className="py-3 px-4 text-right font-medium text-slate-800">
                        {load.weight} MT
                      </td>

                      {/* Rate */}
                      <td className="py-3 px-4 text-right text-slate-700">
                        <div>₹{formatCurrency(load.rate)}</div>
                        <span className="text-[10px] text-slate-400">{load.rateUnit}</span>
                      </td>

                      {/* Freight */}
                      <td className="py-3 px-4 text-right font-bold text-emerald-800">
                        ₹{formatCurrency(load.calculatedFreight)}
                      </td>

                      {/* Booking Date */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{load.bookingDate}</span>
                        </div>
                      </td>

                      {/* Linked Advances */}
                      <td className="py-3 px-4">
                        {linkedAdv.length > 0 ? (
                          <div>
                            <span className="font-semibold text-emerald-700">
                              ₹{formatCurrency(linkedTotal)}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              ({linkedAdv.length} advance{linkedAdv.length > 1 ? 's' : ''})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">None</span>
                        )}
                      </td>

                      {/* Added By & Date */}
                      <td className="py-3 px-4 text-[11px] text-slate-500">
                        <div className="font-medium text-slate-700">
                          {load.createdByEmail.split('@')[0]}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {load.createdAt ? load.createdAt.split('T')[0] : ''}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isConfirmingDelete ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleDelete(load)}
                              className="px-2 py-1 bg-rose-600 text-white rounded text-[10px] font-bold hover:bg-rose-700"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[10px] hover:bg-slate-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onEditLoad(load)}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                              title="Edit Load"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(load.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Load"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
  );
};
