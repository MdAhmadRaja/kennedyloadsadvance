import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyDRgZZxX3YehUOn4F-Lxt3k6_35pJ8zXnY",
  authDomain: "votechain-6q6mh.firebaseapp.com",
  projectId: "votechain-6q6mh",
  storageBucket: "votechain-6q6mh.firebasestorage.app",
  messagingSenderId: "351280550746",
  appId: "1:351280550746:web:39c5d71d491e9476125963"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

// Authorized Administrator Emails for Kennedy Trailer Services
export const AUTHORIZED_ADMIN_EMAILS = [
  'ahmadalltech123@gmail.com',
  'sji200947@gmail.com'
] as const;

export const DEFAULT_ADMIN_PASSKEY = '12221124';

export function isAuthorizedAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return AUTHORIZED_ADMIN_EMAILS.some(admin => admin.toLowerCase() === normalized);
}
