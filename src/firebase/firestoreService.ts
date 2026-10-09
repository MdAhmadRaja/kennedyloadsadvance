import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDocFromServer,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, auth } from './config';
import {
  TransportLoad,
  AdvanceRecord,
  ActivityLog,
  AdminPresence,
  RateUnit,
} from '../types';
import { cleanVehicleKey } from '../utils/formatUtils';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

// Global listener for permission errors to inform UI cleanly without crashing React
type PermissionErrorListener = (errInfo: FirestoreErrorInfo) => void;
let globalPermissionListener: PermissionErrorListener | null = null;

export function registerFirestoreErrorListener(listener: PermissionErrorListener | null) {
  globalPermissionListener = listener;
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  shouldThrow = false
): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  if (globalPermissionListener) {
    globalPermissionListener(errInfo);
  }
  if (shouldThrow) {
    throw new Error(JSON.stringify(errInfo));
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'system_info', 'connection_check'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or starting up.');
    }
    return false;
  }
}

// Normalize vehicle number for display and storage
export function normalizeVehicleNumber(raw: string): string {
  if (!raw) return '';
  return cleanVehicleKey(raw);
}

// Calculate freight based on rate unit
export function calculateFreight(weight: number, rate: number, rateUnit: RateUnit): number {
  if (rateUnit === 'Per MT') {
    return Math.round((Number(weight) || 0) * (Number(rate) || 0));
  }
  if (rateUnit === 'Per Trip') {
    return Math.round(Number(rate) || 0);
  }
  return Math.round(Number(rate) || 0);
}

function toIsoDate(val: any): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    if (typeof val.toDate === 'function') {
      try {
        return val.toDate().toISOString();
      } catch {
        return new Date().toISOString();
      }
    }
    if (typeof val.seconds === 'number') {
      try {
        return new Date(val.seconds * 1000).toISOString();
      } catch {
        return new Date().toISOString();
      }
    }
  }
  return String(val);
}

function toSimpleDate(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0];
  if (typeof val === 'string') {
    return val.includes('T') ? val.split('T')[0] : val;
  }
  const iso = toIsoDate(val);
  return iso.includes('T') ? iso.split('T')[0] : iso;
}

// Sanitizers to prevent runtime undefined crashes from partially formatted docs
export function sanitizeLoad(id: string, raw: any): TransportLoad {
  const weight = Number(raw?.weight) || 0;
  const rate = Number(raw?.rate) || 0;
  const rateUnit: RateUnit = raw?.rateUnit || 'Not Specified';
  const calculatedFreight =
    raw?.calculatedFreight !== undefined && raw?.calculatedFreight !== null
      ? Number(raw.calculatedFreight)
      : calculateFreight(weight, rate, rateUnit);

  const vehicleNum = String(raw?.vehicleNumber || '');
  const cKey = cleanVehicleKey(vehicleNum || raw?.cleanVehicleKey);

  return {
    id: String(id || raw?.id || ''),
    vehicleNumber: vehicleNum.toUpperCase().trim(),
    cleanVehicleKey: cKey,
    driverContact: raw?.driverContact ? String(raw.driverContact) : '',
    loadCompany: String(raw?.loadCompany || ''),
    loadingPoint: String(raw?.loadingPoint || ''),
    destination: String(raw?.destination || ''),
    weight,
    rate,
    rateUnit,
    calculatedFreight,
    bookingDate: toSimpleDate(raw?.bookingDate),

    // Rest Balance
    isRestBalanceSettled: Boolean(raw?.isRestBalanceSettled),
    restBalanceAmount: raw?.restBalanceAmount !== undefined ? Number(raw.restBalanceAmount) : undefined,
    restBalanceDate: raw?.restBalanceDate ? toSimpleDate(raw.restBalanceDate) : undefined,
    restBalancePaidBy: raw?.restBalancePaidBy ? String(raw.restBalancePaidBy) : undefined,
    restBalanceNotes: raw?.restBalanceNotes ? String(raw.restBalanceNotes) : undefined,

    createdAt: toIsoDate(raw?.createdAt),
    createdByEmail: String(raw?.createdByEmail || 'admin'),
    createdByName: String(raw?.createdByName || ''),
    updatedAt: toIsoDate(raw?.updatedAt),
    updatedByEmail: String(raw?.updatedByEmail || 'admin'),
  };
}

