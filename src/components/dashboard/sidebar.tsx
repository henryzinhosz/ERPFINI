'use client'

import Link from "next/link"
import Image from "next/image";
import {
  BarChart3,
  Boxes,
  Home,
  LineChart,
  Package,
  PackagePlus,
  Settings,
  UploadCloud,
  Users,
  Warehouse,
} from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"
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

export function AppSidebar() {
  const { user } = useAuth()
  const pathname = usePathname()

  const navItems = user?.role === 'admin' ? adminNavItems : shopNavItems;

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-14 flex-col border-r border-border/60 bg-card/90 backdrop-blur-xl sm:flex shadow-xs">
      <TooltipProvider delayDuration={150}>
        <nav className="flex flex-col items-center gap-3 px-2 py-4">
          <Link
            href="/dashboard"
            className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 hover:bg-primary/20 hover:scale-105 shadow-inner mb-2"
          >
            <Image src="https://upload.wikimedia.org/wikipedia/commons/4/4f/Fini_Logo.png" width={28} height={28} alt="Annadu ERP Logo" className="rounded-lg transition-transform group-hover:rotate-6" />
            <span className="sr-only">Annadu ERP</span>
          </Link>
          <div className="w-8 h-px bg-border/60 mb-1" />
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 group",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-105"
                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:scale-105"
                    )}
                  >
                    {isActive && (
                      <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
                    )}
                    <item.icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                    <span className="sr-only">{item.label}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-semibold text-xs px-3 py-1.5 rounded-lg shadow-lg bg-foreground text-background border-none animate-in fade-in-50 zoom-in-95">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </TooltipProvider>
    </aside>
  )
}
