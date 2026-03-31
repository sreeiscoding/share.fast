import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const requiredKeys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];

export const firebaseEnabled = requiredKeys.every((key) =>
  Boolean(process.env[key])
);

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app = null;
let auth = null;
let db = null;
let storage = null;

if (firebaseEnabled) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { app, auth, db, storage };

function assertFirebaseConfigured() {
  if (!firebaseEnabled || !auth || !db || !storage) {
    throw new Error(
      "Firebase is not configured. Add Firebase env vars in .env.local (see .env.example) and restart the dev server."
    );
  }
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export async function isEmailAllowed(email) {
  assertFirebaseConfigured();
  const emailKey = normalizeEmail(email);
  if (!emailKey) return false;
  const snap = await getDoc(doc(db, "allowedUsers", emailKey));
  return snap.exists();
}

export async function loginWithEmailPassword(email, password) {
  assertFirebaseConfigured();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const allowed = await isEmailAllowed(cred.user?.email);
  if (!allowed) {
    await signOut(auth);
    throw new Error("This email is not invited to access this app.");
  }
  return cred;
}

export async function logout() {
  assertFirebaseConfigured();
  return signOut(auth);
}
