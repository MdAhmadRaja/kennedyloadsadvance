import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, Copy, BookOpen, KeyRound, Database, FileText, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpSetupModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const securityRulesCode = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Default deny catch-all
    match /{document=**} {
      allow read, write: if false;
    }

    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }

    // Strictly authorize only the two designated administrator accounts
    function isKennedyAdmin() {
      return isSignedIn() && (
        request.auth.token.email == 'ahmadalltech123@gmail.com' ||
        request.auth.token.email == 'sji200947@gmail.com'
      );
    }

    // 1. Loads Collection
    match /loads/{loadId} {
      allow read: if isKennedyAdmin();
      allow create: if isKennedyAdmin()
        && request.resource.data.vehicleNumber is string
        && request.resource.data.loadCompany is string
        && request.resource.data.loadingPoint is string
        && request.resource.data.destination is string
        && request.resource.data.weight is number
        && request.resource.data.rate is number;
      allow update: if isKennedyAdmin();
      allow delete: if isKennedyAdmin();
    }

    // 2. Advances Collection
    match /advances/{advanceId} {
      allow read: if isKennedyAdmin();
      allow create: if isKennedyAdmin()
        && request.resource.data.advanceSender is string
        && request.resource.data.vehicleNumber is string
        && request.resource.data.amount is number
        && request.resource.data.paymentDate is string;
      allow update: if isKennedyAdmin();
      allow delete: if isKennedyAdmin();
    }

    // 3. Activity Logs Collection (Protected Audit Trail)
    match /activity_logs/{logId} {
      allow read: if isKennedyAdmin();
      allow create: if isKennedyAdmin();
      allow update, delete: if false; // Immuntable audit trail
    }

    // 4. Admin Presence Collection
    match /admin_presence/{adminId} {
      allow read: if isKennedyAdmin();
      allow write: if isKennedyAdmin();
    }

    // 5. System Info (Connection testing)
    match /system_info/{infoId} {
      allow read: if isKennedyAdmin();
      allow write: if isKennedyAdmin();
    }
  }
}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-emerald-800 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-emerald-200" />
            <div>
              <h3 className="font-bold text-base">Setup & Security Guide</h3>
              <p className="text-xs text-emerald-200">
                Kennedy Trailer Services — Configuration & Deployment Reference
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

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs leading-relaxed text-slate-700">
          {/* Section 1: Administrator Accounts */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>1. Configured Administrator Accounts</span>
            </h4>
            <p className="text-slate-600 mb-2">
              Only these two accounts are granted administrator access. Passkey set in Firebase console: <code className="bg-emerald-100 text-emerald-900 px-1 py-0.5 rounded font-mono font-bold">12221124</code>
            </p>
            <ul className="list-disc list-inside space-y-1 font-mono text-slate-800">
              <li>ahmadalltech123@gmail.com</li>
              <li>sji200947@gmail.com</li>
            </ul>
          </div>

          {/* Section 2: Firestore Security Rules */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-700" />
                <span>2. Firestore Security Rules (firestore.rules)</span>
              </h4>
              <button
                onClick={() => copyToClipboard(securityRulesCode)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Rules'}</span>
              </button>
            </div>
            <pre className="bg-slate-900 text-emerald-300 p-3.5 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48">
              {securityRulesCode}
            </pre>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Copy these rules into your Firebase Console &rarr; Firestore Database &rarr; Rules tab to enforce zero-trust access.
            </p>
          </div>

          {/* Section 3: Testing Checklist */}
          <div className="border border-emerald-100 bg-emerald-50/40 rounded-xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>3. Verification & Testing Checklist</span>
            </h4>
            <div className="space-y-1.5">
              {[
                'Log in as ahmadalltech123@gmail.com or sji200947@gmail.com with passkey 12221124.',
                'Record a new load with 9 essential fields (Vehicle, Company, Route, Weight, Rate, Date). Verify calculated freight in ₹.',
                'Record an advance with 4 fields (Sender, Vehicle, Amount, Date). Verify automatic vehicle matching indicator.',
                'Check Vehicle Search: type vehicle number and review combined ledger with freight, advances, and remaining balance.',
                'Test Admin Presence: see live green indicator and last active timestamp.',
                'Generate PDF and CSV reports on the Export page.',
                'Download JSON full backup and test duplicate-safe restore.',
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold"
          >
            Got It, Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