export function sanitizeAdvance(id: string, raw: any): AdvanceRecord {
  const vehicleNum = String(raw?.vehicleNumber || '');
  const cKey = cleanVehicleKey(vehicleNum || raw?.cleanVehicleKey);

  return {
    id: String(id || raw?.id || ''),
    advanceSender: String(raw?.advanceSender || ''),
    vehicleNumber: vehicleNum.toUpperCase().trim(),
    cleanVehicleKey: cKey,
    amount: Number(raw?.amount) || 0,
    paymentDate: toSimpleDate(raw?.paymentDate),
    loadId: raw?.loadId ? String(raw.loadId) : undefined,
    createdAt: toIsoDate(raw?.createdAt),
    createdByEmail: String(raw?.createdByEmail || 'admin'),
    updatedAt: toIsoDate(raw?.updatedAt),
    updatedByEmail: String(raw?.updatedByEmail || 'admin'),
  };
}

export function sanitizeActivityLog(id: string, raw: any): ActivityLog {
  return {
    id: String(id || raw?.id || ''),
    action: raw?.action || 'admin_login',
    description: String(raw?.description || ''),
    entityType: raw?.entityType || 'system',
    entityId: String(raw?.entityId || ''),
    vehicleNumber: raw?.vehicleNumber ? String(raw.vehicleNumber).toUpperCase().trim() : '',
    performedByEmail: String(raw?.performedByEmail || 'admin'),
    timestamp: toIsoDate(raw?.timestamp),
    details: raw?.details || {},
  };
}

// -------------------------------------------------------------
// Activity Logging (Audit Trail)
// -------------------------------------------------------------
export async function logActivity(
  action: ActivityLog['action'],
  description: string,
  entityType: ActivityLog['entityType'],
  options?: {
    entityId?: string;
    vehicleNumber?: string;
    details?: Record<string, any>;
  }
): Promise<void> {
  const userEmail = auth.currentUser?.email || 'admin@kennedytrailer.com';
  const logId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const logDoc: ActivityLog = {
    id: logId,
    action,
    description,
    entityType,
    entityId: options?.entityId || '',
    vehicleNumber: options?.vehicleNumber ? options.vehicleNumber.toUpperCase().trim() : '',
    performedByEmail: userEmail,
    timestamp: new Date().toISOString(),
    details: options?.details || {},
  };

  try {
    await setDoc(doc(db, 'activity_logs', logId), logDoc);
  } catch (err) {
    console.warn('Failed to record activity log in Firestore:', err);
  }
}

export function subscribeToActivityLogs(
  callback: (logs: ActivityLog[]) => void,
  maxEntries = 100
): () => void {
  const q = query(
    collection(db, 'activity_logs'),
    orderBy('timestamp', 'desc'),
    limit(maxEntries)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const logs: ActivityLog[] = [];
      snapshot.forEach((d) => logs.push(sanitizeActivityLog(d.id, d.data())));
      callback(logs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'activity_logs', false);
    }
  );
}

// -------------------------------------------------------------
// Admin Presence Heartbeat
// -------------------------------------------------------------
export async function updateAdminPresence(email: string, isOnline = true): Promise<void> {
  if (!email) return;
  const normalizedEmail = email.trim().toLowerCase();
  const docId = normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_');
  const now = new Date().toISOString();

  const presenceData: AdminPresence = {
    email: normalizedEmail,
    displayName: normalizedEmail.split('@')[0],
    lastActive: now,
    isOnline,
    currentDevice: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
  };

  try {
    await setDoc(doc(db, 'admin_presence', docId), presenceData, { merge: true });
  } catch (err) {
    console.warn('Presence update warning:', err);
  }
}

export function subscribeToAdminPresence(
  callback: (presences: AdminPresence[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'admin_presence'),
    (snapshot) => {
      const presences: AdminPresence[] = [];
      snapshot.forEach((d) => {
        const raw = d.data();
        presences.push({
          email: raw.email || '',
          displayName: raw.displayName || (raw.email ? raw.email.split('@')[0] : 'Admin'),
          lastActive: raw.lastActive || new Date().toISOString(),
          isOnline: Boolean(raw.isOnline),
          currentDevice: raw.currentDevice || 'Desktop',
        });
      });
      callback(presences);
    },
    (error) => {
      console.warn('Presence snapshot notice:', error);
    }
  );
}

// -------------------------------------------------------------
// Load Register Services
// -------------------------------------------------------------
export function subscribeToLoads(callback: (loads: TransportLoad[]) => void): () => void {
  const q = query(collection(db, 'loads'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const loads: TransportLoad[] = [];
      snapshot.forEach((d) => loads.push(sanitizeLoad(d.id, d.data())));
      callback(loads);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'loads', false);
    }
  );
}

