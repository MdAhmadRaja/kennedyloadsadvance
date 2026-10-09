import React, { useState, useMemo } from 'react';
import { TransportLoad, AdvanceRecord, ActivityLog } from '../types';
import {
  ExportFilterOptions,
  generatePDFReport,
  exportToCSV,
  exportJSONBackup,
  filterRecords,
} from '../utils/exportUtils';
import { setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { logActivity } from '../firebase/firestoreService';
import { useAuth } from '../context/AuthContext';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Database,
  Upload,
  Calendar,
  Filter,
  CheckCircle2,
  AlertCircle,
  Truck,
  Building2,
  RefreshCw,
} from 'lucide-react';

interface Props {
  loads: TransportLoad[];
  advances: AdvanceRecord[];
  activityLogs: ActivityLog[];
}

export const ExportReports: React.FC<Props> = ({ loads, advances, activityLogs }) => {
  const { currentUser } = useAuth();

  // Filters state with default date basis = Record Created Date
  const [dateBasis, setDateBasis] = useState<ExportFilterOptions['dateBasis']>('createdDate');
  const [noDateLimit, setNoDateLimit] = useState(false);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [company, setCompany] = useState('');
  const [reportType, setReportType] = useState<ExportFilterOptions['reportType']>('all');

  // JSON Restore states
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Filter preview calculation
  const filterOptions: ExportFilterOptions = {
    startDate,
    endDate,
    dateBasis,
    vehicleNumber,
    company,
    reportType,
    noDateLimit,
  };

  const { filteredLoads, filteredAdvances, filteredLogs } = useMemo(() => {
    return filterRecords(loads, advances, activityLogs, filterOptions);
  }, [loads, advances, activityLogs, filterOptions]);

  const handleExportPDF = () => {
    generatePDFReport(
      loads,
      advances,
      activityLogs,
      filterOptions,
      currentUser?.email || 'admin'
    );
    logActivity('backup_export', 'Exported PDF report', 'system', {
      details: { format: 'PDF', filterOptions },
    });
  };

  const handleExportCSV = () => {
    exportToCSV(loads, advances, activityLogs, filterOptions);
    logActivity('backup_export', 'Exported CSV spreadsheet', 'system', {
      details: { format: 'CSV', filterOptions },
    });
  };

  const handleExportJSON = () => {
    exportJSONBackup(loads, advances, activityLogs);
    logActivity('backup_export', 'Exported full JSON database backup', 'system', {
      details: { format: 'JSON', loadsCount: loads.length, advancesCount: advances.length },
    });
  };

  // Restore from JSON backup file
  const handleJSONFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreError(null);
    setRestoreStatus(null);
    setIsRestoring(true);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed.loads && !parsed.advances) {
        throw new Error('Invalid Kennedy Trailer backup file. Missing loads/advances records.');
      }

      let restoredLoads = 0;
      let restoredAdvances = 0;

      // Existing IDs set to avoid overwriting identical docs
      const existingLoadIds = new Set(loads.map((l) => l.id));
      const existingAdvIds = new Set(advances.map((a) => a.id));

      if (Array.isArray(parsed.loads)) {
        for (const load of parsed.loads) {
          if (load.id && load.vehicleNumber && load.loadCompany) {
            if (!existingLoadIds.has(load.id)) {
              await setDoc(doc(db, 'loads', load.id), load);
              restoredLoads++;
            }
          }
        }
      }

      if (Array.isArray(parsed.advances)) {
        for (const adv of parsed.advances) {
          if (adv.id && adv.vehicleNumber && adv.amount) {
            if (!existingAdvIds.has(adv.id)) {
              await setDoc(doc(db, 'advances', adv.id), adv);
              restoredAdvances++;
            }
          }
        }
      }

      await logActivity(
        'backup_restore',
        `Restored data backup: ${restoredLoads} loads and ${restoredAdvances} advances imported.`,
        'system',
        { details: { restoredLoads, restoredAdvances } }
      );

      setRestoreStatus(
        `Successfully restored ${restoredLoads} new load(s) and ${restoredAdvances} new advance(s). Duplicate records were skipped safely.`
      );
    } catch (err: any) {
      setRestoreError(err?.message || 'Failed to parse and restore JSON file.');
    } finally {
      setIsRestoring(false);
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Download className="w-5 h-5 text-emerald-700" />
          <span>Export Reports & Data Backup</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Generate filtered PDF reports, Excel CSV spreadsheets, or full JSON backups
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Filter Controls */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-700" />
            <span>Report Parameters & Filters</span>
          </h3>

          {/* Date Basis Selection (Default: Record Created Date) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Date Basis <span className="text-emerald-700 font-bold">(Default: Record Created Date)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'createdDate', label: 'Record Created Date', desc: 'When entered in system' },
                { id: 'bookingDate', label: 'Booking Date', desc: 'Load trip schedule date' },
                { id: 'paymentDate', label: 'Payment Date', desc: 'Advance payment date' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDateBasis(opt.id as any)}
                  className={`p-3 text-left rounded-xl border transition ${
                    dateBasis === opt.id
                      ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-800">{opt.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range & No Date Limit Checkbox */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Date Range (Inclusive)
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-emerald-800">
                <input
                  type="checkbox"
                  checked={noDateLimit}
                  onChange={(e) => setNoDateLimit(e.target.checked)}
                  className="rounded text-emerald-700 focus:ring-emerald-500 w-4 h-4"
                />
                <span>Export all records (No date restriction)</span>
              </label>
            </div>

            {!noDateLimit && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">Start Date</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">End Date</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Optional Vehicle & Company Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Optional Vehicle Filter
              </label>
              <input
                type="text"
                placeholder="e.g. MH 12 AB 1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Optional Company Filter
              </label>
              <input
                type="text"
                placeholder="e.g. Jindal Steel"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Report Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Report Section Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'all', label: 'All Data' },
                { id: 'loads', label: 'Loads Only' },
                { id: 'advances', label: 'Advances Only' },
                { id: 'activity', label: 'Activity Logs' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setReportType(t.id as any)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    reportType === t.id
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Matching Preview Banner */}
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
            <span className="font-semibold text-emerald-900">
              Matching Records in Range:
            </span>
            <div className="flex items-center gap-4 text-emerald-800 font-bold">
              <span>{filteredLoads.length} Loads</span>
              <span>•</span>
              <span>{filteredAdvances.length} Advances</span>
              <span>•</span>
              <span>{filteredLogs.length} Activities</span>
            </div>
          </div>

          {/* Action Export Buttons */}
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <FileText className="w-4 h-4" />
              <span>Download PDF Report</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-bold rounded-xl shadow-2xs transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download CSV (Excel)</span>
            </button>
          </div>
        </div>

        {/* Right: Full JSON Backup & Restore Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-5 h-5 text-emerald-700" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Full Database Backup & Safety
              </h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Download a complete JSON snapshot of all loads, advances, and audit logs. This file
              can be stored offline or used to restore the system without losing data.
            </p>

            <button
              onClick={handleExportJSON}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Download className="w-4 h-4" />
              <span>Download Full JSON Backup</span>
            </button>

            {/* Restore Section */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Restore from Backup
              </h4>
              <p className="text-[11px] text-slate-500 mb-3">
                Select a previously exported JSON backup file. Duplicates are automatically prevented.
              </p>

              {restoreStatus && (
                <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{restoreStatus}</span>
                </div>
              )}

              {restoreError && (
                <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{restoreError}</span>
                </div>
              )}

              <label className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer transition">
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />
                    <span>Restoring data...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-emerald-700" />
                    <span>Select JSON File to Restore</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleJSONFileSelected}
                  disabled={isRestoring}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500">
            <strong>Data Safety Guarantee:</strong> Records are saved in Cloud Firestore in real time.
            Backups allow complete offline retention.
          </div>
        </div>
      </div>
    </div>
  );
};
