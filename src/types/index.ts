export type RateUnit = 'Per MT' | 'Per Trip' | 'Not Specified';

export type MatchingStatus = 'auto-linked' | 'manually-linked' | 'multiple-possible' | 'unmatched';

export interface TransportLoad {
  id: string;
  vehicleNumber: string; // Required, normalized uppercase
  driverContact?: string; // Optional
  loadCompany: string; // Required
  loadingPoint: string; // Required
  destination: string; // Required
  weight: number; // in Metric Tonnes (MT)
  rate: number; // in Rupees
  rateUnit: RateUnit; // Per MT | Per Trip | Not Specified
  calculatedFreight: number; // auto-calculated: Per MT => weight * rate, Per Trip => rate
  bookingDate: string; // YYYY-MM-DD
  createdAt: string; // ISO string
  createdByEmail: string; // admin email
  createdByName?: string;
  updatedAt: string; // ISO string
  updatedByEmail: string;
}

export interface AdvanceRecord {
  id: string;
  advanceSender: string; // e.g. Samir Dad (Required)
  vehicleNumber: string; // Required, normalized uppercase
  amount: number; // in Rupees (Required)
  paymentDate: string; // YYYY-MM-DD (Required)
  matchingStatus: MatchingStatus;
  matchedLoadId?: string | null; // linked load reference
  possibleLoadIds?: string[]; // if multiple candidates
  createdAt: string; // ISO string
  createdByEmail: string;
  updatedAt: string; // ISO string
  updatedByEmail: string;
}

export interface ActivityLog {
  id: string;
  action: 'create_load' | 'update_load' | 'delete_load' | 'create_advance' | 'update_advance' | 'delete_advance' | 'match_advance' | 'unlink_advance' | 'backup_export' | 'backup_restore' | 'admin_login';
  description: string;
  entityType: 'load' | 'advance' | 'system';
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

export interface VehicleSummary {
  vehicleNumber: string;
  loads: TransportLoad[];
  advances: AdvanceRecord[];
  totalFreight: number;
  totalAdvances: number;
  linkedAdvances: number;
  balance: number;
}
