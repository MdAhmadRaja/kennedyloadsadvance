import React, { useState, useEffect, useMemo } from 'react';
import { TransportLoad, AdvanceRecord, RateUnit } from '../types';
import {
  createLoad,
  updateLoad,
  settleRestBalance,
  calculateFreight,
  normalizeVehicleNumber,
} from '../firebase/firestoreService';
import {
  cleanVehicleKey,
  formatCurrency,
  formatVehiclePlate,
  safeDateDisplay,
} from '../utils/formatUtils';
import { buildVehicleTrips } from '../utils/tripUtils';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Truck,
  Check,
  AlertCircle,
  Calculator,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editLoad?: TransportLoad | null;
  onLoadSaved?: () => void;
  prefillVehicleNumber?: string;
  loads?: TransportLoad[];
  advances?: AdvanceRecord[];
}

export const AddLoadModal: React.FC<Props> = ({
  isOpen,
  onClose,
  editLoad,
  onLoadSaved,
  prefillVehicleNumber = '',
  loads = [],
  advances = [],
}) => {
  const { currentUser } = useAuth();
  const currentAdminName = currentUser?.email ? currentUser.email.split('@')[0] : 'Dispatch Desk';

  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverContact, setDriverContact] = useState('');
  const [loadCompany, setLoadCompany] = useState('');
  const [loadingPoint, setLoadingPoint] = useState('');
  const [destination, setDestination] = useState('');
  const [weight, setWeight] = useState<string>('');
  const [rate, setRate] = useState<string>('');
  const [rateUnit, setRateUnit] = useState<RateUnit>('Per MT');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);

  // Previous Trip Return & Rest Balance Settlement State
  const [settlePreviousTrip, setSettlePreviousTrip] = useState<boolean>(true);
  const [prevRestAmount, setPrevRestAmount] = useState<string>('');
  const [prevRestPaidBy, setPrevRestPaidBy] = useState<string>(currentAdminName);
  const [prevRestDate, setPrevRestDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [prevRestNotes, setPrevRestNotes] = useState<string>('Settled on destination return before new trip');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  // Initialize form
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

  // Detect previous trip for this vehicle
  const currentCleanKey = useMemo(() => cleanVehicleKey(vehicleNumber), [vehicleNumber]);

  const previousTripInfo = useMemo(() => {
    if (!currentCleanKey || editLoad) return null;

    // Filter loads for this vehicle excluding currently edited load
    const vehicleLoads = loads.filter(
      (l) => cleanVehicleKey(l.vehicleNumber) === currentCleanKey
    );
    if (vehicleLoads.length === 0) return null;

    const vehicleAdvances = advances.filter(
      (a) => cleanVehicleKey(a.vehicleNumber) === currentCleanKey
    );

    const trips = buildVehicleTrips(vehicleLoads, vehicleAdvances);
    if (trips.length === 0) return null;

    // Find the most recent previous trip
    const latestTrip = trips[trips.length - 1];
    return latestTrip;
  }, [currentCleanKey, loads, advances, editLoad]);

  // When previous trip is detected, auto-populate settlement details
  useEffect(() => {
    if (previousTripInfo && !previousTripInfo.isRestSettled) {
      setPrevRestAmount(String(previousTripInfo.restBalanceDue));
      setPrevRestPaidBy(currentAdminName);
      setPrevRestDate(new Date().toISOString().split('T')[0]);
      setPrevRestNotes('Settled on destination return before new load');
      setSettlePreviousTrip(true);
    }
  }, [previousTripInfo, currentAdminName]);

  // Auto-fill from previous history (driver contact, recent company)
  const handleFetchPreviousHistory = () => {
    if (!previousTripInfo) return;
    if (previousTripInfo.load.driverContact && !driverContact) {
      setDriverContact(previousTripInfo.load.driverContact);
    }
    if (previousTripInfo.load.loadCompany && !loadCompany) {
      setLoadCompany(previousTripInfo.load.loadCompany);
    }
  };

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
      // 1. If previous trip has pending rest balance and user chose to settle it:
      if (
        !editLoad &&
        previousTripInfo &&
        !previousTripInfo.isRestSettled &&
        settlePreviousTrip
      ) {
        const parsedPrevAmount = parseFloat(prevRestAmount) || previousTripInfo.restBalanceDue;
        await settleRestBalance(previousTripInfo.load.id, {
          settledAmount: parsedPrevAmount,
          settledDate: prevRestDate,
          paidBy: prevRestPaidBy.trim() || currentAdminName,
          vehicleNumber: previousTripInfo.load.vehicleNumber,
          notes: prevRestNotes,
        });
      }

      // 2. Save or update the current load
      if (editLoad) {
        await updateLoad(editLoad.id, {
          vehicleNumber: vehicleNumber.trim().toUpperCase(),
          driverContact: driverContact.trim() || undefined,
          loadCompany: loadCompany.trim(),
          loadingPoint: loadingPoint.trim(),
          destination: destination.trim(),
          weight: numWeight,
          rate: numRate,
          rateUnit,
          bookingDate,
        });
      } else {
        await createLoad({
          vehicleNumber: vehicleNumber.trim().toUpperCase(),
          driverContact: driverContact.trim() || undefined,
          loadCompany: loadCompany.trim(),
          loadingPoint: loadingPoint.trim(),
          destination: destination.trim(),
          weight: numWeight,
          rate: numRate,
          rateUnit,
          bookingDate,
        });
      }

      setSuccessInfo('Load saved successfully!');
      setTimeout(() => {
        if (onLoadSaved) onLoadSaved();
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err?.message || 'Failed to save load record. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-emerald-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700/80 flex items-center justify-center">
              <Truck className="w-4 h-4 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {editLoad ? 'Edit Transport Load' : 'Add New Transport Load'}
              </h3>
              <p className="text-xs text-emerald-200">
                Kennedy Trailer Services — Enter load trip details
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
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

          {/* PREVIOUS TRIP RETURN & REST BALANCE NOTICE */}
          {!editLoad && previousTripInfo && (
            <div
              className={`p-4 rounded-xl border transition ${
                !previousTripInfo.isRestSettled
                  ? 'bg-amber-50/70 border-amber-300 text-amber-950'
                  : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      Previous Trip History Detected: {formatVehiclePlate(previousTripInfo.load.vehicleNumber)}
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Route: {previousTripInfo.load.loadingPoint} &rarr; {previousTripInfo.load.destination} (
                      {safeDateDisplay(previousTripInfo.load.bookingDate)}) • Freight: ₹
                      {formatCurrency(previousTripInfo.freight)} • Advance Paid: ₹
                      {formatCurrency(previousTripInfo.totalAdvances)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleFetchPreviousHistory}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 shrink-0"
                >
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Fetch Details</span>
                </button>
              </div>

              {/* If rest balance of previous trip was NOT settled */}
              {!previousTripInfo.isRestSettled && (
                <div className="mt-3 pt-3 border-t border-amber-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-amber-900">
                        Vehicle returned for new load — Pending Rest Balance: ₹
                        {formatCurrency(previousTripInfo.restBalanceDue)}
                      </span>
                      <p className="text-[11px] text-amber-800">
                        Settle previous trip now to keep trips separated with zero overlap.
                      </p>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-amber-300 shadow-2xs">
                      <input
                        type="checkbox"
                        checked={settlePreviousTrip}
                        onChange={(e) => setSettlePreviousTrip(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Settle Previous Trip
                      </span>
                    </label>
                  </div>

                  {settlePreviousTrip && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white p-3 rounded-xl border border-amber-200">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                          Amount Settled (₹)
                        </label>
                        <input
                          type="number"
                          value={prevRestAmount}
                          onChange={(e) => setPrevRestAmount(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                          Who Paid Rest Balance
                        </label>
                        <input
                          type="text"
                          value={prevRestPaidBy}
                          onChange={(e) => setPrevRestPaidBy(e.target.value)}
                          placeholder="e.g. Samir Dad / Dispatch"
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                          Settlement Date
                        </label>
                        <input
                          type="date"
                          value={prevRestDate}
                          onChange={(e) => setPrevRestDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {previousTripInfo.isRestSettled && (
                <div className="mt-2 text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>
                    Previous trip rest balance of ₹
                    {formatCurrency(previousTripInfo.restSettledAmount)} was already settled on{' '}
                    {safeDateDisplay(previousTripInfo.restSettledDate)}.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ROW 1: Vehicle Number & Driver Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  1. Vehicle Number <span className="text-rose-500">*</span>
                </label>
                {previousTripInfo && (
                  <button
                    type="button"
                    onClick={handleFetchPreviousHistory}
                    className="text-[11px] text-emerald-700 hover:underline font-semibold flex items-center gap-0.5"
                  >
                    <Sparkles className="w-3 h-3" />
                    Auto-fill
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                placeholder="e.g. JH11D0037 or JH11D 0037"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-sm font-mono uppercase font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Normalized automatically: JH11D0037 and JH11D 0037 match identically
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                2. Driver Contact <span className="text-slate-400 text-[10px]">(Optional)</span>
              </label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={driverContact}
                onChange={(e) => setDriverContact(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* ROW 2: Load Company */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              3. Load Company <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Tata Steel, Ultratech Cement, Jindal"
              value={loadCompany}
              onChange={(e) => setLoadCompany(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          {/* ROW 3: Loading Point & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                4. Loading Point <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Haldia Port / Jamshedpur"
                value={loadingPoint}
                onChange={(e) => setLoadingPoint(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                5. Destination <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ranchi / Patna / Delhi"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* ROW 4: Weight, Rate & Rate Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                6. Weight (in MT) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="e.g. 25.50"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                7. Rate (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="1"
                min="1"
                required
                placeholder="e.g. 1200"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                8. Rate Unit <span className="text-rose-500">*</span>
              </label>
              <select
                value={rateUnit}
                onChange={(e) => setRateUnit(e.target.value as RateUnit)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
              >
                <option value="Per MT">Per MT</option>
                <option value="Per Trip">Per Trip (Fixed)</option>
              </select>
            </div>
          </div>

          {/* ROW 5: Booking Date & Live Freight Display */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                9. Booking Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Live Freight Box */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-emerald-900">
                  Calculated Freight:
                </span>
              </div>
              <div className="text-lg font-black text-emerald-800">
                ₹{formatCurrency(liveFreight)}
              </div>
            </div>
          </div>

          {/* Modal Actions */}
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
                  <span>{editLoad ? 'Update Load Record' : 'Save & Record Load'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
