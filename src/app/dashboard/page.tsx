'use client';

import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { useShop } from "@/contexts/shop-context";
import { BarChart3, Boxes, Warehouse, LineChart, Package, PackagePlus, Settings, UploadCloud, ArrowRight, Sparkles, ShieldCheck, Building2 } from "lucide-react";

const adminFeatures = [
    { href: "/dashboard/estoque-central", icon: Warehouse, title: "Estoque Central", description: "Gerencie o estoque principal e transfira itens para unidades." },
    { href: "/dashboard/analise-estoque", icon: Package, title: "Análise de Estoque", description: "Visualize o saldo, cobertura e status atual dos produtos." },
    { href: "/dashboard/gerenciamento-estoque", icon: PackagePlus, title: "Gerenciamento de Estoque", description: "Registre entradas, saídas e perdas de estoque na loja." },
    { href: "/dashboard/fluxo-de-caixa", icon: BarChart3, title: "Fluxo de Caixa", description: "Controle diário de vendas, métodos e despesas operacionais." },
    { href: "/dashboard/relatorio-fluxo-caixa", icon: LineChart, title: "Relatório de Caixa", description: "Análises financeiras detalhadas e diagnósticos com IA." },
    { href: "/dashboard/relatorio-estoque", icon: Boxes, title: "Relatório de Estoque", description: "Gráficos de movimentação e produtos mais/menos vendidos." },
    { href: "/dashboard/importacao-dados-antigos", icon: UploadCloud, title: "Importar Dados Antigos", description: "Insira totais históricos de vendas de períodos passados." },
    { href: "/dashboard/configuracoes", icon: Settings, title: "Configurações", description: "Personalize taxas de cartão, custos fixos e categorias." },
];

const shopFeatures = [
    { href: "/dashboard/analise-estoque", icon: Package, title: "Análise de Estoque", description: "Visualize o status atual, cobertura e saldo do estoque." },
    { href: "/dashboard/gerenciamento-estoque", icon: PackagePlus, title: "Gerenciamento de Estoque", description: "Registre entradas e saídas de produtos no dia a dia." },
];

export default function DashboardPage() {
    const { user } = useAuth();
    const { selectedShop } = useShop();
    
    if (!user) return null;

    const features = user.role === 'admin' ? adminFeatures : shopFeatures;

    return (
        <div className="container mx-auto py-6 space-y-8 animate-in fade-in-50 duration-500">
            {/* Executive Hero Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-white/10">
                <div className="absolute -right-10 -top-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute right-1/4 bottom-0 w-48 h-48 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold tracking-wide text-indigo-200 border border-white/10">
                            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                            <span>Ambiente Corporativo ERP</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-heading font-extrabold tracking-tight">
                            Bem-vindo(a), <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-white to-indigo-100">{user.username}</span>!
                        </h1>
                        <p className="text-indigo-200/80 max-w-xl text-sm sm:text-base">
                            Painel de controle executivo para monitoramento de estoque, fluxo de caixa e relatórios analíticos.
                        </p>
                    </div>

                    <div className="flex flex-wrap sm:flex-col gap-2.5 shrink-0 bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10 text-xs font-medium">
                        <div className="flex items-center gap-2 text-indigo-100">
                            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>Nível: <strong className="text-white uppercase">{user.role === 'admin' ? 'Administrador' : 'Operador'}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-indigo-100">
                            <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                            <span>Unidade: <strong className="text-white">{selectedShop || 'Geral'}</strong></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modules Grid Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-heading font-bold tracking-tight text-foreground">Módulos do Sistema</h2>
                        <p className="text-sm text-muted-foreground">Selecione uma área operacional abaixo para gerenciar.</p>
                    </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
                    {features.map((feature) => (
                        <Link href={feature.href} key={feature.href} className="group outline-none">
                            <Card className="h-full bg-card/80 backdrop-blur-sm border border-border/70 hover:border-primary/50 hover:shadow-lg transition-all duration-300 group-hover:-translate-y-1 overflow-hidden rounded-xl">
                                <CardHeader className="flex flex-row items-start justify-between gap-4 p-6">
                                    <div className="space-y-3 flex-1">
                                        <div className="inline-flex items-center justify-center p-3.5 rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground shadow-xs">
                                            <feature.icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg font-heading font-bold group-hover:text-primary transition-colors">{feature.title}</CardTitle>
                                            <CardDescription className="text-sm mt-1 leading-relaxed text-muted-foreground line-clamp-2">{feature.description}</CardDescription>
                                        </div>
                                    </div>
                                    <div className="pt-1">
                                        <div className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all group-hover:translate-x-0.5">
                                            <ArrowRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </CardHeader>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
