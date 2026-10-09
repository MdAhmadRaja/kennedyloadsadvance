export type RateUnit = 'Per MT' | 'Per Trip' | 'Not Specified';

export type TripLifecycleStatus =
  | 'pending_advance' // Load booked, no advance yet
  | 'pending_settlement' // Advance received, reached destination / waiting for rest balance
  | 'completed'; // Advance paid AND rest balance paid

export interface TransportLoad {
  id: string;
  vehicleNumber: string; // e.g. JH11D 0037
  cleanVehicleKey: string; // normalized canonical key: JH11D0037
  driverContact?: string;
  loadCompany: string;
  loadingPoint: string;
  destination: string;
  weight: number; // in Metric Tonnes (MT)
  rate: number; // in Rupees
  rateUnit: RateUnit;
  calculatedFreight: number;
  bookingDate: string; // YYYY-MM-DD

  // Rest Balance (Destination reached & Load return final settlement)
  isRestBalanceSettled?: boolean;
  restBalanceAmount?: number; // Amount settled
  restBalanceDate?: string; // Date rest balance was paid
  restBalancePaidBy?: string; // Who paid the rest balance
  restBalanceNotes?: string;

  createdAt: string; // ISO string
  createdByEmail: string;
  createdByName?: string;
  updatedAt: string; // ISO string
  updatedByEmail: string;
}

export interface AdvanceRecord {
  id: string;
  advanceSender: string; // e.g. Samir Dad
  vehicleNumber: string;
  cleanVehicleKey: string; // normalized canonical key: JH11D0037
  amount: number; // in Rupees
  paymentDate: string; // YYYY-MM-DD
  loadId?: string; // Optional direct load association
  createdAt: string; // ISO string
  createdByEmail: string;
  updatedAt: string; // ISO string
  updatedByEmail: string;
}

export interface ActivityLog {
  id: string;
  action:
    | 'create_load'
    | 'update_load'
    | 'delete_load'
    | 'create_advance'
    | 'update_advance'
    | 'delete_advance'
    | 'settle_rest_balance'
    | 'backup_export'
    | 'backup_restore'
    | 'admin_login';
  description: string;
  entityType: 'load' | 'advance' | 'settlement' | 'system';
  entityId?: string;
  vehicleNumber?: string;
  performedByEmail: string;
  timestamp: string; // ISO string
  details?: Record<string, any>;
}

export interface AdminPresence {
  email: string;
  displayName: string;
  lastActive: string; // ISO string
  isOnline: boolean;
  currentDevice?: string;
}

// Full Trip Context combining Load, matching Advances, and Rest Balance
export interface TripRecord {
  load: TransportLoad;
  advances: AdvanceRecord[];
  totalAdvances: number;
  advanceDate: string | null;
  advanceSender: string | null;
  freight: number;
  restBalanceDue: number;
  isRestSettled: boolean;
  restSettledDate: string | null;
  restSettledPaidBy: string | null;
  restSettledAmount: number;
  status: TripLifecycleStatus;
}
