'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // This is the main entry point of the app.
    // If the authentication state is still loading, we do nothing and show the skeleton.
    if (loading) {
      return;
    }

    // If authentication is resolved and there is a user, redirect to the dashboard.
    if (user) {
      router.replace('/dashboard');
    } else {
      // If there is no user, redirect to the login page.
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Show a loading skeleton while the initial auth check is in progress.
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-8 w-64" />
      </div>
    </div>
  );
}
