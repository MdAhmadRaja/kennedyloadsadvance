import React from 'react';
import { AdminPresence } from '../types';
import { AUTHORIZED_ADMIN_EMAILS } from '../firebase/config';
import { ShieldCheck, UserCheck, Smartphone, Monitor } from 'lucide-react';

interface Props {
  presences: AdminPresence[];
  currentAdminEmail?: string | null;
}

export const AdminPresenceCard: React.FC<Props> = ({ presences, currentAdminEmail }) => {
  const getPresenceFor = (email: string) => {
    return presences.find((p) => p.email.toLowerCase() === email.toLowerCase());
  };

  const formatLastActive = (isoString?: string) => {
    if (!isoString) return 'Never logged in';
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Active just now';
    if (diffSec < 3600) return `Active ${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `Active ${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isUserActiveRecently = (isoString?: string) => {
    if (!isoString) return false;
    const date = new Date(isoString);
    const diffSec = (Date.now() - date.getTime()) / 1000;
    return diffSec < 90; // Active within 90 seconds
  };

  return (
    <div className="bg-white rounded-xl border border-emerald-100 p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              System Administrators
            </h4>
            <p className="text-[11px] text-slate-500">Authorized personnel presence status</p>
          </div>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
          Dual-Admin Security
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {AUTHORIZED_ADMIN_EMAILS.map((email) => {
          const p = getPresenceFor(email);
          const isCurrent = currentAdminEmail?.toLowerCase() === email.toLowerCase();
          const isOnline = isCurrent || (p && isUserActiveRecently(p.lastActive));
          const name = email.split('@')[0];

          return (
            <div
              key={email}
              className={`p-3 rounded-lg border transition-all ${
                isCurrent
                  ? 'border-emerald-300 bg-emerald-50/50'
                  : 'border-slate-100 bg-slate-50/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center uppercase">
                      {name.slice(0, 2)}
                    </div>
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                        isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {name}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-medium">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate" title={email}>
                      {email}
                    </p>
                  </div>
                </div>
                {p?.currentDevice === 'Mobile' ? (
                  <Smartphone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                ) : (
                  <Monitor className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
              </div>

              <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Status:</span>
                <span
                  className={`font-medium ${
                    isOnline ? 'text-emerald-700 font-semibold' : 'text-slate-600'
                  }`}
                >
                  {isOnline ? 'Online now' : formatLastActive(p?.lastActive)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
