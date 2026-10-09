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
  where,
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

// Test connection on boot per Firebase skill guidelines
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

// Standardize vehicle number (uppercase, trimmed, normalized spaces)
export function normalizeVehicleNumber(raw: string): string {
  if (!raw) return '';
  return raw.trim().toUpperCase().replace(/\s+/g, ' ');
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

// Sanitizers to prevent runtime undefined crashes from partially formatted docs
export function sanitizeLoad(id: string, raw: any): TransportLoad {
  const weight = Number(raw?.weight) || 0;
  const rate = Number(raw?.rate) || 0;
  const rateUnit: RateUnit = raw?.rateUnit || 'Not Specified';
  const calculatedFreight =
    raw?.calculatedFreight !== undefined && raw?.calculatedFreight !== null
      ? Number(raw.calculatedFreight)
      : calculateFreight(weight, rate, rateUnit);

  return {
    id: id || raw?.id || '',
    vehicleNumber: normalizeVehicleNumber(raw?.vehicleNumber || ''),
    driverContact: raw?.driverContact || '',
    loadCompany: raw?.loadCompany || '',
    loadingPoint: raw?.loadingPoint || '',
    destination: raw?.destination || '',
    weight,
    rate,
    rateUnit,
    calculatedFreight,
    bookingDate: raw?.bookingDate || new Date().toISOString().split('T')[0],
    createdAt: raw?.createdAt || new Date().toISOString(),
    createdByEmail: raw?.createdByEmail || 'admin',
    createdByName: raw?.createdByName || '',
    updatedAt: raw?.updatedAt || new Date().toISOString(),
    updatedByEmail: raw?.updatedByEmail || 'admin',
  };
}

export function sanitizeAdvance(id: string, raw: any): AdvanceRecord {
  return {
    id: id || raw?.id || '',
    advanceSender: raw?.advanceSender || '',
    vehicleNumber: normalizeVehicleNumber(raw?.vehicleNumber || ''),
    amount: Number(raw?.amount) || 0,
    paymentDate: raw?.paymentDate || new Date().toISOString().split('T')[0],
    matchingStatus: raw?.matchingStatus || 'unmatched',
    matchedLoadId: raw?.matchedLoadId || null,
    possibleLoadIds: Array.isArray(raw?.possibleLoadIds) ? raw.possibleLoadIds : [],
    createdAt: raw?.createdAt || new Date().toISOString(),
    createdByEmail: raw?.createdByEmail || 'admin',
    updatedAt: raw?.updatedAt || new Date().toISOString(),
    updatedByEmail: raw?.updatedByEmail || 'admin',
  };
}

export function sanitizeActivityLog(id: string, raw: any): ActivityLog {
  return {
    id: id || raw?.id || '',
    action: raw?.action || 'admin_login',
    description: raw?.description || '',
    entityType: raw?.entityType || 'system',
    entityId: raw?.entityId || '',
    vehicleNumber: raw?.vehicleNumber ? normalizeVehicleNumber(raw.vehicleNumber) : '',
    performedByEmail: raw?.performedByEmail || 'admin',
    timestamp: raw?.timestamp || new Date().toISOString(),
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
    vehicleNumber: options?.vehicleNumber ? normalizeVehicleNumber(options.vehicleNumber) : '',
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

// Subscribe to activity logs
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
  loadInput: Omit<TransportLoad, 'id' | 'createdAt' | 'createdByEmail' | 'updatedAt' | 'updatedByEmail' | 'calculatedFreight'>
): Promise<{ load: TransportLoad; linkedAdvancesCount: number }> {
  const userEmail = auth.currentUser?.email || 'admin@kennedytrailer.com';
  const loadId = `LOAD_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const normalizedVehicle = normalizeVehicleNumber(loadInput.vehicleNumber);
  const now = new Date().toISOString();
  const calculatedFreight = calculateFreight(loadInput.weight, loadInput.rate, loadInput.rateUnit);

  const newLoad: TransportLoad = {
    ...loadInput,
    id: loadId,
    vehicleNumber: normalizedVehicle,
    calculatedFreight,
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
    `Added load for vehicle ${normalizedVehicle} (${newLoad.loadCompany}, ${newLoad.loadingPoint} to ${newLoad.destination})`,
    'load',
    {
      entityId: loadId,
      vehicleNumber: normalizedVehicle,
      details: {
        weight: newLoad.weight,
        rate: newLoad.rate,
        rateUnit: newLoad.rateUnit,
        freight: calculatedFreight,
      },
    }
  );

  // Auto-connect any previously unmatched advance for this vehicle if there's now an obvious match
  let linkedCount = 0;
  try {
    const advancesQuery = query(
      collection(db, 'advances'),
      where('vehicleNumber', '==', normalizedVehicle),
      where('matchingStatus', '==', 'unmatched')
    );
    const snap = await getDocs(advancesQuery);
    if (!snap.empty) {
      const totalLoadsQuery = query(
        collection(db, 'loads'),
        where('vehicleNumber', '==', normalizedVehicle)
      );
      const loadsSnap = await getDocs(totalLoadsQuery);

      for (const advDoc of snap.docs) {
        const advData = sanitizeAdvance(advDoc.id, advDoc.data());
        if (loadsSnap.size === 1) {
          await updateDoc(doc(db, 'advances', advData.id), {
            matchingStatus: 'auto-linked',
            matchedLoadId: loadId,
            possibleLoadIds: [loadId],
            updatedAt: new Date().toISOString(),
            updatedByEmail: userEmail,
          });
          linkedCount++;
          await logActivity(
            'match_advance',
            `Auto-linked advance of ₹${advData.amount} from ${advData.advanceSender} to new load on ${normalizedVehicle}`,
            'advance',
            { entityId: advData.id, vehicleNumber: normalizedVehicle }
          );
        } else {
          const possibleIds = loadsSnap.docs.map((d) => d.id);
          await updateDoc(doc(db, 'advances', advData.id), {
            matchingStatus: 'multiple-possible',
            possibleLoadIds: possibleIds,
            updatedAt: new Date().toISOString(),
            updatedByEmail: userEmail,
          });
        }
      }
    }
  } catch (err) {
    console.warn('Auto-matching check error:', err);
  }

  return { load: newLoad, linkedAdvancesCount: linkedCount };
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
    prepared.vehicleNumber = normalizeVehicleNumber(updates.vehicleNumber);
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

export async function deleteLoad(loadId: string, vehicleNumber: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'loads', loadId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `loads/${loadId}`, true);
  }

  try {
    const q = query(
      collection(db, 'advances'),
      where('matchedLoadId', '==', loadId)
    );
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      await updateDoc(doc(db, 'advances', d.id), {
        matchedLoadId: null,
        matchingStatus: 'unmatched',
        updatedAt: new Date().toISOString(),
        updatedByEmail: auth.currentUser?.email || 'admin',
      });
    }
  } catch (err) {
    console.warn('Unlink on delete load notice:', err);
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
}): Promise<{ advance: AdvanceRecord; autoMatchedLoad: TransportLoad | null; multipleCandidates: TransportLoad[] }> {
  const userEmail = auth.currentUser?.email || 'admin@kennedytrailer.com';
  const advanceId = `ADV_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const normalizedVehicle = normalizeVehicleNumber(advanceInput.vehicleNumber);
  const now = new Date().toISOString();

  let matchingStatus: AdvanceRecord['matchingStatus'] = 'unmatched';
  let matchedLoadId: string | null = null;
  let possibleLoadIds: string[] = [];
  let autoMatchedLoad: TransportLoad | null = null;
  let multipleCandidates: TransportLoad[] = [];

  try {
    const loadsQuery = query(
      collection(db, 'loads'),
      where('vehicleNumber', '==', normalizedVehicle)
    );
    const snap = await getDocs(loadsQuery);
    const matchingLoads: TransportLoad[] = [];
    snap.forEach((d) => matchingLoads.push(sanitizeLoad(d.id, d.data())));

    if (matchingLoads.length === 1) {
      matchingStatus = 'auto-linked';
      matchedLoadId = matchingLoads[0].id;
      possibleLoadIds = [matchedLoadId];
      autoMatchedLoad = matchingLoads[0];
    } else if (matchingLoads.length > 1) {
      matchingStatus = 'multiple-possible';
      possibleLoadIds = matchingLoads.map((l) => l.id);
      multipleCandidates = matchingLoads;
    } else {
      matchingStatus = 'unmatched';
      matchedLoadId = null;
      possibleLoadIds = [];
    }
  } catch (err) {
    console.warn('Matching check warning:', err);
  }

  const newAdvance: AdvanceRecord = {
    id: advanceId,
    advanceSender: advanceInput.advanceSender.trim(),
    vehicleNumber: normalizedVehicle,
    amount: Number(advanceInput.amount) || 0,
    paymentDate: advanceInput.paymentDate,
    matchingStatus,
    matchedLoadId,
    possibleLoadIds,
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

  const matchDesc =
    matchingStatus === 'auto-linked'
      ? `(Auto-linked to load #${matchedLoadId})`
      : matchingStatus === 'multiple-possible'
      ? `(Multiple loads found for vehicle)`
      : `(Unmatched)`;

  await logActivity(
    'create_advance',
    `Recorded advance of ₹${newAdvance.amount} from ${newAdvance.advanceSender} for ${normalizedVehicle} ${matchDesc}`,
    'advance',
    {
      entityId: advanceId,
      vehicleNumber: normalizedVehicle,
      details: {
        amount: newAdvance.amount,
        sender: newAdvance.advanceSender,
        matchingStatus,
        matchedLoadId,
      },
    }
  );

  return {
    advance: newAdvance,
    autoMatchedLoad,
    multipleCandidates,
  };
}

export async function linkAdvanceToLoad(
  advanceId: string,
  loadId: string,
  vehicleNumber: string
): Promise<void> {
  const userEmail = auth.currentUser?.email || 'admin@kennedytrailer.com';
  const now = new Date().toISOString();

  try {
    await updateDoc(doc(db, 'advances', advanceId), {
      matchedLoadId: loadId,
      matchingStatus: 'manually-linked',
      possibleLoadIds: [loadId],
      updatedAt: now,
      updatedByEmail: userEmail,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `advances/${advanceId}`, true);
  }

  await logActivity(
    'match_advance',
    `Manually linked advance to trip load on ${vehicleNumber}`,
    'advance',
    { entityId: advanceId, vehicleNumber, details: { matchedLoadId: loadId } }
  );
}

export async function unlinkAdvance(
  advanceId: string,
  vehicleNumber: string
): Promise<void> {
  const userEmail = auth.currentUser?.email || 'admin@kennedytrailer.com';
  const now = new Date().toISOString();

  try {
    await updateDoc(doc(db, 'advances', advanceId), {
      matchedLoadId: null,
      matchingStatus: 'unmatched',
      updatedAt: now,
      updatedByEmail: userEmail,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `advances/${advanceId}`, true);
  }

  await logActivity(
    'unlink_advance',
    `Unlinked advance on vehicle ${vehicleNumber}`,
    'advance',
    { entityId: advanceId, vehicleNumber }
  );
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
    prepared.vehicleNumber = normalizeVehicleNumber(updates.vehicleNumber);
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
