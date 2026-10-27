import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let app: ReturnType<typeof initializeApp> | null = null;
let _auth: ReturnType<typeof getAuth> | null = null;
let _db: ReturnType<typeof getFirestore> | null = null;

if (!firebaseConfig.apiKey) {
  // Avoid throwing during module import so the app can render even when env isn't configured
  // Consumers should check for `auth`/`db` being null and handle accordingly.
  // This commonly happens in local dev when .env isn't set.
  // eslint-disable-next-line no-console
  console.warn('[WARN] Firebase API key is missing. Skipping Firebase initialization.');
} else {
  try {
    app = initializeApp(firebaseConfig);
    _auth = getAuth(app);
    _db = getFirestore(app);
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[ERROR] Firebase initialization failed:', err?.message || err);
    app = null;
    _auth = null;
    _db = null;
  }
}

export const auth = _auth;
export const db = _db;

export default app;
