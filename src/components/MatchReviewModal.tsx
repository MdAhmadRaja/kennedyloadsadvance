import React, { useState } from 'react';
import { AdvanceRecord, TransportLoad } from '../types';
import { linkAdvanceToLoad, unlinkAdvance } from '../firebase/firestoreService';
import { formatCurrency } from '../utils/formatUtils';
import { X, CheckCircle2, Unlink, AlertTriangle, ArrowRight, Calendar, Building2, MapPin } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  advance: AdvanceRecord | null;
  loadsForVehicle: TransportLoad[];
  onMatched?: () => void;
}

export const MatchReviewModal: React.FC<Props> = ({
  isOpen,
  onClose,
  advance,
  loadsForVehicle,
  onMatched,
}) => {
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !advance) return null;

  const handleSelectLoad = async (loadId: string) => {
    setSubmitting(true);
    try {
      await linkAdvanceToLoad(advance.id, loadId, advance.vehicleNumber);
      if (onMatched) onMatched();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlink = async () => {
    setSubmitting(true);
    try {
      await unlinkAdvance(advance.id, advance.vehicleNumber);
      if (onMatched) onMatched();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-emerald-800 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base leading-tight">Match Advance to Load</h3>
            <p className="text-xs text-emerald-200">
              Vehicle: <span className="font-mono font-bold text-white">{advance.vehicleNumber}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-emerald-700 text-emerald-200 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Advance Summary Badge */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
                Advance Details
              </span>
              <p className="text-xs font-semibold text-slate-800">
                Sender: <span className="font-normal text-slate-700">{advance.advanceSender}</span>
              </p>
              <p className="text-xs text-slate-500">Date: {advance.paymentDate}</p>
            </div>
            <div className="text-right">
              <span className="text-lg font-extrabold text-emerald-800">
                ₹{formatCurrency(advance.amount)}
              </span>
              <span className="block text-[11px] text-emerald-700 font-medium">
                {advance.matchingStatus}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Available Loads for {advance.vehicleNumber} ({loadsForVehicle.length})
              </h4>
              <span className="text-[11px] text-slate-400">Select one to link</span>
            </div>

            {loadsForVehicle.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs">
                No loads registered yet for vehicle {advance.vehicleNumber}. When a load is added later,
                this advance can be connected automatically.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {loadsForVehicle.map((load) => {
                  const isCurrentMatch = advance.matchedLoadId === load.id;
                  return (
                    <div
                      key={load.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isCurrentMatch
                          ? 'border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500'
                          : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 mb-0.5">
                            <Building2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span className="truncate">{load.loadCompany}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mb-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              {load.loadingPoint} &rarr; {load.destination}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {load.bookingDate}
                            </span>
                            <span>•</span>
                            <span>{load.weight} MT</span>
                            <span>•</span>
                            <span className="font-semibold text-emerald-800">
                              Freight: ₹{formatCurrency(load.calculatedFreight)}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isCurrentMatch ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-700 text-white text-[11px] font-semibold rounded-lg">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Linked
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSelectLoad(load.id)}
                              disabled={submitting}
                              className="px-3 py-1.5 bg-white border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold rounded-lg shadow-2xs transition"
                            >
                              Link Trip
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            {advance.matchedLoadId ? (
              <button
                type="button"
                onClick={handleUnlink}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-semibold"
              >
                <Unlink className="w-3.5 h-3.5" />
                <span>Remove Link (Mark Unmatched)</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-400">Currently unmatched</span>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
