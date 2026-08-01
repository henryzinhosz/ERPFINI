'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider, FirebaseContextState } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * Initializes Firebase on the client-side and provides the service instances
 * down the component tree. This is the single entry point for Firebase services.
 */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // initializeFirebase() is synchronous and relies on process.env.
  // It's safe to call directly and memoize the result.
  const firebaseServices = useMemo(() => initializeFirebase(), []);

  const contextState: FirebaseContextState = {
    areServicesAvailable: !!firebaseServices.firebaseApp,
    ...firebaseServices,
  };

  return (
    <FirebaseProvider
      firebaseApp={contextState.firebaseApp}
      auth={contextState.auth}
      firestore={contextState.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
