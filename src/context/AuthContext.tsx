import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  auth,
  AUTHORIZED_ADMIN_EMAILS,
  DEFAULT_ADMIN_PASSKEY,
  isAuthorizedAdmin,
} from '../firebase/config';
import { updateAdminPresence, logActivity } from '../firebase/firestoreService';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  isAuthorized: boolean;
  authError: string | null;
  loginAsAdmin: (email: string, passkey: string) => Promise<void>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
  authorizedAdmins: readonly string[];
  defaultPasskey: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (isAuthorizedAdmin(user.email)) {
          setCurrentUser(user);
          setIsAuthorized(true);
          setAuthError(null);
          // Update presence in Firestore
          await updateAdminPresence(user.email!, true);
        } else {
          // Block unauthorized email
          await fbSignOut(auth);
          setCurrentUser(null);
          setIsAuthorized(false);
          setAuthError(
            `Access Denied: Account "${user.email}" is not authorized. Only designated administrators (ahmadalltech123@gmail.com, sji200947@gmail.com) can access Kennedy Transport Desk.`
          );
        }
      } else {
        setCurrentUser(null);
        setIsAuthorized(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Heartbeat presence update while online
  useEffect(() => {
    if (!currentUser?.email || !isAuthorized) return;

    const interval = setInterval(() => {
      if (currentUser?.email) {
        updateAdminPresence(currentUser.email, true);
      }
    }, 45000); // every 45s

    const handleBeforeUnload = () => {
      if (currentUser?.email) {
        updateAdminPresence(currentUser.email, false);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser, isAuthorized]);

  const loginAsAdmin = async (email: string, passkey: string) => {
    setAuthError(null);
    const cleanEmail = email.trim().toLowerCase();

    if (!isAuthorizedAdmin(cleanEmail)) {
      setAuthError(
        `Unauthorized access: "${email}" is not registered in the Kennedy Trailer Services administrators list.`
      );
      throw new Error('Unauthorized administrator account.');
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, passkey.trim());
      if (cred.user && cred.user.email) {
        await updateAdminPresence(cred.user.email, true);
        await logActivity(
          'admin_login',
          `Administrator ${cred.user.email} logged into Transport Desk`,
          'system',
          { details: { email: cred.user.email } }
        );
      }
    } catch (err: any) {
      console.error('Firebase Auth Login Error:', err);
      let userFriendlyMessage = 'Login failed. Please check credentials.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        userFriendlyMessage = 'Invalid password/passkey. Please verify the passkey.';
      } else if (err.code === 'auth/user-not-found') {
        userFriendlyMessage = `Account for ${cleanEmail} was not found in Firebase. Please ensure it is created in Firebase Authentication.`;
      } else if (err.code === 'auth/too-many-requests') {
        userFriendlyMessage = 'Too many failed attempts. Please wait a few moments and try again.';
      } else if (err.message) {
        userFriendlyMessage = err.message;
      }
      setAuthError(userFriendlyMessage);
      throw new Error(userFriendlyMessage);
    }
  };

  const logout = async () => {
    if (currentUser?.email) {
      await updateAdminPresence(currentUser.email, false);
    }
    await fbSignOut(auth);
    setCurrentUser(null);
    setIsAuthorized(false);
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        isAuthorized,
        authError,
        loginAsAdmin,
        logout,
        clearAuthError,
        authorizedAdmins: AUTHORIZED_ADMIN_EMAILS,
        defaultPasskey: DEFAULT_ADMIN_PASSKEY,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
