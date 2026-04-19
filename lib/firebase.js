import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FB_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FB_MESSAGING_ID || "",
  appId: process.env.NEXT_PUBLIC_FB_APP_ID || "",
};

let app, db, auth;

// Only initialize Firebase on the client AND if the API key is provided
if (typeof window !== 'undefined' && firebaseConfig.apiKey) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(app);
  auth = getAuth(app);
}

const provider = typeof window !== 'undefined' ? new GoogleAuthProvider() : null;

// ---- Auth helpers ----
export const signInWithGoogle = () => {
  if (!auth) return Promise.reject("Firebase is not configured yet. Please add your credentials to Vercel.");
  return signInWithPopup(auth, provider);
};

export const logOut = () => {
  if (!auth) return Promise.resolve();
  return signOut(auth);
};

export const onAuth = (cb) => {
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
};

// ---- Firestore helpers ----
const COLLECTION = 'trackers';

export async function saveProgress(uid, data) {
  if (!db || !uid) return;
  try {
    await setDoc(doc(db, COLLECTION, uid), {
      ...data,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (e) {
    console.warn('Firebase save failed, using localStorage fallback', e);
  }
}

export async function loadProgress(uid) {
  if (!db || !uid) return null;
  try {
    const snap = await getDoc(doc(db, COLLECTION, uid));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.warn('Firebase load failed, using localStorage fallback', e);
    return null;
  }
}

import { onSnapshot } from 'firebase/firestore';

export function listenProgress(uid, callback) {
  if (!db || !uid) return () => {};
  return onSnapshot(doc(db, COLLECTION, uid), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  }, (e) => {
    console.warn('Firebase listen failed', e);
  });
}
