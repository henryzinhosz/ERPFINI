'use client';
import React, { useState, useMemo, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useShop } from "@/contexts/shop-context";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
    addCashFlowEntry,
    addProductSaleEntry,
    getProductCategories,
    getWeeklyBalance,
    getProductSaleEntries,
    addDailyMetric,
    CashFlowRecord,
    ProductSaleRecord,
    ProductCategory,
    PaymentMethod,
} from "@/lib/data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { format, getWeek, getYear, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2, ChevronsUpDown, Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFirestore } from "@/firebase";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

export default function FluxoDeCaixaPage() {
    const { selectedShop } = useShop();
    const { user } = useAuth();
    const { toast } = useToast();
    const firestore = useFirestore();

    const [cashFlowEntries, setCashFlowEntries] = useState<CashFlowRecord[]>([]);
    const [productSaleEntries, setProductSaleEntries] = useState<ProductSaleRecord[]>([]);
    const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
    const [openWeeks, setOpenWeeks] = useState<Record<string, boolean>>({});
    const [isFetchingData, setIsFetchingData] = useState(true);

    const [dailySales, setDailySales] = useState({ Dinheiro: '', Pix: '', Credito: '', Debito: '' });
    const [salesRegistrationDate, setSalesRegistrationDate] = useState<Date | undefined>(new Date());
    const [salesDateFilter, setSalesDateFilter] = useState<{ start?: Date; end?: Date }>({});
    const [averageTicket, setAverageTicket] = useState('');
    const [numberOfSales, setNumberOfSales] = useState('');

    const [productSale, setProductSale] = useState<{productCategory: string, quantity: string}>({ productCategory: '', quantity: '' });
    const [productSaleDate, setProductSaleDate] = useState<Date | undefined>(new Date());
    const [productSalesDateFilter, setProductSalesDateFilter] = useState<{ start?: Date; end?: Date }>({});
    const [isCategoryComboboxOpen, setIsCategoryComboboxOpen] = useState(false);

    const [expense, setExpense] = useState<{description: string, value: string, paymentMethod: PaymentMethod | ''}>({ description: '', value: '', paymentMethod: 'Debito' });
    const [expenseDate, setExpenseDate] = useState<Date | undefined>(new Date());

    const fetchData = async () => {
        if (!selectedShop || !firestore) return;
        setIsFetchingData(true);
        try {
            const [categories, allCashFlow, allProductSales] = await Promise.all([
              getProductCategories(firestore),
              getWeeklyBalance(firestore, selectedShop),
              getProductSaleEntries(firestore, selectedShop),
            ]);
            setProductCategories(categories);
            allCashFlow.sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime());
            setCashFlowEntries(allCashFlow);
            allProductSales.sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime());

        } catch (e) {
            console.error(e);
            toast({ variant: "destructive", title: "Erro ao buscar dados", description: "Não foi possível carregar os dados iniciais." });
        } finally {
            setIsFetchingData(false);
        }
    }

    useEffect(() => {
        if(firestore && selectedShop) {
            fetchData();
        }
    }, [selectedShop, firestore]);

    const handleRegisterVendas = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !salesRegistrationDate || !selectedShop || !firestore) {
             toast({ variant: "destructive", title: "Erro", description: "Por favor, selecione uma data e loja." });
            return;
        }

        const cashFlowPromises = Object.entries(dailySales).map(([method, amountStr]) => {
            const amount = parseFloat(amountStr);
            if (amount > 0) {
                return addCashFlowEntry(firestore, {
                    unitId: selectedShop, type: 'Entrada', amount,
                    description: `Vendas do dia - ${method}`, paymentMethod: method as PaymentMethod, operatorId: user.username,
                }, salesRegistrationDate);
            }
            return Promise.resolve();
        });
        
        const avgTicketValue = parseFloat(averageTicket);
        const numSalesValue = parseInt(numberOfSales);
        const dailyMetricPromise = (avgTicketValue > 0 && numSalesValue > 0) 
            ? addDailyMetric(firestore, selectedShop, { averageTicket: avgTicketValue, numberOfSales: numSalesValue }, salesRegistrationDate)
            : Promise.resolve();

        try {
            await Promise.all([...cashFlowPromises, dailyMetricPromise]);
            toast({ title: "Sucesso!", description: "Vendas diárias e métricas registradas." });
            setDailySales({ Dinheiro: '', Pix: '', Credito: '', Debito: '' });
            setAverageTicket('');
            setNumberOfSales('');
            fetchData();
        } catch (error) {
            console.error("Erro ao registrar vendas:", error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível registrar as vendas.' });
        }
    };

    const handleRegisterVendaProduto = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !productSale.productCategory || !productSale.quantity || !productSaleDate || !selectedShop || !firestore) {
            toast({ variant: "destructive", title: "Erro", description: "Preencha todos os campos, incluindo a data." });
            return;
        }
        
        try {
            await addProductSaleEntry(firestore, {
                unitId: selectedShop, productCategory: productSale.productCategory,
                quantity: parseFloat(productSale.quantity.replace(',', '.')), operatorId: user.username,
            }, productSaleDate);
    
            toast({ title: "Sucesso!", description: `Venda de ${productSale.quantity} de ${productSale.productCategory} registrada.` });
            setProductSale({ productCategory: '', quantity: '' });
            fetchData();
        } catch (error) {
            console.error("Erro ao registrar venda de produto:", error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível registrar a venda.' });
        }
    };
    
    const handleRegisterDespesa = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !expense.description || !expense.value || !expense.paymentMethod || !expenseDate || !selectedShop || !firestore) {
            toast({ variant: "destructive", title: "Erro", description: "Preencha todos os campos, incluindo a data e o método de pagamento." });
            return;
        }

        try {
            await addCashFlowEntry(firestore, {
                unitId: selectedShop, type: 'Saída', amount: parseFloat(expense.value),
                description: expense.description, operatorId: user.username, paymentMethod: expense.paymentMethod
            }, expenseDate);
    
            toast({ title: "Sucesso!", description: "Despesa registrada." });
            setExpense({ description: '', value: '', paymentMethod: 'Debito' });
            fetchData();
        } catch (error) {
            console.error("Erro ao registrar despesa:", error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível registrar a despesa.' });
        }
    };

    const toggleWeek = (weekKey: string) => {
        setOpenWeeks(prev => ({ ...prev, [weekKey]: !prev[weekKey] }));
    };
    
    const filteredSales = useMemo(() => {
        const { start, end } = salesDateFilter;
        if (!start || !end) return [];
        const startDate = startOfDay(start);
        const endDate = endOfDay(end);
        return cashFlowEntries.filter(entry => {
            if (entry.type !== 'Entrada') return false;
            const entryDate = entry.date.toDate();
            return entryDate >= startDate && entryDate <= endDate;
        });
    }, [cashFlowEntries, salesDateFilter]);
    
    const filteredProductSales = useMemo(() => {
        const { start, end } = productSalesDateFilter;
        if (!start || !end) return [];
        const startDate = startOfDay(start);
        const endDate = endOfDay(end);
        return productSaleEntries.filter(entry => {
            const entryDate = entry.date.toDate();
            return entryDate >= startDate && entryDate <= endDate;
        });
    }, [productSaleEntries, productSalesDateFilter]);

    const salesTotals = useMemo(() => {
        const totals = { Dinheiro: 0, Pix: 0, Credito: 0, Debito: 0, total: 0 };
        filteredSales.forEach(sale => {
            if (sale.paymentMethod && sale.paymentMethod in totals) {
                totals[sale.paymentMethod as keyof typeof totals] += sale.amount;
            }
            totals.total += sale.amount;
        });
        return totals;
    }, [filteredSales]);

    const weeklyBalance = useMemo(() => {
        const entries = cashFlowEntries;
        if (entries.length === 0) return { data: [], totals: { entradas: 0, saidas: 0, balanco: 0 } };

        const weeklyData: Record<string, { entradas: number, saidas: number, transactions: CashFlowRecord[] }> = {};

        entries.forEach(entry => {
            const date = entry.date.toDate();
            const weekNumber = getWeek(date, { weekStartsOn: 1 });
            const year = getYear(date);
            const weekKey = `${year}-W${String(weekNumber).padStart(2, '0')}`;

            if (!weeklyData[weekKey]) {
                weeklyData[weekKey] = { entradas: 0, saidas: 0, transactions: [] };
            }

            weeklyData[weekKey].transactions.push(entry);

            if (entry.type === 'Entrada') weeklyData[weekKey].entradas += entry.amount;
            else weeklyData[weekKey].saidas += entry.amount;
        });
        
        const dataForTable = Object.entries(weeklyData).map(([key, value]) => ({
            week: key,
            ...value,
            balanco: value.entradas - value.saidas,
        })).sort((a, b) => b.week.localeCompare(a.week));
        
        const totals = dataForTable.reduce((acc, week) => ({
            entradas: acc.entradas + week.entradas,
            saidas: acc.saidas + week.saidas,
            balanco: acc.balanco + week.balanco,
        }), { entradas: 0, saidas: 0, balanco: 0 });

        return { data: dataForTable, totals };
    }, [cashFlowEntries]);

    if (isFetchingData && cashFlowEntries.length === 0) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
             <div>
                <h1 className="text-3xl font-bold tracking-tight">Fluxo de Caixa</h1>
                <p className="text-muted-foreground">Gerencie as finanças de: <span className="font-semibold text-primary">{selectedShop}</span></p>
            </div>

            <Tabs defaultValue="vendas" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="vendas">Vendas Diárias</TabsTrigger>
                    <TabsTrigger value="vendas_produto">Vendas por Categoria</TabsTrigger>
                    <TabsTrigger value="despesas">Registro de Saídas</TabsTrigger>
                </TabsList>
                <TabsContent value="vendas">
                    <Card>
                        <CardHeader>
                            <CardTitle>Registro de Vendas por Pagamento</CardTitle>
                            <CardDescription>Adicione as vendas do dia e métricas para o relatório.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                           <form onSubmit={handleRegisterVendas} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end">
                                <div className="space-y-2 lg:col-span-4">
                                    <Label htmlFor="sales-date">Data da Venda</Label>
                                     <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full md:w-[280px] justify-start text-left font-normal",!salesRegistrationDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{salesRegistrationDate ? format(salesRegistrationDate, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={salesRegistrationDate} onSelect={setSalesRegistrationDate} initialFocus /></PopoverContent></Popover>
                                </div>
                                <div className="space-y-2"><Label htmlFor="dinheiro">Dinheiro</Label><Input id="dinheiro" name="Dinheiro" type="number" placeholder="R$ 0,00" value={dailySales.Dinheiro} onChange={(e) => setDailySales(p => ({...p, Dinheiro: e.target.value}))} /></div>
                                <div className="space-y-2"><Label htmlFor="credito">Crédito</Label><Input id="credito" name="Credito" type="number" placeholder="R$ 0,00" value={dailySales.Credito} onChange={(e) => setDailySales(p => ({...p, Credito: e.target.value}))}/></div>
                                <div className="space-y-2"><Label htmlFor="debito">Débito</Label><Input id="debito" name="Debito" type="number" placeholder="R$ 0,00" value={dailySales.Debito} onChange={(e) => setDailySales(p => ({...p, Debito: e.target.value}))}/></div>
                                <div className="space-y-2"><Label htmlFor="pix">Pix</Label><Input id="pix" name="Pix" type="number" placeholder="R$ 0,00" value={dailySales.Pix} onChange={(e) => setDailySales(p => ({...p, Pix: e.target.value}))}/></div>
                                
                                <Separator className="lg:col-span-4" />

                                <div className="space-y-2"><Label htmlFor="average-ticket">Ticket Médio (R$)</Label><Input id="average-ticket" type="number" placeholder="25.50" value={averageTicket} onChange={e => setAverageTicket(e.target.value)} /></div>
                                <div className="space-y-2"><Label htmlFor="number-sales">Nº de Vendas</Label><Input id="number-sales" type="number" placeholder="100" value={numberOfSales} onChange={e => setNumberOfSales(e.target.value)} /></div>
                               
                                <div className="lg:col-span-4 flex justify-end">
                                    <Button type="submit">Registrar Vendas</Button>
                                </div>
                           </form>
                           <Separator />
                           <div className="space-y-4">
                                <h3 className="text-lg font-medium">Visualizar Vendas por Período</h3>
                                <div className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="grid w-full md:w-auto gap-1.5">
                                        <Label>Período</Label>
                                        <Popover><PopoverTrigger asChild><Button id="date" variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal", !salesDateFilter.start && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{salesDateFilter.start ? (salesDateFilter.end ? (<>{format(salesDateFilter.start, "LLL dd, y")} - {format(salesDateFilter.end, "LLL dd, y")}</>) : (format(salesDateFilter.start, "LLL dd, y"))) : (<span>Escolha um período</span>)}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={salesDateFilter.start} selected={{from: salesDateFilter.start, to: salesDateFilter.end}} onSelect={(range) => setSalesDateFilter({start: range?.from, end: range?.to})} numberOfMonths={2} /></PopoverContent></Popover>
                                    </div>
                                </div>

                                {(salesDateFilter.start && salesDateFilter.end) && (
                                    <div className="border rounded-md">
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Operador</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {isFetchingData ? <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow> 
                                                : filteredSales.length > 0 ? filteredSales.map(entry => (
                                                    <TableRow key={entry.id}><TableCell>{format(entry.date.toDate(), 'dd/MM/yyyy')}</TableCell><TableCell>{entry.description}</TableCell><TableCell>{entry.operatorId}</TableCell><TableCell className="text-right">{entry.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell></TableRow>
                                                )) : (<TableRow><TableCell colSpan={4} className="h-24 text-center">Nenhum registro de entrada encontrado para o período.</TableCell></TableRow>)}
                                            </TableBody>
                                            {filteredSales.length > 0 && (
                                            <TableFooter>
                                                <TableRow className="font-semibold"><TableCell colSpan={3}>TOTAL PIX</TableCell><TableCell className="text-right">{salesTotals.Pix.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell></TableRow>
                                                <TableRow className="font-semibold"><TableCell colSpan={3}>TOTAL DINHEIRO</TableCell><TableCell className="text-right">{salesTotals.Dinheiro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell></TableRow>
                                                <TableRow className="font-semibold"><TableCell colSpan={3}>TOTAL CRÉDITO</TableCell><TableCell className="text-right">{salesTotals.Credito.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell></TableRow>
                                                 <TableRow className="font-semibold"><TableCell colSpan={3}>TOTAL DÉBITO</TableCell><TableCell className="text-right">{salesTotals.Debito.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell></TableRow>
                                                <TableRow className="text-lg bg-muted/50"><TableCell colSpan={3}>TOTAL GERAL</TableCell><TableCell className="text-right">{salesTotals.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell></TableRow>
                                            </TableFooter>
                                            )}
                                        </Table>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="vendas_produto">
                    <Card>
                        <CardHeader><CardTitle>Registro de Vendas por Categoria</CardTitle><CardDescription>Adicione as vendas por categoria de produto.</CardDescription></CardHeader>
                        <CardContent className="space-y-8">
                            <form onSubmit={handleRegisterVendaProduto} className="grid gap-4 md:grid-cols-4 items-end">
                                <div className="space-y-2"><Label htmlFor="product-sale-date">Data da Venda</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn( "w-full justify-start text-left font-normal", !productSaleDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{productSaleDate ? format(productSaleDate, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={productSaleDate} onSelect={setProductSaleDate} initialFocus /></PopoverContent></Popover></div>
                                <div className="space-y-2">
                                    <Label htmlFor="product-category">Categoria do Produto</Label>
                                    <Popover open={isCategoryComboboxOpen} onOpenChange={setIsCategoryComboboxOpen}><PopoverTrigger asChild><Button variant="outline" role="combobox" aria-expanded={isCategoryComboboxOpen} className="w-full justify-between">{productSale.productCategory ? productCategories.find((cat) => cat.name === productSale.productCategory)?.name : "Selecione uma categoria"}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Buscar categoria..." /><CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty><CommandGroup>{productCategories.map((cat) => (<CommandItem key={cat.id} value={cat.name} onSelect={(currentValue) => { setProductSale(p => ({ ...p, productCategory: currentValue === p.productCategory ? "" : currentValue })); setIsCategoryComboboxOpen(false);}}><Check className={cn("mr-2 h-4 w-4", productSale.productCategory === cat.name ? "opacity-100" : "opacity-0")} />{cat.name}</CommandItem>))}</CommandGroup></Command></PopoverContent></Popover>
                                </div>
                                <div className="space-y-2"><Label htmlFor="product-quantity">Quantidade Vendida</Label><Input id="product-quantity" type="number" placeholder="Ex: 5 ou 0.359" value={productSale.quantity} onChange={e => setProductSale(p => ({...p, quantity: e.target.value}))} step="0.001"/></div>
                                <div className="flex items-end"><Button type="submit">Adicionar Venda de Produto</Button></div>
                            </form>
                             <Separator />
                           <div className="space-y-4">
                                <h3 className="text-lg font-medium">Visualizar Vendas por Categoria</h3>
                                <div className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="grid w-full md:w-auto gap-1.5">
                                        <Label>Período</Label>
                                        <Popover><PopoverTrigger asChild><Button id="product-sale-date-range" variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal", !productSalesDateFilter.start && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{productSalesDateFilter.start ? (productSalesDateFilter.end ? (<>{format(productSalesDateFilter.start, "LLL dd, y")} - {format(productSalesDateFilter.end, "LLL dd, y")}</>) : (format(productSalesDateFilter.start, "LLL dd, y"))) : (<span>Escolha um período</span>)}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={productSalesDateFilter.start} selected={{from: productSalesDateFilter.start, to: productSalesDateFilter.end}} onSelect={(range) => setProductSalesDateFilter({start: range?.from, end: range?.to})} numberOfMonths={2} /></PopoverContent></Popover>
                                    </div>
                                </div>

                                {(productSalesDateFilter.start && productSalesDateFilter.end) && (
                                    <div className="border rounded-md"><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Categoria</TableHead><TableHead>Quantidade</TableHead><TableHead>Operador</TableHead></TableRow></TableHeader><TableBody>{isFetchingData ? <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow> : filteredProductSales.length > 0 ? filteredProductSales.map(entry => (<TableRow key={entry.id}><TableCell>{format(entry.date.toDate(), 'dd/MM/yyyy')}</TableCell><TableCell>{entry.productCategory}</TableCell><TableCell>{Number.isInteger(entry.quantity) ? entry.quantity : entry.quantity.toFixed(3)}</TableCell><TableCell>{entry.operatorId}</TableCell></TableRow>)) : (<TableRow><TableCell colSpan={4} className="h-24 text-center">Nenhuma venda de categoria encontrada para o período.</TableCell></TableRow>)}</TableBody></Table></div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="despesas">
                    <Card>
                        <CardHeader><CardTitle>Registro de Saídas (Contas)</CardTitle><CardDescription>Registre contas a pagar e visualize o balanço.</CardDescription></CardHeader>
                        <CardContent className="space-y-8">
                            <form onSubmit={handleRegisterDespesa} className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2"><Label htmlFor="expense-date">Data da Despesa</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !expenseDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{expenseDate ? format(expenseDate, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={expenseDate} onSelect={setExpenseDate} initialFocus /></PopoverContent></Popover></div>
                                <div className="space-y-2"><Label htmlFor="expense-description">Descrição da Conta</Label><Input id="expense-description" placeholder="Ex: Aluguel, Conta de Luz" value={expense.description} onChange={e => setExpense(p => ({...p, description: e.target.value}))}/></div>
                                <div className="space-y-2"><Label htmlFor="expense-value">Valor</Label><Input id="expense-value" type="number" placeholder="R$ 0,00" value={expense.value} onChange={e => setExpense(p => ({...p, value: e.target.value}))}/></div>
                                <div className="space-y-2">
                                    <Label htmlFor="expense-payment-method">Método de Pagamento</Label>
                                    <Select value={expense.paymentMethod} onValueChange={value => setExpense(p => ({...p, paymentMethod: value as PaymentMethod}))}>
                                        <SelectTrigger id="expense-payment-method"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                                            <SelectItem value="Pix">Pix</SelectItem>
                                            <SelectItem value="Credito">Crédito</SelectItem>
                                            <SelectItem value="Debito">Débito</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="md:col-span-2 flex justify-end"><Button type="submit">Registrar Despesa</Button></div>
                            </form>
                            <Separator />
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Balanço Semanal de Entradas e Saídas</h3>
                                <div className="border rounded-md">
                                     <Table>
                                        <TableHeader><TableRow><TableHead>Semana</TableHead><TableHead className="text-right text-green-600">Entradas</TableHead><TableHead className="text-right text-red-600">Saídas</TableHead><TableHead className="text-right">Balanço</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                        {weeklyBalance.data.length > 0 ? weeklyBalance.data.map(week => (
                                            <React.Fragment key={week.week}>
                                                <TableRow onClick={() => toggleWeek(week.week)} className="cursor-pointer hover:bg-muted/30" data-state={openWeeks[week.week] ? 'open' : 'closed'}><TableCell className="font-medium flex items-center"><ChevronRight className={cn("h-4 w-4 mr-2 transition-transform", openWeeks[week.week] && "rotate-90")} />Semana {week.week.split('-W')[1].replace(/^0+/, '')}, {week.week.split('-W')[0]}</TableCell><TableCell className="text-right text-green-600">{week.entradas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell><TableCell className="text-right text-red-600">{week.saidas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell><TableCell className={cn("text-right font-semibold", week.balanco >= 0 ? "text-green-700" : "text-red-700")}>{week.balanco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell></TableRow>
                                                {openWeeks[week.week] && (
                                                     <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                        <TableCell colSpan={4} className="p-0">
                                                            <div className="p-4">
                                                                <h4 className="font-semibold mb-2">Detalhes da Semana {week.week.split('-W')[1].replace(/^0+/, '')}</h4>
                                                                {week.transactions.filter(tx => tx.type === 'Saída').length > 0 ? (
                                                                    <Table>
                                                                        <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
                                                                        <TableBody>
                                                                            {week.transactions.filter(tx => tx.type === 'Saída').sort((a,b) => a.date.toDate().getTime() - b.date.toDate().getTime()).map(tx => (
                                                                                <TableRow key={tx.id}><TableCell>{format(tx.date.toDate(), 'dd/MM/yyyy')}</TableCell><TableCell>{tx.description}</TableCell><TableCell className="text-right text-red-600">- {tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell></TableRow>
                                                                            ))}
                                                                        </TableBody>
                                                                    </Table>
                                                                ) : (<p className="text-sm text-muted-foreground text-center py-4">Nenhuma saída registrada para esta semana.</p>)}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </React.Fragment>
                                        )) : (<TableRow><TableCell colSpan={4} className="h-24 text-center">Nenhum registro para exibir o balanço.</TableCell></TableRow>)}
                                        </TableBody>
                                        {weeklyBalance.data.length > 0 && (
                                            <TableFooter><TableRow className="bg-muted/50 font-bold"><TableCell>TOTAL</TableCell><TableCell className="text-right text-green-700">{weeklyBalance.totals.entradas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell><TableCell className="text-right text-red-700">{weeklyBalance.totals.saidas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell><TableCell className="text-right">{weeklyBalance.totals.balanco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell></TableRow></TableFooter>
                                        )}
                                    </Table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
