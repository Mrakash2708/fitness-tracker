import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';

// 🔥 Replace with YOUR Firebase project config
// Get this from: Firebase Console → Project Settings → Your Apps → Web App
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FB_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FB_MESSAGING_ID || "",
  appId: process.env.NEXT_PUBLIC_FB_APP_ID || "",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ---- Auth helpers ----
export const signInWithGoogle = () => signInWithPopup(auth, provider);
export const logOut = () => signOut(auth);
export const onAuth = (cb) => onAuthStateChanged(auth, cb);

// ---- Firestore helpers ----
const COLLECTION = 'trackers';

export async function saveProgress(uid, data) {
  if (!uid) return;
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
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, COLLECTION, uid));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.warn('Firebase load failed, using localStorage fallback', e);
    return null;
  }
}
