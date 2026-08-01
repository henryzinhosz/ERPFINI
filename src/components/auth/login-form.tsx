'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound, Mail } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      // On successful login, force redirect to the dashboard.
      router.replace('/dashboard');
    } catch (error: any) {
      console.error("Login attempt failed:", error);
      let description = "Ocorreu um erro desconhecido. Tente novamente.";
      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          description = "Email ou senha inválidos. Por favor, tente novamente.";
          break;
        case 'auth/invalid-email':
          description = "O formato do email é inválido.";
          break;
        case 'auth/user-disabled':
           description = "Este usuário foi desabilitado.";
           break;
        case 'auth/user-profile-not-found':
            description = "Perfil de usuário não encontrado no banco de dados. Contate o administrador.";
            break;
        default:
          console.error("Login Error:", error);
          description = `Falha no login. (${error.code || 'UNKNOWN_ERROR'})`;
          break;
      }
      
      toast({
        variant: "destructive",
        title: "Falha no Login",
        description: description,
      });
    } finally {
        // Always stop loading, whether it was a success or failure.
        setIsLoading(false);
    }
  };

  return (
    <Card className="w-full border border-white/10 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-primary via-indigo-500 to-accent" />
      <CardHeader className="text-center pt-8 pb-4 space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mx-auto mb-2 shadow-inner">
          <span className="font-heading font-bold text-2xl tracking-tighter">A</span>
        </div>
        <CardTitle className="text-3xl font-heading font-extrabold tracking-tight text-foreground">Annadu ERP</CardTitle>
        <CardDescription className="text-muted-foreground font-medium">Gestão Inteligente de Estoque e Fluxo de Caixa</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5 px-8 pt-2">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold text-foreground/80">E-mail Corporativo</Label>
            <div className="relative group">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                id="email"
                type="email"
                placeholder="Ex: admin@shopflow.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-11 h-11 bg-background/50 border-border/80 focus:bg-background focus:border-primary transition-all rounded-xl shadow-xs"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold text-foreground/80">Senha de Acesso</Label>
            <div className="relative group">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-11 h-11 bg-background/50 border-border/80 focus:bg-background focus:border-primary transition-all rounded-xl shadow-xs"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="px-8 pb-8 pt-4 flex flex-col gap-4">
          <Button type="submit" className="w-full h-12 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white font-semibold text-base shadow-lg shadow-primary/25 rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            Acessar Sistema
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Ambiente Seguro • Annadu ERP v2.4
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
