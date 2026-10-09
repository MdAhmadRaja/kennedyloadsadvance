import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Truck, Shield, Lock, Mail, ArrowRight, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginAsAdmin, authError, clearAuthError, authorizedAdmins, defaultPasskey } = useAuth();
  const [email, setEmail] = useState('');
  const [passkey, setPasskey] = useState(defaultPasskey);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasskey, setShowPasskey] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !passkey) return;

    setIsSubmitting(true);
    try {
      await loginAsAdmin(email, passkey);
    } catch (err) {
      // Handled in context
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (adminEmail: string) => {
    setEmail(adminEmail);
    setPasskey(defaultPasskey);
    clearAuthError();
    setIsSubmitting(true);
    try {
      await loginAsAdmin(adminEmail, defaultPasskey);
    } catch (err) {
      // Handled in context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-700/20">
            <Truck className="w-9 h-9" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Kennedy Trailer Services
        </h2>
        <p className="mt-1 text-center text-sm font-medium text-emerald-700">
          Transport Desk & Accounts Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-100 sm:px-10">
          {/* Security Notice */}
          <div className="mb-6 rounded-xl bg-emerald-50/70 p-3.5 border border-emerald-200/80 flex items-start gap-3">
            <Shield className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 leading-relaxed">
              <span className="font-semibold block text-emerald-950">Restricted Administrator Access</span>
              This system is strictly reserved for authorized administrators of Kennedy Trailer Services.
            </div>
          </div>

          {authError && (
            <div className="mb-6 rounded-lg bg-rose-50 p-3.5 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Authentication Notice</p>
                <p className="mt-0.5">{authError}</p>
              </div>
            </div>
          )}

          {/* 1-Click Fast Admin Sign In */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Quick Admin Login
              </span>
              <span className="text-[11px] text-emerald-700 font-medium">Passkey: {defaultPasskey}</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {authorizedAdmins.map((adminEmail) => (
                <button
                  key={adminEmail}
                  type="button"
                  onClick={() => handleQuickLogin(adminEmail)}
                  disabled={isSubmitting}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 text-left transition group disabled:opacity-60"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-semibold uppercase shrink-0">
                      {adminEmail.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {adminEmail.split('@')[0]}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{adminEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium text-emerald-700 opacity-90 group-hover:translate-x-0.5 transition">
                    <span>Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400 uppercase tracking-wider font-medium">
                Or Sign In Manually
              </span>
            </div>
          </div>

          {/* Manual Credentials Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
                Authorized Admin Email
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="ahmadalltech123@gmail.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (authError) clearAuthError();
                  }}
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="passkey" className="block text-xs font-semibold text-slate-700">
                  Console Passkey / Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPasskey(!showPasskey)}
                  className="text-[11px] text-slate-500 hover:text-emerald-700"
                >
                  {showPasskey ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  id="passkey"
                  name="passkey"
                  type={showPasskey ? 'text' : 'password'}
                  required
                  placeholder="Enter passkey"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !email}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-xs text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Enter Transport Desk</span>
                </>
              )}
            </button>
          </form>

          {/* Footnote */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Project: votechain-6q6mh</span>
            <span>Real-time Sync Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
