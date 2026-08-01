'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp | null; // Allow null during initialization
  firestore: Firestore | null;
  auth: Auth | null;
}

// State for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean; // True if core services are provided and not null
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
}

/**
 * React Context for Firebase services.
 */
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * FirebaseProvider manages and provides Firebase service instances.
 * It does NOT manage user authentication state, which is handled by AuthProvider.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  // Memoize the context value to prevent unnecessary re-renders.
  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
    };
  }, [firebaseApp, firestore, auth]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      {contextValue.areServicesAvailable ? <FirebaseErrorListener /> : null}
      {children}
    </FirebaseContext.Provider>
  );
};

/**
 * Hook to access core Firebase services.
 * Throws an error if used outside a FirebaseProvider or if services are not available.
 */
export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  return context;
};

/** Hook to access Firebase Auth instance. */
export const useAuthInstance = (): Auth => { // Renamed to avoid conflict with useAuth from auth-context
  const { auth, areServicesAvailable } = useFirebase();
  if (!areServicesAvailable || !auth) {
    throw new Error('Firebase Auth service not available. Check FirebaseProvider setup.');
  }
  return auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore, areServicesAvailable } = useFirebase();
  if (!areServicesAvailable || !firestore) {
    throw new Error('Firebase Firestore service not available. Check FirebaseProvider setup.');
  }
  return firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp, areServicesAvailable } = useFirebase();
  if (!areServicesAvailable || !firebaseApp) {
    throw new Error('Firebase App instance not available. Check FirebaseProvider setup.');
  }
  return firebaseApp;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}

// useUser hook is removed from here as it's now part of the AuthProvider logic.
