'use client'

import Link from "next/link"
import Image from "next/image";
import {
  BarChart3,
  Boxes,
  Home,
  LineChart,
  Menu,
  Package,
  PackagePlus,
  Settings,
  UploadCloud,
  Users,
  Warehouse,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { UserNav } from "@/components/dashboard/user-nav"
import { ShopSwitcher } from "@/components/dashboard/shop-switcher"
import { useAuth } from "@/contexts/auth-context"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const adminNavItems = [
    { href: "/dashboard/estoque-central", icon: Warehouse, label: "Estoque Central" },
    { href: "/dashboard/analise-estoque", icon: Package, label: "Análise de Estoque" },
    { href: "/dashboard/gerenciamento-estoque", icon: PackagePlus, label: "Gerenciamento de Estoque" },
    { href: "/dashboard/fluxo-de-caixa", icon: BarChart3, label: "Fluxo de Caixa" },
    { href: "/dashboard/relatorio-fluxo-caixa", icon: LineChart, label: "Relatório Caixa" },
    { href: "/dashboard/relatorio-estoque", icon: Boxes, label: "Relatório Estoque" },
    { href: "/dashboard/importacao-dados-antigos", icon: UploadCloud, label: "Importar Dados" },
    { href: "/dashboard/configuracoes", icon: Settings, label: "Configurações" },
]

const shopNavItems = [
    { href: "/dashboard/analise-estoque", icon: Package, label: "Análise de Estoque" },
    { href: "/dashboard/gerenciamento-estoque", icon: PackagePlus, label: "Gerenciamento de Estoque" },
]

export function AppHeader() {
  const { user } = useAuth()
  const pathname = usePathname()
  const navItems = user?.role === 'admin' ? adminNavItems : shopNavItems;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/60 bg-background/80 backdrop-blur-md px-4 sm:px-8 shadow-2xs transition-all">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden rounded-xl border-border/80">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs bg-card/95 backdrop-blur-xl border-r border-border/60">
          <nav className="grid gap-6 text-lg font-medium pt-2">
            <Link
              href="/dashboard"
              className="group flex items-center gap-3 px-2 text-lg font-heading font-bold tracking-tight text-foreground"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner">
                <Image src="https://upload.wikimedia.org/wikipedia/commons/4/4f/Fini_Logo.png" width={28} height={28} alt="Annadu ERP Logo" />
              </div>
              <span>Annadu ERP</span>
            </Link>
            <div className="h-px bg-border/60 my-1" />
            {navItems.map(item => (
                <Link
                key={item.href}
                href={item.href}
                className={cn(
                    "flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-base font-medium transition-all",
                    pathname === item.href ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 font-semibold" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", pathname === item.href ? "text-primary-foreground" : "text-muted-foreground")} />
                {item.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <div className="flex w-full items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="h-8 w-1.5 rounded-full bg-gradient-to-b from-primary to-accent transition-all group-hover:scale-y-110" />
            <div>
              <h1 className="font-heading font-extrabold text-xl tracking-tight leading-none text-foreground">Annadu ERP</h1>
              <p className="text-[11px] font-medium text-muted-foreground hidden sm:block mt-0.5">Gestão de Estoque & Finanças</p>
            </div>
          </Link>
          <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 ml-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Sistema Online
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {user?.role === 'admin' && (
            <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border/40">
              <ShopSwitcher />
            </div>
          )}
          <div className="h-6 w-px bg-border/60 hidden sm:block mx-0.5" />
          <UserNav />
        </div>
      </div>
    </header>
  )
}
