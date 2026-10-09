import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { Navbar, ActiveTab } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { LoadRegister } from './components/LoadRegister';
import { AdvanceRegister } from './components/AdvanceRegister';
import { VehicleSearch } from './components/VehicleSearch';
import { ExportReports } from './components/ExportReports';
import { ActivityHistory } from './components/ActivityHistory';
import { AddLoadModal } from './components/AddLoadModal';
import { AddAdvanceModal } from './components/AddAdvanceModal';
import { MatchReviewModal } from './components/MatchReviewModal';
import { HelpSetupModal } from './components/HelpSetupModal';
import {
  TransportLoad,
  AdvanceRecord,
  ActivityLog,
  AdminPresence,
} from './types';
import {
  subscribeToLoads,
  subscribeToAdvances,
  subscribeToActivityLogs,
  subscribeToAdminPresence,
  testConnection,
  registerFirestoreErrorListener,
} from './firebase/firestoreService';
import { Truck, ShieldCheck, HelpCircle, AlertTriangle, X } from 'lucide-react';

const MainApp: React.FC = () => {
  const { currentUser, isAuthorized, loading: authLoading } = useAuth();

  // Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Real-time Firestore state
  const [loads, setLoads] = useState<TransportLoad[]>([]);
  const [advances, setAdvances] = useState<AdvanceRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [presences, setPresences] = useState<AdminPresence[]>([]);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);

  // Modals state
  const [isAddLoadOpen, setIsAddLoadOpen] = useState(false);
  const [editingLoad, setEditingLoad] = useState<TransportLoad | null>(null);

  const [isAddAdvanceOpen, setIsAddAdvanceOpen] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<AdvanceRecord | null>(null);

  const [prefillVehicle, setPrefillVehicle] = useState<string>('');

  // Match Review Modal State
  const [reviewAdvance, setReviewAdvance] = useState<AdvanceRecord | null>(null);
  const [reviewLoads, setReviewLoads] = useState<TransportLoad[]>([]);
  const [isMatchReviewOpen, setIsMatchReviewOpen] = useState(false);

  // Help & Setup Guide Modal
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Selected vehicle for the Vehicle Search screen
  const [searchVehicleNumber, setSearchVehicleNumber] = useState<string>('');

  // Initial connection test on mount
  useEffect(() => {
    testConnection();
  }, []);

  // Set up real-time subscriptions only when authorized
  useEffect(() => {
    if (!isAuthorized) return;

    registerFirestoreErrorListener((err) => {
      if (err.error?.toLowerCase().includes('permission')) {
        setPermissionNotice(
          `Your Firebase project rules in console currently block "${err.path || 'database'}". Please copy and publish the Firestore security rules in your Firebase Console.`
        );
      }
    });

    const unsubLoads = subscribeToLoads((data) => setLoads(data));
    const unsubAdvances = subscribeToAdvances((data) => setAdvances(data));
    const unsubLogs = subscribeToActivityLogs((data) => setActivityLogs(data));
    const unsubPresence = subscribeToAdminPresence((data) => setPresences(data));

    return () => {
      registerFirestoreErrorListener(null);
      unsubLoads();
      unsubAdvances();
      unsubLogs();
      unsubPresence();
    };
  }, [isAuthorized]);

  // Navigate to vehicle search from anywhere
  const handleSelectVehicle = (vehicleNumber: string) => {
    setSearchVehicleNumber(vehicleNumber);
    setActiveTab('vehicleSearch');
  };

  // Open Add Load modal with optional vehicle prefill
  const handleOpenAddLoad = (veh = '') => {
    setEditingLoad(null);
    setPrefillVehicle(veh);
    setIsAddLoadOpen(true);
  };

  const handleEditLoad = (load: TransportLoad) => {
    setEditingLoad(load);
    setPrefillVehicle('');
    setIsAddLoadOpen(true);
  };

  // Open Add Advance modal with optional vehicle prefill
  const handleOpenAddAdvance = (veh = '') => {
    setEditingAdvance(null);
    setPrefillVehicle(veh);
    setIsAddAdvanceOpen(true);
  };

  const handleEditAdvance = (adv: AdvanceRecord) => {
    setEditingAdvance(adv);
    setPrefillVehicle('');
    setIsAddAdvanceOpen(true);
  };

  // Open Match Review Modal
  const handleOpenMatchReview = (adv: AdvanceRecord, candidateLoads: TransportLoad[]) => {
    setReviewAdvance(adv);
    setReviewLoads(candidateLoads);
    setIsMatchReviewOpen(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center animate-bounce mb-4 shadow-lg shadow-emerald-700/20">
          <Truck className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Kennedy Trailer Services</h3>
        <p className="text-xs text-slate-400 mt-1">Connecting to transport desk securely...</p>
      </div>
    );
  }

  if (!currentUser || !isAuthorized) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Header & Nav */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddLoad={() => handleOpenAddLoad()}
        onOpenAddAdvance={() => handleOpenAddAdvance()}
        presences={presences}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {permissionNotice && (
          <div className="mb-6 bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Firebase Firestore Rules Action Required
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  {permissionNotice}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => setIsHelpOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-lg transition"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Copy Rules to Paste into Firebase Console</span>
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setPermissionNotice(null)}
              className="p-1 text-amber-600 hover:text-amber-900 rounded-lg"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <Dashboard
            loads={loads}
            advances={advances}
            presences={presences}
            currentAdminEmail={currentUser.email}
            onOpenAddLoad={() => handleOpenAddLoad()}
            onOpenAddAdvance={() => handleOpenAddAdvance()}
            onSelectVehicle={handleSelectVehicle}
            onNavigateTab={setActiveTab}
            onReviewMatch={handleOpenMatchReview}
          />
        )}

        {activeTab === 'loads' && (
          <LoadRegister
            loads={loads}
            advances={advances}
            onOpenAddLoad={() => handleOpenAddLoad()}
            onEditLoad={handleEditLoad}
            onSelectVehicle={handleSelectVehicle}
          />
        )}

        {activeTab === 'advances' && (
          <AdvanceRegister
            advances={advances}
            loads={loads}
            onOpenAddAdvance={() => handleOpenAddAdvance()}
            onEditAdvance={handleEditAdvance}
            onSelectVehicle={handleSelectVehicle}
            onReviewMatch={handleOpenMatchReview}
          />
        )}

        {activeTab === 'vehicleSearch' && (
          <VehicleSearch
            loads={loads}
            advances={advances}
            initialVehicleNumber={searchVehicleNumber}
            onOpenAddLoadForVehicle={(v) => handleOpenAddLoad(v)}
            onOpenAddAdvanceForVehicle={(v) => handleOpenAddAdvance(v)}
            onEditLoad={handleEditLoad}
            onEditAdvance={handleEditAdvance}
          />
        )}

        {activeTab === 'export' && (
          <ExportReports
            loads={loads}
            advances={advances}
            activityLogs={activityLogs}
          />
        )}

        {activeTab === 'activity' && (
          <ActivityHistory
            activityLogs={activityLogs}
            onSelectVehicle={handleSelectVehicle}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 sm:px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Kennedy Trailer Services</span>
            <span>•</span>
            <span>Transport Desk Portal</span>
            <span>•</span>
            <span className="text-emerald-700 font-mono text-[11px]">votechain-6q6mh</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsHelpOpen(true)}
              className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-900 font-semibold"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Setup & Rules Guide</span>
            </button>
            <span>v1.0.0</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AddLoadModal
        isOpen={isAddLoadOpen}
        onClose={() => setIsAddLoadOpen(false)}
        editLoad={editingLoad}
        prefillVehicleNumber={prefillVehicle}
      />

      <AddAdvanceModal
        isOpen={isAddAdvanceOpen}
        onClose={() => setIsAddAdvanceOpen(false)}
        editAdvance={editingAdvance}
        prefillVehicleNumber={prefillVehicle}
        onShowMatchReview={(adv, candidates) => handleOpenMatchReview(adv, candidates)}
      />

      <MatchReviewModal
        isOpen={isMatchReviewOpen}
        onClose={() => setIsMatchReviewOpen(false)}
        advance={reviewAdvance}
        loadsForVehicle={reviewLoads}
      />

      <HelpSetupModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
