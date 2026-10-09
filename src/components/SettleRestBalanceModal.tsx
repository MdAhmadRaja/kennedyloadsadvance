import React, { useState, useEffect } from 'react';
import { TripRecord } from '../types';
import { settleRestBalance, reopenRestBalance } from '../firebase/firestoreService';
import { formatCurrency, safeDateDisplay } from '../utils/formatUtils';
import { X, CheckCircle2, RotateCcw, AlertCircle, Building2, MapPin, Calendar, Banknote, ShieldCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  trip: TripRecord | null;
  onSettled?: () => void;
}

export const SettleRestBalanceModal: React.FC<Props> = ({
  isOpen,
  onClose,
  trip,
  onSettled,
}) => {
  const [settledAmount, setSettledAmount] = useState<string>('');
  const [settledDate, setSettledDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (trip) {
      // Pre-fill rest balance amount: default to exact rest balance due
      const due = trip.isRestSettled
        ? trip.restSettledAmount
        : Math.max(0, trip.freight - trip.totalAdvances);

      setSettledAmount(String(due));
      setSettledDate(trip.restSettledDate || new Date().toISOString().split('T')[0]);
      setPaidBy(trip.restSettledPaidBy || 'Receiver / Dispatch Desk');
      setNotes(trip.load.restBalanceNotes || '');
    }
    setError(null);
  }, [trip, isOpen]);

  if (!isOpen || !trip) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(settledAmount);
    if (isNaN(numAmount) || numAmount < 0) {
      setError('Please provide a valid rest balance amount in rupees.');
      return;
    }
    if (!paidBy.trim()) {
      setError('Please specify who paid the rest balance.');
      return;
    }
    if (!settledDate) {
      setError('Please select the date when rest balance was paid.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await settleRestBalance(trip.load.id, {
        settledAmount: numAmount,
        settledDate,
        paidBy: paidBy.trim(),
        vehicleNumber: trip.load.vehicleNumber,
        notes,
      });

      if (onSettled) onSettled();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to settle rest balance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReopen = async () => {
    if (!window.confirm('Are you sure you want to reopen this trip and mark rest balance as pending?')) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await reopenRestBalance(trip.load.id, trip.load.vehicleNumber);
      if (onSettled) onSettled();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to reopen trip.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-emerald-800 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base leading-tight">
              {trip.isRestSettled ? 'Rest Balance Settlement Details' : 'Settle Rest Balance (Final Payment)'}
            </h3>
            <p className="text-xs text-emerald-200">
              Vehicle: <span className="font-mono font-bold text-white">{trip.load.vehicleNumber}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-emerald-700 text-emerald-200 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Trip Summary Card (Auto-fetched from vehicle) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>{trip.load.loadCompany}</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Booked: {safeDateDisplay(trip.load.bookingDate)}
              </span>
            </div>

            <div className="text-xs text-slate-600 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {trip.load.loadingPoint} &rarr; {trip.load.destination}
              </span>
              <span className="text-slate-400 mx-1">•</span>
              <span>{trip.load.weight} MT</span>
            </div>

            {/* Financial Calculation Breakdown */}
            <div className="pt-2 border-t border-slate-200/80 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Total Freight
                </span>
                <span className="font-bold text-slate-800">₹{formatCurrency(trip.freight)}</span>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Advance Paid
                </span>
                <span className="font-bold text-emerald-700">
                  ₹{formatCurrency(trip.totalAdvances)}
                </span>
                {trip.advanceDate && (
                  <span className="text-[9px] text-slate-400 block">{trip.advanceDate}</span>
                )}
              </div>

              <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                <span className="text-[10px] text-amber-800 uppercase font-bold block">
                  Rest Balance Due
                </span>
                <span className="font-black text-amber-900">
                  ₹{formatCurrency(trip.restBalanceDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Form Fields: Rest Balance settlement details */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Rest Balance Paid in Rupees <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-xs font-bold text-slate-500 pointer-events-none">
                ₹
              </span>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={settledAmount}
                onChange={(e) => setSettledAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 text-sm font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date of Rest Balance <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={settledDate}
                onChange={(e) => setSettledDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Who Paid Rest Balance <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Receiver, Dispatch, Samir Dad"
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes / Destination Arrival Remarks <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Unloaded safely, vehicle ready for return"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            {trip.isRestSettled ? (
              <button
                type="button"
                onClick={handleReopen}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reopen / Mark Pending</span>
              </button>
            ) : (
              <span className="text-[11px] text-amber-700 font-medium">
                Destination reached & rest balance settled
              </span>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition disabled:opacity-60"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{trip.isRestSettled ? 'Update Settlement' : 'Confirm Settlement'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
