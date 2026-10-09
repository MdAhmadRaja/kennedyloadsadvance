import React, { useState, useMemo } from 'react';
import { AdvanceRecord, TransportLoad } from '../types';
import { deleteAdvance } from '../firebase/firestoreService';
import { formatCurrency } from '../utils/formatUtils';
import {
  Banknote,
  Search,
  PlusCircle,
  Edit2,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Link,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface Props {
  advances: AdvanceRecord[];
  loads: TransportLoad[];
  onOpenAddAdvance: () => void;
  onEditAdvance: (advance: AdvanceRecord) => void;
  onSelectVehicle: (vehicleNumber: string) => void;
  onReviewMatch: (advance: AdvanceRecord, candidateLoads: TransportLoad[]) => void;
}

export const AdvanceRegister: React.FC<Props> = ({
  advances,
  loads,
  onOpenAddAdvance,
  onEditAdvance,
  onSelectVehicle,
  onReviewMatch,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'linked' | 'unmatched' | 'multiple'>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Group loads by vehicle
  const loadsByVehicle = useMemo(() => {
    const map = new Map<string, TransportLoad[]>();
    loads.forEach((l) => {
      const v = l.vehicleNumber;
      const list = map.get(v) || [];
      list.push(l);
      map.set(v, list);
    });
    return map;
  }, [loads]);

  // Map loadId to load details
  const loadsById = useMemo(() => {
    const map = new Map<string, TransportLoad>();
    loads.forEach((l) => map.set(l.id, l));
    return map;
  }, [loads]);

  const filteredAdvances = useMemo(() => {
    return advances.filter((adv) => {
      const matchSearch =
        !searchTerm ||
        adv.advanceSender.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adv.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase());

      let matchStatus = true;
      if (statusFilter === 'linked') {
        matchStatus = adv.matchingStatus === 'auto-linked' || adv.matchingStatus === 'manually-linked';
      } else if (statusFilter === 'unmatched') {
        matchStatus = adv.matchingStatus === 'unmatched';
      } else if (statusFilter === 'multiple') {
        matchStatus = adv.matchingStatus === 'multiple-possible';
      }

      return matchSearch && matchStatus;
    });
  }, [advances, searchTerm, statusFilter]);

  // Aggregate stats
  const totalAmount = filteredAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);
  const unmatchedCount = advances.filter((a) => a.matchingStatus === 'unmatched').length;
  const multipleCount = advances.filter((a) => a.matchingStatus === 'multiple-possible').length;

  const handleDelete = async (adv: AdvanceRecord) => {
    try {
      await deleteAdvance(adv.id, adv.vehicleNumber);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenReview = (adv: AdvanceRecord) => {
    const vehicleLoads = loadsByVehicle.get(adv.vehicleNumber) || [];
    onReviewMatch(adv, vehicleLoads);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-emerald-700" />
            <span>Advance Register</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Record advance payments and track automatic vehicle matching
          </p>
        </div>

        <button
          onClick={onOpenAddAdvance}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Advance</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Total Advances
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {filteredAdvances.length}
            {filteredAdvances.length !== advances.length && (
              <span className="text-xs font-normal text-slate-400 ml-1.5">
                of {advances.length}
              </span>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Total Recorded Amount
          </span>
          <div className="text-2xl font-black text-emerald-800 mt-1">
            ₹{formatCurrency(totalAmount)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Unmatched Advances
          </span>
          <div className={`text-2xl font-black mt-1 ${unmatchedCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
            {unmatchedCount}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Needs Review
          </span>
          <div className={`text-2xl font-black mt-1 ${multipleCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
            {multipleCount}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by sender or vehicle number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'linked', label: 'Linked' },
              { id: 'unmatched', label: 'Unmatched' },
              { id: 'multiple', label: 'Multiple Possible' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === tab.id
                  ? 'bg-emerald-100/70 text-emerald-900 border border-emerald-300'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advances Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Advance Sender</th>
                <th className="py-3 px-4">Vehicle Number</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4">Matching Status</th>
                <th className="py-3 px-4">Matched Load Info</th>
                <th className="py-3 px-4">Added By</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAdvances.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No advances found. Click "+ Add New Advance" to record a payment.
                  </td>
                </tr>
              ) : (
                filteredAdvances.map((adv) => {
                  const matchedLoad = adv.matchedLoadId ? loadsById.get(adv.matchedLoadId) : null;
                  const isConfirmingDelete = deleteConfirmId === adv.id;

                  return (
                    <tr
                      key={adv.id}
                      className="hover:bg-slate-50/70 transition group"
                    >
                      {/* Sender */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{adv.advanceSender}</div>
                      </td>

                      {/* Vehicle Number */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => onSelectVehicle(adv.vehicleNumber)}
                          className="font-mono font-bold text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-1.5"
                          title="Click to view all records for this vehicle"
                        >
                          <span>{adv.vehicleNumber}</span>
                          <ArrowRight className="w-3 h-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition" />
                        </button>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-black text-sm text-emerald-800">
                          ₹{formatCurrency(adv.amount)}
                        </span>
                      </td>

                      {/* Payment Date */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{adv.paymentDate}</span>
                        </div>
                      </td>

                      {/* Matching Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {adv.matchingStatus === 'auto-linked' && (
                          <button
                            onClick={() => handleOpenReview(adv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition"
                            title="Auto-linked by vehicle number. Click to review or adjust."
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Auto-Linked</span>
                          </button>
                        )}

                        {adv.matchingStatus === 'manually-linked' && (
                          <button
                            onClick={() => handleOpenReview(adv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 hover:bg-blue-200 transition"
                            title="Manually matched by administrator. Click to review."
                          >
                            <CheckCircle2 className="w-3 h-3 text-blue-600" />
                            <span>Linked</span>
                          </button>
                        )}

                        {adv.matchingStatus === 'multiple-possible' && (
                          <button
                            onClick={() => handleOpenReview(adv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200 transition animate-pulse"
                            title="Multiple loads found for this vehicle. Click to pick the right trip."
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Multiple Found (Pick)</span>
                          </button>
                        )}

                        {adv.matchingStatus === 'unmatched' && (
                          <button
                            onClick={() => handleOpenReview(adv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                            title="No load found for this vehicle yet. Click to check."
                          >
                            <HelpCircle className="w-3 h-3 text-slate-400" />
                            <span>Unmatched</span>
                          </button>
                        )}
                      </td>

                      {/* Matched Load Info */}
                      <td className="py-3 px-4 text-[11px] text-slate-600 max-w-[200px] truncate">
                        {matchedLoad ? (
                          <div title={`${matchedLoad.loadCompany} (${matchedLoad.loadingPoint} -> ${matchedLoad.destination})`}>
                            <span className="font-semibold text-slate-800 block truncate">
                              {matchedLoad.loadCompany}
                            </span>
                            <span className="text-[10px] text-slate-500 truncate block">
                              {matchedLoad.loadingPoint} &rarr; {matchedLoad.destination} (₹
                              {matchedLoad.calculatedFreight.toLocaleString('en-IN')})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No trip connected</span>
                        )}
                      </td>

                      {/* Added By & Date */}
                      <td className="py-3 px-4 text-[11px] text-slate-500">
                        <div className="font-medium text-slate-700">
                          {adv.createdByEmail.split('@')[0]}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {adv.createdAt ? adv.createdAt.split('T')[0] : ''}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isConfirmingDelete ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleDelete(adv)}
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
                              onClick={() => handleOpenReview(adv)}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                              title="Connect / Change Load Match"
                            >
                              <Link className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onEditAdvance(adv)}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                              title="Edit Advance"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(adv.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Advance"
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
