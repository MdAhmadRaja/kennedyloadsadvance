import { TransportLoad, AdvanceRecord, TripRecord, TripLifecycleStatus } from '../types';
import { cleanVehicleKey } from './formatUtils';

/**
 * Helper to get a stable epoch millisecond timestamp for loads
 */
function getLoadTimestamp(load: TransportLoad): number {
  if (load.createdAt) {
    const t = new Date(load.createdAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (load.bookingDate) {
    const t = new Date(load.bookingDate + 'T00:00:00Z').getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  return 0;
}

/**
 * Helper to get a stable epoch millisecond timestamp for advances
 */
function getAdvanceTimestamp(adv: AdvanceRecord): number {
  if (adv.createdAt) {
    const t = new Date(adv.createdAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (adv.paymentDate) {
    const t = new Date(adv.paymentDate + 'T00:00:00Z').getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  return 0;
}

/**
 * Helper to get the settlement timestamp of a completed load
 */
function getSettlementTimestamp(load: TransportLoad): number {
  if (!load.isRestBalanceSettled) return Infinity;

  if (load.updatedAt) {
    const t = new Date(load.updatedAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (load.restBalanceDate) {
    const t = new Date(load.restBalanceDate + 'T23:59:59Z').getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  return getLoadTimestamp(load);
}

/**
 * Automatically builds chronological trip lifecycles for loads and advances
 * of a given vehicle, strictly preventing data overlap between past completed trips
 * and new loads.
 */
export function buildVehicleTrips(
  loads: TransportLoad[],
  advances: AdvanceRecord[]
): TripRecord[] {
  // 1. Sort loads chronologically (Oldest first: Trip 1, Trip 2, ...)
  const sortedLoads = [...loads].sort((a, b) => {
    // Primary sort: bookingDate YYYY-MM-DD
    const dateA = a.bookingDate || '';
    const dateB = b.bookingDate || '';
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }
    // Secondary sort: createdAt ISO timestamp
    const tA = a.createdAt || '';
    const tB = b.createdAt || '';
    return tA.localeCompare(tB);
  });

  // 2. Sort advances chronologically (Oldest first: Advance 1, Advance 2, ...)
  const sortedAdvances = [...advances].sort((a, b) => {
    // Primary sort: paymentDate YYYY-MM-DD
    const dateA = a.paymentDate || '';
    const dateB = b.paymentDate || '';
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }
    // Secondary sort: createdAt ISO timestamp
    const tA = a.createdAt || '';
    const tB = b.createdAt || '';
    return tA.localeCompare(tB);
  });

  // 3. Handle Edge Case: Advances exist but NO loads recorded yet for this vehicle
  if (sortedLoads.length === 0) {
    if (sortedAdvances.length === 0) return [];

    const totalAdv = sortedAdvances.reduce((s, a) => s + (Number(a.amount) || 0), 0);
    const firstAdv = sortedAdvances[0];
    const virtualLoad: TransportLoad = {
      id: `virtual_${firstAdv.id}`,
      vehicleNumber: firstAdv.vehicleNumber,
      cleanVehicleKey: cleanVehicleKey(firstAdv.vehicleNumber),
      loadCompany: 'Load Entry Pending',
      loadingPoint: 'Origin Pending',
      destination: 'Destination Pending',
      weight: 0,
      rate: 0,
      rateUnit: 'Not Specified',
      calculatedFreight: 0,
      bookingDate: firstAdv.paymentDate,
      createdAt: firstAdv.createdAt,
      createdByEmail: firstAdv.createdByEmail,
      updatedAt: firstAdv.updatedAt,
      updatedByEmail: firstAdv.updatedByEmail,
    };

    return [
      {
        load: virtualLoad,
        advances: sortedAdvances,
        totalAdvances: totalAdv,
        advanceDate: firstAdv.paymentDate,
        advanceSender: firstAdv.advanceSender,
        freight: 0,
        restBalanceDue: 0,
        isRestSettled: false,
        restSettledDate: null,
        restSettledPaidBy: null,
        restSettledAmount: 0,
        status: 'pending_advance',
      },
    ];
  }

  // 4. Map advances to loads accurately without overlap
  // Check for explicit loadId assignments first
  const advancesByLoadId = new Map<string, AdvanceRecord[]>();
  const unassignedAdvances: AdvanceRecord[] = [];

  sortedAdvances.forEach((adv) => {
    if (adv.loadId && sortedLoads.some((l) => l.id === adv.loadId)) {
      const list = advancesByLoadId.get(adv.loadId) || [];
      list.push(adv);
      advancesByLoadId.set(adv.loadId, list);
    } else {
      unassignedAdvances.push(adv);
    }
  });

  // For unassigned advances, partition chronologically across loads
  // A completed/settled load CANNOT take advances created after its settlement!
  const loadAdvancesMap = new Map<string, AdvanceRecord[]>();
  sortedLoads.forEach((load) => {
    loadAdvancesMap.set(load.id, [...(advancesByLoadId.get(load.id) || [])]);
  });

  // Assign each unassigned advance to the appropriate load
  unassignedAdvances.forEach((adv) => {
    const advTime = getAdvanceTimestamp(adv);
    const advDate = adv.paymentDate || (adv.createdAt ? adv.createdAt.split('T')[0] : '');

    let targetLoadIndex = -1;

    for (let i = 0; i < sortedLoads.length; i++) {
      const currentLoad = sortedLoads[i];
      const nextLoad = sortedLoads[i + 1];

      const currentLoadTime = getLoadTimestamp(currentLoad);
      const nextLoadTime = nextLoad ? getLoadTimestamp(nextLoad) : Infinity;

      // Settlement time for current load
      const isSettled = Boolean(currentLoad.isRestBalanceSettled);
      const settleTime = isSettled ? getSettlementTimestamp(currentLoad) : Infinity;

      // If current load was already settled before this advance was created/paid,
      // it CANNOT belong to current load; it must belong to a subsequent load!
      if (isSettled && advTime > settleTime && i < sortedLoads.length - 1) {
        continue;
      }

      // If next load exists:
      if (nextLoad) {
        // Cutoff for next load: either next load's booking date or next load's timestamp
        const nextBookingDate = nextLoad.bookingDate;
        const nextTime = Math.min(nextLoadTime, settleTime);

        // If this advance is strictly before the next load
        if (advTime < nextTime && (!nextBookingDate || advDate <= nextBookingDate)) {
          targetLoadIndex = i;
          break;
        }
      } else {
        // Last load: takes the advance
        targetLoadIndex = i;
        break;
      }
    }

    if (targetLoadIndex === -1) {
      // Default to the newest unsettled load, or the latest load
      const unsettledIndex = sortedLoads.findIndex((l) => !l.isRestBalanceSettled);
      targetLoadIndex = unsettledIndex >= 0 ? unsettledIndex : sortedLoads.length - 1;
    }

    const assignedLoad = sortedLoads[targetLoadIndex];
    if (assignedLoad) {
      const list = loadAdvancesMap.get(assignedLoad.id) || [];
      list.push(adv);
      loadAdvancesMap.set(assignedLoad.id, list);
    }
  });

  // 5. Construct TripRecord objects for each load
  const tripRecords: TripRecord[] = sortedLoads.map((load) => {
    const tripAdvances = loadAdvancesMap.get(load.id) || [];

    // Sort this trip's advances
    tripAdvances.sort((a, b) => {
      const tA = getAdvanceTimestamp(a);
      const tB = getAdvanceTimestamp(b);
      return tA - tB;
    });

    const totalAdvances = tripAdvances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    const freight = Number(load.calculatedFreight) || 0;
    const isRestSettled = Boolean(load.isRestBalanceSettled);
    const restBalanceDue = Math.max(0, freight - totalAdvances);

    let status: TripLifecycleStatus = 'pending_advance';
    if (isRestSettled) {
      status = 'completed';
    } else if (totalAdvances > 0) {
      // Advance is done, but rest balance is NOT done -> Top priority action required!
      status = 'pending_settlement';
    } else {
      // Load is booked, but advance has not been paid yet
      status = 'pending_advance';
    }

    // Capture first/primary advance sender and date
    const firstAdvance = tripAdvances[0];
    const advanceSender = firstAdvance
      ? tripAdvances.map((a) => a.advanceSender).filter(Boolean).join(', ') || firstAdvance.advanceSender
      : null;
    const advanceDate = firstAdvance ? firstAdvance.paymentDate : null;

    return {
      load,
      advances: tripAdvances,
      totalAdvances,
      advanceDate,
      advanceSender,
      freight,
      restBalanceDue,
      isRestSettled,
      restSettledDate: load.restBalanceDate || null,
      restSettledPaidBy: load.restBalancePaidBy || null,
      restSettledAmount: Number(load.restBalanceAmount) || 0,
      status,
    };
  });

  return tripRecords;
}

/**
 * Filter and sort trips for Vehicle Search & Ledgers:
 * "if advance done and rest balance not done then only those all details in top
 * and rest all completed should be at below with both date of advance and date of rest"
 */
export function sortTripsForSearch(trips: TripRecord[]): TripRecord[] {
  return [...trips].sort((a, b) => {
    // Priority 1: Pending Settlement (Advance done, Rest balance NOT done) strictly on TOP
    const aIsPendingSettlement = a.status === 'pending_settlement' ? 0 : 1;
    const bIsPendingSettlement = b.status === 'pending_settlement' ? 0 : 1;

    if (aIsPendingSettlement !== bIsPendingSettlement) {
      return aIsPendingSettlement - bIsPendingSettlement;
    }

    // Priority 2: Completed trips (Both advance & rest settled) come BELOW pending
    const aIsCompleted = a.status === 'completed' ? 0 : 1;
    const bIsCompleted = b.status === 'completed' ? 0 : 1;
    if (aIsCompleted !== bIsCompleted) {
      return aIsCompleted - bIsCompleted;
    }

    // Priority 3: Pending advance trips
    // Secondary sort: most recent booking date first
    const dateA = a.load.bookingDate || a.load.createdAt;
    const dateB = b.load.bookingDate || b.load.createdAt;
    return dateB.localeCompare(dateA);
  });
}