export async function createLoad(
  loadInput: Omit<
    TransportLoad,
    | 'id'
    | 'createdAt'
    | 'createdByEmail'
    | 'updatedAt'
    | 'updatedByEmail'
    | 'calculatedFreight'
    | 'cleanVehicleKey'
  >
): Promise<TransportLoad> {
  const userEmail = auth.currentUser?.email || 'admin@kennedytrailer.com';
  const loadId = `LOAD_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const vehicleUpper = loadInput.vehicleNumber.toUpperCase().trim();
  const cKey = cleanVehicleKey(vehicleUpper);
  const now = new Date().toISOString();
  const calculatedFreight = calculateFreight(loadInput.weight, loadInput.rate, loadInput.rateUnit);

  const newLoad: TransportLoad = {
    ...loadInput,
    id: loadId,
    vehicleNumber: vehicleUpper,
    cleanVehicleKey: cKey,
    calculatedFreight,
    isRestBalanceSettled: false,
    createdAt: now,
    createdByEmail: userEmail,
    updatedAt: now,
    updatedByEmail: userEmail,
  };

  try {
    await setDoc(doc(db, 'loads', loadId), newLoad);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `loads/${loadId}`, true);
  }

  await logActivity(
    'create_load',
    `Added load for vehicle ${vehicleUpper} (${newLoad.loadCompany}, ${newLoad.loadingPoint} to ${newLoad.destination})`,
    'load',
    {
      entityId: loadId,
      vehicleNumber: vehicleUpper,
      details: {
        weight: newLoad.weight,
        rate: newLoad.rate,
        rateUnit: newLoad.rateUnit,
        freight: calculatedFreight,
      },
    }
  );

  return newLoad;
}

export async function updateLoad(
  loadId: string,
  updates: Partial<Omit<TransportLoad, 'id' | 'createdAt' | 'createdByEmail'>>
): Promise<void> {
  const userEmail = auth.currentUser?.email || 'admin@kennedytrailer.com';
  const now = new Date().toISOString();

  const prepared: Record<string, any> = {
    ...updates,
    updatedAt: now,
    updatedByEmail: userEmail,
  };

  if (updates.vehicleNumber) {
    const vUpper = updates.vehicleNumber.toUpperCase().trim();
    prepared.vehicleNumber = vUpper;
    prepared.cleanVehicleKey = cleanVehicleKey(vUpper);
  }

  if (updates.weight !== undefined || updates.rate !== undefined || updates.rateUnit !== undefined) {
    const weight = updates.weight !== undefined ? updates.weight : 0;
    const rate = updates.rate !== undefined ? updates.rate : 0;
    const rateUnit = updates.rateUnit || 'Not Specified';
    prepared.calculatedFreight = calculateFreight(weight, rate, rateUnit);
  }

  try {
    await updateDoc(doc(db, 'loads', loadId), prepared);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `loads/${loadId}`, true);
  }

  await logActivity(
    'update_load',
    `Updated load record for vehicle ${prepared.vehicleNumber || 'vehicle'}`,
    'load',
    { entityId: loadId, vehicleNumber: prepared.vehicleNumber, details: updates }
  );
}

// Settle Rest Balance (Destination reached & Load return final settlement)
export async function settleRestBalance(
  loadId: string,
  settlement: {
    settledAmount: number;
    settledDate: string;
    paidBy: string;
    vehicleNumber: string;
    notes?: string;
  }
): Promise<void> {
  const userEmail = auth.currentUser?.email || 'admin@kennedytrailer.com';
  const now = new Date().toISOString();

  const updates = {
    isRestBalanceSettled: true,
    restBalanceAmount: Number(settlement.settledAmount) || 0,
    restBalanceDate: settlement.settledDate,
    restBalancePaidBy: settlement.paidBy.trim(),
    restBalanceNotes: settlement.notes?.trim() || '',
    updatedAt: now,
    updatedByEmail: userEmail,
  };

  try {
    await updateDoc(doc(db, 'loads', loadId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `loads/${loadId}`, true);
  }

  await logActivity(
    'settle_rest_balance',
    `Settled final rest balance of ₹${settlement.settledAmount} for vehicle ${settlement.vehicleNumber} paid by ${settlement.paidBy}`,
    'settlement',
    {
      entityId: loadId,
      vehicleNumber: settlement.vehicleNumber,
      details: settlement,
    }
  );
}

// Reopen / undo rest balance settlement if needed
export async function reopenRestBalance(loadId: string, vehicleNumber: string): Promise<void> {
  const userEmail = auth.currentUser?.email || 'admin@kennedytrailer.com';
  const now = new Date().toISOString();

  const updates = {
    isRestBalanceSettled: false,
    restBalanceAmount: null,
    restBalanceDate: null,
    restBalancePaidBy: null,
    restBalanceNotes: null,
    updatedAt: now,
    updatedByEmail: userEmail,
  };

  try {
    await updateDoc(doc(db, 'loads', loadId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `loads/${loadId}`, true);
  }

  await logActivity(
    'settle_rest_balance',
    `Reopened rest balance for vehicle ${vehicleNumber} (marked as pending settlement)`,
    'settlement',
    { entityId: loadId, vehicleNumber }
  );
}

export async function deleteLoad(loadId: string, vehicleNumber: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'loads', loadId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `loads/${loadId}`, true);
  }

  await logActivity(
    'delete_load',
    `Deleted load record for vehicle ${vehicleNumber}`,
    'load',
    { entityId: loadId, vehicleNumber }
  );
}

// -------------------------------------------------------------
// Advance Register Services
// -------------------------------------------------------------
export function subscribeToAdvances(callback: (advances: AdvanceRecord[]) => void): () => void {
  const q = query(collection(db, 'advances'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const advances: AdvanceRecord[] = [];
      snapshot.forEach((d) => advances.push(sanitizeAdvance(d.id, d.data())));
      callback(advances);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'advances', false);
    }
  );
}

export async function createAdvance(advanceInput: {
  advanceSender: string;
  vehicleNumber: string;
  amount: number;
  paymentDate: string;
  loadId?: string;
}): Promise<AdvanceRecord> {
  const userEmail = auth.currentUser?.email || 'admin@kennedytrailer.com';
  const advanceId = `ADV_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const vehicleUpper = advanceInput.vehicleNumber.toUpperCase().trim();
  const cKey = cleanVehicleKey(vehicleUpper);
  const now = new Date().toISOString();

  const newAdvance: AdvanceRecord = {
    id: advanceId,
    advanceSender: advanceInput.advanceSender.trim(),
    vehicleNumber: vehicleUpper,
    cleanVehicleKey: cKey,
    amount: Number(advanceInput.amount) || 0,
    paymentDate: advanceInput.paymentDate,
    loadId: advanceInput.loadId ? String(advanceInput.loadId) : undefined,
    createdAt: now,
    createdByEmail: userEmail,
    updatedAt: now,
    updatedByEmail: userEmail,
  };

  try {
    await setDoc(doc(db, 'advances', advanceId), newAdvance);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `advances/${advanceId}`, true);
  }

  await logActivity(
    'create_advance',
    `Recorded advance of ₹${newAdvance.amount} from ${newAdvance.advanceSender} for vehicle ${vehicleUpper}`,
    'advance',
    {
      entityId: advanceId,
      vehicleNumber: vehicleUpper,
      details: {
        amount: newAdvance.amount,
        sender: newAdvance.advanceSender,
      },
    }
  );

  return newAdvance;
}

