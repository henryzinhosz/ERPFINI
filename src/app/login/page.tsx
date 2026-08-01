import { LoginForm } from '@/components/auth/login-form';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';

export default function LoginPage() {
  const bgImage = PlaceHolderImages.find(img => img.id === 'login-background');

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4 overflow-hidden">
      {/* Decorative ambient lighting spheres */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/3 translate-y-1/3 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      
      {bgImage && (
        <Image
          src={bgImage.imageUrl}
          alt={bgImage.description}
          data-ai-hint={bgImage.imageHint}
          fill
          className="object-cover opacity-10 mix-blend-overlay"
          referrerPolicy="no-referrer"
        />
      )}
      <div className="relative z-10 w-full max-w-md transition-all duration-500 animate-in fade-in zoom-in-95">
        <LoginForm />
      </div>
    </div>
  );
}
