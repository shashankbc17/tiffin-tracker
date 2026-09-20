import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  User,
  Auth
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  Firestore 
} from 'firebase/firestore';

// Heirloom / TiffinFlow Firebase Default Configuration
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCcE9n2kuUelaEAMnbccx4CMbJ9NAQO1g0",
  authDomain: "heirloom-cookbook-io.firebaseapp.com",
  projectId: "heirloom-cookbook-io",
  storageBucket: "heirloom-cookbook-io.firebasestorage.app",
  messagingSenderId: "1075282950451",
  appId: "1:1075282950451:web:47558ddb0bdad5c1742646",
  measurementId: "G-T3LLN4JRFG"
};

const STORAGE_KEY_FIREBASE = 'tiffinflow_firebase_config';

export function getSavedFirebaseConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FIREBASE);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading custom Firebase config:', e);
  }
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveFirebaseConfig(cfg: any) {
  localStorage.setItem(STORAGE_KEY_FIREBASE, JSON.stringify(cfg));
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function initFirebase(customConfig?: any) {
  const config = customConfig || getSavedFirebaseConfig();
  try {
    if (!getApps().length) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    auth = getAuth(app);
    db = getFirestore(app);
    return { app, auth, db };
  } catch (err) {
    console.warn("Firebase initialization warning:", err);
    return { app: null, auth: null, db: null };
  }
}

// Initialize on module load
initFirebase();

export async function loginWithGoogle(): Promise<User | null> {
  if (!auth) {
    initFirebase();
  }
  if (!auth) {
    throw new Error("Firebase Auth could not be initialized. Please verify your Firebase configuration in Settings.");
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    console.error("Google Sign-In error details:", error);

    if (error.code === 'auth/popup-blocked') {
      // If popup was blocked by Safari / mobile browser, try redirect flow
      try {
        await signInWithRedirect(auth, provider);
        return null;
      } catch (redirectErr) {
        throw new Error("Popup blocked by browser. Please allow popups for this site or tap again.");
      }
    } else if (error.code === 'auth/unauthorized-domain') {
      const currentHost = window.location.hostname;
      throw new Error(
        `Domain not authorized in Firebase! Please go to Firebase Console -> Authentication -> Settings -> Authorized Domains, and add '${currentHost}'.`
      );
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error("Google Sign-In is not enabled in Firebase Console. Go to Firebase Console -> Authentication -> Sign-in method -> Enable Google.");
    } else if (error.code === 'auth/popup-closed-by-user') {
      return null; // User cancelled, no need to show scary error
    } else {
      throw new Error(error.message || "Failed to sign in with Google.");
    }
  }
}

export async function checkRedirectAuth(): Promise<User | null> {
  if (!auth) return null;
  try {
    const result = await getRedirectResult(auth);
    return result ? result.user : null;
  } catch (error) {
    console.error("Redirect auth error:", error);
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  if (auth) {
    await signOut(auth);
  }
}

export function subscribeToAuthChanges(callback: (user: User | null) => void) {
  if (!auth) {
    initFirebase();
  }
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export { auth, db };
