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
  Auth,
  getMultiFactorResolver,
  MultiFactorResolver,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  Firestore 
} from 'firebase/firestore';

// Dedicated TiffinFlow Firebase Configuration
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAPrKkU_rpUsJjJdQ3tKu25ah3V23FIQsw",
  authDomain: "tiffinflow-shashank.firebaseapp.com",
  projectId: "tiffinflow-shashank",
  storageBucket: "tiffinflow-shashank.firebasestorage.app",
  messagingSenderId: "87467508107",
  appId: "1:87467508107:web:d007007b82f147e207ef8e"
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
let currentRecaptcha: RecaptchaVerifier | null = null;

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

    // Multi-Factor Authentication Required (SMS / Phone second factor)
    if (error.code === 'auth/multi-factor-auth-required') {
      const resolver = getMultiFactorResolver(auth, error);
      const mfaErr: any = new Error("SMS Multi-Factor Authentication required.");
      mfaErr.code = 'auth/multi-factor-auth-required';
      mfaErr.resolver = resolver;
      throw mfaErr;
    }

    if (error.code === 'auth/popup-blocked') {
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
    } else if (error.code === 'auth/configuration-not-found' || error.message?.includes('configuration-not-found')) {
      throw new Error(
        "Authentication is not activated yet in Firebase! Go to Firebase Console -> Build -> Authentication -> Click 'Get started' -> Enable 'Google' sign-in provider."
      );
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error("Google Sign-In is not enabled in Firebase Console. Go to Firebase Console -> Authentication -> Sign-in method -> Enable Google.");
    } else if (error.code === 'auth/popup-closed-by-user') {
      return null;
    } else {
      throw new Error(error.message || "Failed to sign in with Google.");
    }
  }
}

/**
 * Trigger SMS verification code sending for Firebase MFA
 */
export async function sendMfaSmsCode(
  resolver: MultiFactorResolver,
  containerId: string = 'recaptcha-container'
): Promise<{ verificationId: string; hintPhone: string }> {
  if (!auth) throw new Error("Firebase Auth not initialized");

  const phoneInfoOptions = {
    multiFactorHint: resolver.hints[0],
    session: resolver.session,
  };

  // Clear previous recaptcha verifier if any
  if (currentRecaptcha) {
    try {
      currentRecaptcha.clear();
    } catch {}
  }

  currentRecaptcha = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
  });

  const phoneAuthProvider = new PhoneAuthProvider(auth);
  const verificationId = await phoneAuthProvider.verifyPhoneNumber(
    phoneInfoOptions,
    currentRecaptcha
  );

  const hint = resolver.hints[0] as any;
  const hintPhone = hint.displayName || hint.phoneNumber || 'your registered phone number';
  return { verificationId, hintPhone };
}

/**
 * Complete MFA sign-in by submitting the SMS OTP code
 */
export async function submitMfaVerificationCode(
  resolver: MultiFactorResolver,
  verificationId: string,
  verificationCode: string
): Promise<User> {
  const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
  const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
  const userCredential = await resolver.resolveSignIn(multiFactorAssertion);
  return userCredential.user;
}

export async function checkRedirectAuth(): Promise<User | null> {
  if (!auth) return null;
  try {
    const result = await getRedirectResult(auth);
    return result ? result.user : null;
  } catch (error: any) {
    if (error.code === 'auth/multi-factor-auth-required') {
      const resolver = getMultiFactorResolver(auth, error);
      const mfaErr: any = new Error("SMS Multi-Factor Authentication required.");
      mfaErr.code = 'auth/multi-factor-auth-required';
      mfaErr.resolver = resolver;
      throw mfaErr;
    }
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