export async function updateAdvance(
  advanceId: string,
  updates: Partial<Omit<AdvanceRecord, 'id' | 'createdAt' | 'createdByEmail'>>
): Promise<void> {
  const userEmail = auth.currentUser?.email || 'admin@kennedytrailer.com';
  const now = new Date().toISOString();

  const prepared: Record<string, any> = {
    ...updates,
    updatedAt: now,
    updatedByEmail: userEmail,
  };

  if (updates.vehicleNumber) {
    const vUpper = updates.vehicleNumber.toUpperCase().trim();
    prepared.vehicleNumber = vUpper;
    prepared.cleanVehicleKey = cleanVehicleKey(vUpper);
  }

  try {
    await updateDoc(doc(db, 'advances', advanceId), prepared);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `advances/${advanceId}`, true);
  }

  await logActivity(
    'update_advance',
    `Updated advance record for vehicle ${prepared.vehicleNumber || 'vehicle'}`,
    'advance',
    { entityId: advanceId, vehicleNumber: prepared.vehicleNumber, details: updates }
  );
}

export async function deleteAdvance(advanceId: string, vehicleNumber: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'advances', advanceId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `advances/${advanceId}`, true);
  }

  await logActivity(
    'delete_advance',
    `Deleted advance record for vehicle ${vehicleNumber}`,
    'advance',
    { entityId: advanceId, vehicleNumber }
  );
}
