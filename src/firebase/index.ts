'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

interface FirebaseServices {
    firebaseApp: FirebaseApp | null;
    auth: Auth | null;
    firestore: Firestore | null;
}

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase(): FirebaseServices {
  // On the server, we don't initialize Firebase.
  if (typeof window === 'undefined') {
    return { firebaseApp: null, auth: null, firestore: null };
  }

  // If already initialized, return the existing instances.
  if (getApps().length > 0) {
    const app = getApp();
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    return { firebaseApp: app, auth, firestore };
  }

  // Build the config from environment variables.
  // This is the standard way to handle secrets in Next.js.
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  // Check if essential config values are present.
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    console.error("Firebase config from environment variables is incomplete. Make sure all required NEXT_PUBLIC_FIREBASE_* variables are set.");
    return { firebaseApp: null, auth: null, firestore: null };
  }

  // Initialize the Firebase app.
  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    return { firebaseApp: app, auth, firestore };
  } catch (e) {
    console.error("Firebase initialization with environment config failed:", e);
    return { firebaseApp: null, auth: null, firestore: null };
  }
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';