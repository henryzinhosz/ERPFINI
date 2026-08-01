'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User as FirebaseAuthUser, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';

export interface UserProfile extends DocumentData {
  id: string;
  username: string;
  role: 'admin' | 'parkshopping' | 'madureirashopping';
  unitId?: 'Park Shopping' | 'Madureira Shopping';
  email: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  const { auth, firestore, areServicesAvailable } = useFirebase();

  useEffect(() => {
    if (!areServicesAvailable || !auth || !firestore) {
      // Don't start the listener until Firebase is ready.
      // The loading state will be true until services are available.
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseAuthUser | null) => {
      if (firebaseUser) {
        // User is signed in according to Firebase Auth, now fetch our profile.
        const userDocRef = doc(firestore, "users", firebaseUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() } as UserProfile;
            setUser(userData);
          } else {
            // This is a critical case: user exists in Auth but not in Firestore.
            // Sign them out to prevent a broken state.
            await signOut(auth);
            setUser(null);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          await signOut(auth);
          setUser(null);
        }
      } else {
        // User is signed out.
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [areServicesAvailable, auth, firestore]);

  const login = useCallback(async (email: string, pass: string): Promise<void> => {
    if (!auth || !firestore) {
      throw new Error("Firebase services are not available to log in.");
    }
    
    // Step 1: Sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const firebaseUser = userCredential.user;

    // Step 2: After successful auth, fetch the user profile from Firestore
    const userDocRef = doc(firestore, "users", firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      // The onAuthStateChanged listener will automatically pick up the new user state
      // and handle setting the user profile. The promise can now resolve.
      return Promise.resolve();
    } else {
      // If the profile doesn't exist, this is a valid login failure scenario.
      // Sign the user out of Firebase Auth and throw a specific error.
      await signOut(auth);
      throw { code: "auth/user-profile-not-found" }; // Use an object to mimic Firebase error codes
    }
  }, [auth, firestore]);

  const logout = useCallback(async () => {
    if (!auth) return;
    await signOut(auth);
    // onAuthStateChanged will handle setting user to null.
    // We navigate to login page manually.
    router.push('/login');
  }, [auth, router]);

  const value = useMemo(() => ({
    user,
    loading,
    login,
    logout,
  }), [user, loading, login, logout]);

  // While the initial user authentication check is running, show a loading screen.
  if (loading) {
     return (
        <div className="flex h-screen w-screen items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Skeleton className="h-12 w-48" />
                <Skeleton className="h-8 w-64" />
            </div>
        </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
