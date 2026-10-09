import React, { useState, useEffect } from 'react';
import { AdvanceRecord, TransportLoad } from '../types';
import { createAdvance, updateAdvance, normalizeVehicleNumber } from '../firebase/firestoreService';
import { X, Banknote, Check, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editAdvance?: AdvanceRecord | null;
  onAdvanceSaved?: () => void;
  prefillVehicleNumber?: string;
  onShowMatchReview?: (advance: AdvanceRecord, candidateLoads: TransportLoad[]) => void;
}

export const AddAdvanceModal: React.FC<Props> = ({
  isOpen,
  onClose,
  editAdvance,
  onAdvanceSaved,
  prefillVehicleNumber,
  onShowMatchReview,
}) => {
  // Exactly four fields
  const [advanceSender, setAdvanceSender] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editAdvance) {
      setAdvanceSender(editAdvance.advanceSender);
      setVehicleNumber(editAdvance.vehicleNumber);
      setAmount(editAdvance.amount.toString());
      setPaymentDate(editAdvance.paymentDate);
    } else {
      setAdvanceSender('');
      setVehicleNumber(prefillVehicleNumber || '');
      setAmount('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
    }
    setError(null);
  }, [editAdvance, isOpen, prefillVehicleNumber]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceSender.trim()) {
      setError('Advance sender is required (e.g. Samir Dad).');
      return;
    }
    if (!vehicleNumber.trim()) {
      setError('Vehicle number is required.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please provide a valid amount in rupees.');
      return;
    }
    if (!paymentDate) {
      setError('Payment date is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editAdvance) {
        await updateAdvance(editAdvance.id, {
          advanceSender: advanceSender.trim(),
          vehicleNumber: normalizeVehicleNumber(vehicleNumber),
          amount: numAmount,
          paymentDate,
        });
        if (onAdvanceSaved) onAdvanceSaved();
        onClose();
      } else {
        const result = await createAdvance({
          advanceSender: advanceSender.trim(),
          vehicleNumber: normalizeVehicleNumber(vehicleNumber),
          amount: numAmount,
          paymentDate,
        });

        if (onAdvanceSaved) onAdvanceSaved();
        onClose();

        // If multiple loads exist for this vehicle, prompt match review screen immediately!
        if (result.multipleCandidates && result.multipleCandidates.length > 1 && onShowMatchReview) {
          onShowMatchReview(result.advance, result.multipleCandidates);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save advance payment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-emerald-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700/80 flex items-center justify-center">
              <Banknote className="w-4 h-4 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {editAdvance ? 'Edit Advance Payment' : 'Record Advance Payment'}
              </h3>
              <p className="text-xs text-emerald-200">
                Kennedy Trailer Services — Quick Advance Entry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-emerald-700 text-emerald-200 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4-Field Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Advance Sender */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              1. Advance Sender <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Samir Dad, Owner, Dispatch Desk"
              value={advanceSender}
              onChange={(e) => setAdvanceSender(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          {/* 2. Vehicle Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              2. Vehicle Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. MH 12 AB 1234"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 text-sm font-mono uppercase font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Advances automatically link to loads for this vehicle.
            </p>
          </div>

          {/* 3. Amount in Rupees */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              3. Amount in Rupees <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-xs font-bold text-slate-500 pointer-events-none">
                ₹
              </span>
              <input
                type="number"
                step="1"
                min="1"
                required
                placeholder="10000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-semibold"
              />
            </div>
          </div>

          {/* 4. Payment Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              4. Payment Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition disabled:opacity-60"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{editAdvance ? 'Update Advance' : 'Save Advance'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
