import React, { useState, useMemo } from 'react';
import { ActivityLog } from '../types';
import { safeEmailDisplay } from '../utils/formatUtils';
import {
  History,
  Search,
  Filter,
  User,
  Truck,
  Banknote,
  ShieldAlert,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface Props {
  activityLogs: ActivityLog[];
  onSelectVehicle: (vehicleNumber: string) => void;
}

export const ActivityHistory: React.FC<Props> = ({ activityLogs = [], onSelectVehicle }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const filteredLogs = useMemo(() => {
    const term = (searchTerm || '').toLowerCase().trim();
    return (activityLogs || []).filter((log) => {
      if (!log) return false;
      const desc = String(log.description || '').toLowerCase();
      const email = String(log.performedByEmail || '').toLowerCase();
      const veh = String(log.vehicleNumber || '').toLowerCase();

      const matchSearch =
        !term ||
        desc.includes(term) ||
        email.includes(term) ||
        veh.includes(term);

      const matchAction = actionFilter === 'all' || log.action === actionFilter;

      return matchSearch && matchAction;
    });
  }, [activityLogs, searchTerm, actionFilter]);

  const getActionBadge = (action: ActivityLog['action']) => {
    switch (action) {
      case 'create_load':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Add Load</span>;
      case 'update_load':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">Edit Load</span>;
      case 'delete_load':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">Delete Load</span>;
      case 'create_advance':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">Add Advance</span>;
      case 'update_advance':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">Edit Advance</span>;
      case 'delete_advance':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">Delete Advance</span>;
      case 'settle_rest_balance':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Settle Rest Balance</span>;
      case 'backup_export':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">Data Export</span>;
      case 'backup_restore':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">Data Restore</span>;
      case 'admin_login':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">Admin Sign-in</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">{action}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <History className="w-5 h-5 text-emerald-700" />
          <span>Activity & Audit History</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Automatic audit trail recording who created, modified, matched, exported, or deleted records
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search activity by admin email, vehicle, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white w-full md:w-44"
          >
            <option value="all">All Actions</option>
            <option value="create_load">Load Added</option>
            <option value="update_load">Load Edited</option>
            <option value="delete_load">Load Deleted</option>
            <option value="create_advance">Advance Added</option>
            <option value="match_advance">Advance Matched</option>
            <option value="backup_export">Report Exported</option>
            <option value="backup_restore">Backup Restored</option>
            <option value="admin_login">Admin Logins</option>
          </select>
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No activity logs found for this filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => {
              let formattedTime = '-';
              let formattedDate = '-';
              try {
                const date = new Date(log.timestamp);
                if (!isNaN(date.getTime())) {
                  formattedTime = date.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });
                  formattedDate = date.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                }
              } catch {
                formattedDate = String(log.timestamp || '-');
              }

              return (
                <div
                  key={log.id}
                  className="p-4 hover:bg-slate-50/70 transition flex items-start justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getActionBadge(log.action)}
                      <span className="text-xs font-semibold text-slate-900">
                        {safeEmailDisplay(log.performedByEmail)}
                      </span>
                      <span className="text-[11px] text-slate-400">({log.performedByEmail})</span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">{log.description}</p>

                    {log.vehicleNumber && (
                      <div className="pt-0.5">
                        <button
                          onClick={() => onSelectVehicle(log.vehicleNumber!)}
                          className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-800 hover:underline"
                        >
                          <Truck className="w-3 h-3 text-emerald-600" />
                          <span>Vehicle: {log.vehicleNumber}</span>
                          <ArrowRight className="w-3 h-3 text-emerald-600" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center justify-end gap-1 text-[11px] font-medium text-slate-600">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{formattedTime}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{formattedDate}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
