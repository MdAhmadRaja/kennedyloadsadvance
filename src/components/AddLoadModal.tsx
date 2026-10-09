import React, { useState, useEffect } from 'react';
import { TransportLoad, RateUnit } from '../types';
import { createLoad, updateLoad, calculateFreight, normalizeVehicleNumber } from '../firebase/firestoreService';
import { X, Truck, Check, AlertCircle, Calculator } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editLoad?: TransportLoad | null;
  onLoadSaved?: () => void;
  prefillVehicleNumber?: string;
}

export const AddLoadModal: React.FC<Props> = ({
  isOpen,
  onClose,
  editLoad,
  onLoadSaved,
  prefillVehicleNumber,
}) => {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverContact, setDriverContact] = useState('');
  const [loadCompany, setLoadCompany] = useState('');
  const [loadingPoint, setLoadingPoint] = useState('');
  const [destination, setDestination] = useState('');
  const [weight, setWeight] = useState<string>('');
  const [rate, setRate] = useState<string>('');
  const [rateUnit, setRateUnit] = useState<RateUnit>('Per MT');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  useEffect(() => {
    if (editLoad) {
      setVehicleNumber(editLoad.vehicleNumber);
      setDriverContact(editLoad.driverContact || '');
      setLoadCompany(editLoad.loadCompany);
      setLoadingPoint(editLoad.loadingPoint);
      setDestination(editLoad.destination);
      setWeight(editLoad.weight.toString());
      setRate(editLoad.rate.toString());
      setRateUnit(editLoad.rateUnit);
      setBookingDate(editLoad.bookingDate);
    } else {
      setVehicleNumber(prefillVehicleNumber || '');
      setDriverContact('');
      setLoadCompany('');
      setLoadingPoint('');
      setDestination('');
      setWeight('');
      setRate('');
      setRateUnit('Per MT');
      setBookingDate(new Date().toISOString().split('T')[0]);
    }
    setError(null);
    setSuccessInfo(null);
  }, [editLoad, isOpen, prefillVehicleNumber]);

  if (!isOpen) return null;

  // Live calculation of freight
  const numWeight = parseFloat(weight) || 0;
  const numRate = parseFloat(rate) || 0;
  const liveFreight = calculateFreight(numWeight, numRate, rateUnit);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNumber.trim()) {
      setError('Vehicle number is required.');
      return;
    }
    if (!loadCompany.trim()) {
      setError('Load company is required.');
      return;
    }
    if (!loadingPoint.trim() || !destination.trim()) {
      setError('Both loading point and destination are required.');
      return;
    }
    if (isNaN(numWeight) || numWeight <= 0) {
      setError('Please provide a valid weight in MT.');
      return;
    }
    if (isNaN(numRate) || numRate <= 0) {
      setError('Please enter a valid rate in rupees.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editLoad) {
        await updateLoad(editLoad.id, {
          vehicleNumber: normalizeVehicleNumber(vehicleNumber),
          driverContact: driverContact.trim() || undefined,
          loadCompany: loadCompany.trim(),
          loadingPoint: loadingPoint.trim(),
          destination: destination.trim(),
          weight: numWeight,
          rate: numRate,
          rateUnit,
          bookingDate,
        });
        if (onLoadSaved) onLoadSaved();
        onClose();
      } else {
        const res = await createLoad({
          vehicleNumber: normalizeVehicleNumber(vehicleNumber),
          driverContact: driverContact.trim() || undefined,
          loadCompany: loadCompany.trim(),
          loadingPoint: loadingPoint.trim(),
          destination: destination.trim(),
          weight: numWeight,
          rate: numRate,
          rateUnit,
          bookingDate,
        });

        if (res.linkedAdvancesCount > 0) {
          setSuccessInfo(`Load saved! Automatically linked with ${res.linkedAdvancesCount} existing advance record.`);
          setTimeout(() => {
            if (onLoadSaved) onLoadSaved();
            onClose();
          }, 1500);
        } else {
          if (onLoadSaved) onLoadSaved();
          onClose();
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save load record. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-emerald-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700/80 flex items-center justify-center">
              <Truck className="w-4 h-4 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {editLoad ? 'Edit Load Record' : 'Add New Transport Load'}
              </h3>
              <p className="text-xs text-emerald-200">
                Kennedy Trailer Services — Essential Trip Entry
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successInfo && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successInfo}</span>
            </div>
          )}

          {/* 1. Vehicle Number & 2. Driver Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vehicle Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MH 12 AB 1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-sm font-mono uppercase font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Driver Contact <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 9876543210"
                value={driverContact}
                onChange={(e) => setDriverContact(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* 3. Load Company */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Load Company <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Jindal Steel, Tata Metaliks, ACC Cement"
              value={loadCompany}
              onChange={(e) => setLoadCompany(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          {/* 4. Loading Point & 5. Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Loading Point <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Raipur, CG"
                value={loadingPoint}
                onChange={(e) => setLoadingPoint(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Destination <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mumbai, MH"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* 6. Weight & 7. Rate & 8. Rate Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Weight (MT) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  required
                  placeholder="35.50"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
                <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-slate-500 pointer-events-none">
                  MT
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rate in Rupees <span className="text-rose-500">*</span>
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
                  placeholder="1250"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rate Unit <span className="text-rose-500">*</span>
              </label>
              <select
                value={rateUnit}
                onChange={(e) => setRateUnit(e.target.value as RateUnit)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
              >
                <option value="Per MT">Per MT</option>
                <option value="Per Trip">Per Trip</option>
                <option value="Not Specified">Not Specified</option>
              </select>
            </div>
          </div>

          {/* 9. Booking Date & Live Calculated Freight Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Booking Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Calculated Freight Banner */}
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-700" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
                    Calculated Freight
                  </span>
                  <span className="text-xs text-slate-500">
                    {rateUnit === 'Per MT' ? `${numWeight} MT × ₹${numRate}` : rateUnit}
                  </span>
                </div>
              </div>
              <div className="text-base font-extrabold text-emerald-800">
                ₹{liveFreight.toLocaleString('en-IN')}
              </div>
            </div>
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
                  <span>Saving Load...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{editLoad ? 'Update Load' : 'Save Load'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
