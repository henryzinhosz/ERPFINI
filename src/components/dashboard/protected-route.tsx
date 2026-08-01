'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
        <div className="flex h-screen w-full flex-col p-4">
            <Skeleton className="h-16 w-full mb-4" />
            <div className="flex flex-1 gap-4">
                <Skeleton className="hidden md:block md:w-64" />
                <Skeleton className="flex-1" />
            </div>
        </div>
    );
  }

  return <>{children}</>;
}
