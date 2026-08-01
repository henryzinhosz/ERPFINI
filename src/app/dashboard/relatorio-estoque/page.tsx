'use client';
import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useShop } from "@/contexts/shop-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStockLogs, getProducts, StockTransaction, Product, getStockData, StockItem } from "@/lib/data";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useFirestore } from "@/firebase";

const CHART_COLORS = ['#3F51B5', '#4CAF50', '#FFC107', '#F44336', '#9C27B0'];
type StockLogAction = 'Entrada' | 'Saída' | 'Perda';

export default function RelatorioEstoquePage() {
    const { selectedShop } = useShop();
    const { toast } = useToast();
    const firestore = useFirestore();
    
    const [stockLogs, setStockLogs] = useState<StockTransaction[]>([]);
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [dateFilter, setDateFilter] = useState('');
    const [operatorFilter, setOperatorFilter] = useState('');
    const [itemFilter, setItemFilter] = useState('');
    const [actionFilter, setActionFilter] = useState<StockLogAction | 'all'>('all');
    const [comparisonMonths, setComparisonMonths] = useState<3 | 6 | 12 | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!selectedShop || !firestore) return;
            setIsLoading(true);
            try {
                const [logs, stock] = await Promise.all([
                    getStockLogs(firestore, selectedShop),
                    getStockData(firestore, selectedShop),
                ]);
                logs.sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime());
                setStockLogs(logs);
                setStockItems(stock);
            } catch (error) {
                console.error("Failed to fetch stock reports data:", error);
                toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os dados para os relatórios." });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [selectedShop, firestore, toast]);

    const stockItemNameMap = useMemo(() => {
        const map = new Map<string, string>();
        stockItems.forEach(item => {
            map.set(item.id, item.name);
        });
        return map;
    }, [stockItems]);


    const filteredLogs = useMemo(() => {
        return stockLogs
            .map(log => {
                const productName = stockItemNameMap.get(log.stockItemId) || 'Desconhecido';
                return { ...log, productName };
            })
            .filter(log => {
                if (!log.date) return false;
                const logDate = format(log.date.toDate(), 'yyyy-MM-dd');
                const dateMatch = !dateFilter || logDate === dateFilter;
                const operatorMatch = !operatorFilter || log.operatorName.toLowerCase().includes(operatorFilter.toLowerCase());
                const itemMatch = !itemFilter || log.productName.toLowerCase().includes(itemFilter.toLowerCase());
                const actionMatch = actionFilter === 'all' || !actionFilter || log.action === actionFilter;
                return dateMatch && operatorMatch && itemMatch && actionMatch;
            });
    }, [dateFilter, operatorFilter, itemFilter, actionFilter, stockLogs, stockItemNameMap]);

    const salesByProduct = useMemo(() => {
        const currentMonthStart = startOfMonth(new Date());
        const currentMonthEnd = endOfMonth(new Date());

        const sales = stockLogs.filter(log =>
            log.action === 'Saída' &&
            log.date &&
            log.date.toDate() >= currentMonthStart &&
            log.date.toDate() <= currentMonthEnd
        );

        const aggregated = sales.reduce((acc, log) => {
            const productName = stockItemNameMap.get(log.stockItemId) || 'Desconhecido';
            acc[productName] = (acc[productName] || 0) + log.quantityChange;
            return acc;
        }, {} as Record<string, number>);

        const sorted = Object.entries(aggregated).sort(([, a], [, b]) => b - a);

        return {
            bestSellers: sorted.slice(0, 5),
            worstSellers: sorted.slice(-5).reverse(),
        };
    }, [stockLogs, stockItemNameMap]);

    const { monthlyComparisonData, top5ProductNames } = useMemo(() => {
        if (!comparisonMonths) return { monthlyComparisonData: [], top5ProductNames: [] };
    
        const today = new Date();
        const periodStart = subMonths(today, comparisonMonths);
    
        const salesInPeriod = stockLogs.filter(log =>
            log.action === 'Saída' &&
            log.date &&
            log.date.toDate() >= periodStart &&
            log.date.toDate() <= today
        );
    
        const aggregatedSales = salesInPeriod.reduce((acc, log) => {
            const productName = stockItemNameMap.get(log.stockItemId) || 'Desconhecido';
            acc[productName] = (acc[productName] || 0) + log.quantityChange;
            return acc;
        }, {} as Record<string, number>);
    
        const top5ProductNames = Object.entries(aggregatedSales)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name]) => name);
    
        const data: { month: string; [key: string]: number | string }[] = [];
    
        for (let i = comparisonMonths - 1; i >= 0; i--) {
            const date = subMonths(today, i);
            const monthStart = startOfMonth(date);
            const monthEnd = endOfMonth(date);
    
            const monthlySales = stockLogs.filter(log =>
                log.action === 'Saída' &&
                log.date &&
                log.date.toDate() >= monthStart &&
                log.date.toDate() <= monthEnd &&
                top5ProductNames.includes(stockItemNameMap.get(log.stockItemId) || '')
            );
    
            const monthData: { month: string; [key: string]: number | string } = {
                month: format(date, 'MMM/yy', { locale: ptBR }),
            };
            
            top5ProductNames.forEach(name => { monthData[name] = 0; });

            monthlySales.forEach(log => {
                const productName = stockItemNameMap.get(log.stockItemId) || 'Desconhecido';
                if(monthData[productName] !== undefined) {
                    (monthData[productName] as number) += log.quantityChange;
                }
            });
    
            data.push(monthData);
        }
    
        return { monthlyComparisonData: data, top5ProductNames };
    }, [comparisonMonths, stockLogs, stockItemNameMap]);

    const handleClearFilters = () => {
        setDateFilter('');
        setOperatorFilter('');
        setItemFilter('');
        setActionFilter('all');
    }

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Relatórios de Estoque</h1>
                <p className="text-muted-foreground">Análise de movimentação de produtos para: <span className="font-semibold text-primary">{selectedShop}</span></p>
            </div>

            <Tabs defaultValue="log" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="best-worst">Mais/Menos Vendidos</TabsTrigger>
                    <TabsTrigger value="comparison">Comparativo Mensal</TabsTrigger>
                    <TabsTrigger value="log">Log de Transações</TabsTrigger>
                </TabsList>
                <TabsContent value="best-worst">
                    <Card>
                        <CardHeader>
                            <CardTitle>Relatório de Produtos Mais e Menos Vendidos</CardTitle>
                            <CardDescription>Produtos com maior e menor saída no mês de {format(new Date(), 'MMMM', { locale: ptBR })}.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="font-semibold mb-2">Top 5 Mais Vendidos</h3>
                                    {salesByProduct.bestSellers.length > 0 ? (
                                        <div className="border rounded-md">
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead className="text-right">Quantidade</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {salesByProduct.bestSellers.map(([name, quantity]) => (
                                                    <TableRow key={name}><TableCell>{name}</TableCell><TableCell className="text-right">{quantity}</TableCell></TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        </div>
                                    ) : <p className="text-center text-muted-foreground p-4">Nenhuma venda registrada este mês.</p>}
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-2">Top 5 Menos Vendidos</h3>
                                    {salesByProduct.worstSellers.length > 0 ? (
                                        <div className="border rounded-md">
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead className="text-right">Quantidade</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {salesByProduct.worstSellers.map(([name, quantity]) => (
                                                    <TableRow key={name}><TableCell>{name}</TableCell><TableCell className="text-right">{quantity}</TableCell></TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        </div>
                                    ) : <p className="text-center text-muted-foreground p-4">Nenhuma venda registrada este mês.</p>}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="comparison">
                    <Card>
                        <CardHeader>
                            <CardTitle>Comparativo de Vendas do Top 5</CardTitle>
                            <CardDescription>Compare as vendas dos 5 produtos mais vendidos nos últimos meses.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <Select onValueChange={(value) => setComparisonMonths(Number(value) as 3 | 6 | 12)}>
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder="Comparar com..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="3">Últimos 3 meses</SelectItem>
                                        <SelectItem value="6">Últimos 6 meses</SelectItem>
                                        <SelectItem value="12">Últimos 12 meses</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Separator />
                            {comparisonMonths && monthlyComparisonData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={monthlyComparisonData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip contentStyle={{backgroundColor: 'hsl(var(--background))'}}/>
                                        <Legend />
                                        {top5ProductNames.map((productName, index) => (
                                            <Bar 
                                                key={productName} 
                                                dataKey={productName} 
                                                stackId="a" 
                                                fill={CHART_COLORS[index % CHART_COLORS.length]} 
                                                name={productName} 
                                            />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-center text-muted-foreground pt-4">Selecione um período para gerar o comparativo.</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="log">
                    <Card>
                        <CardHeader>
                            <CardTitle>Log de Entradas e Saídas</CardTitle>
                            <CardDescription>Visualize todas as transações de estoque com filtros.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
                                <Input type="date" placeholder="Data" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-full"/>
                                <Input placeholder="Operador" value={operatorFilter} onChange={e => setOperatorFilter(e.target.value)} className="w-full" />
                                <Input placeholder="Item" value={itemFilter} onChange={e => setItemFilter(e.target.value)} className="w-full" />
                                <Select value={actionFilter} onValueChange={(value) => setActionFilter(value as StockLogAction | 'all')}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Ação (Todas)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas as Ações</SelectItem>
                                        <SelectItem value="Entrada">Entrada</SelectItem>
                                        <SelectItem value="Saída">Saída</SelectItem>
                                        <SelectItem value="Perda">Perda</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button variant="outline" onClick={handleClearFilters} className="w-full">Limpar Filtros</Button>
                            </div>
                            <Separator />
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Produto</TableHead>
                                            <TableHead>Quantidade</TableHead>
                                            <TableHead>Ação</TableHead>
                                            <TableHead>Data</TableHead>
                                            <TableHead>Operador</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredLogs.length > 0 ? (
                                            filteredLogs.map(log => (
                                                <TableRow key={log.id}>
                                                    <TableCell className="font-medium">{log.productName}</TableCell>
                                                    <TableCell>{log.quantityChange}</TableCell>
                                                    <TableCell>
                                                        <span className={log.action === 'Entrada' ? 'text-green-600' : 'text-red-600'}>{log.action}</span>
                                                    </TableCell>
                                                    <TableCell>{format(log.date.toDate(), 'dd/MM/yyyy HH:mm')}</TableCell>
                                                    <TableCell>{log.operatorName}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center">
                                                    Nenhum registro encontrado para os filtros aplicados.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
