'use client';
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, eachDayOfInterval, startOfDay, endOfDay, getMonth, getWeekOfMonth, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

import { getCashFlowEntries, getProductSaleEntries, getPaymentFees, getDailyMetrics, getFixedCost } from "@/lib/data";
import { useShop } from "@/contexts/shop-context";
import { useFirestore } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn, formatCurrency } from "@/lib/utils";
import { CalendarIcon, Loader2, TrendingUp, TrendingDown, Wallet, Lightbulb, CheckCircle, AlertTriangle, Star, HandCoins, Target } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, ReferenceLine } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const formSchema = z.object({
  dateRange: z.object({
    from: z.date({ required_error: "Data inicial é obrigatória." }),
    to: z.date({ required_error: "Data final é obrigatória." }),
  }),
});

type AnalystInsightData = {
  topExpense: { name: string; amount: number } | null;
  peakSaleWeek: { week: string; amount: number } | null;
  starProduct: { name: string; quantity: number } | null;
  dominantPayment: { name: string; amount: number } | null;
  verdict: { netProfit: number } | null;
};

type ReportData = {
  overview: {
    totalIncome: number;
    totalOutcome: number;
    netBalance: number;
    totalFees: number;
    proportionalFixedCost: number;
    netProfit: number;
    averageTicket: number;
  };
  dailySales: { date: string; sales: number }[];
  dailyBreakEven: number;
  incomeComposition: { method: string; amount: number; }[];
  feeDetails: { method: string; declared: number; feePercentage: number; net: number; }[];
  expenseDetails: {
    byType: { type: string; amount: number; }[];
    topExpenses: { description: string; amount: number; }[];
  };
  salesPerformance: { productType: string; amount: number; }[];
  analystInsights: AnalystInsightData;
  hasData: boolean;
};

const PIE_COLORS = ['#3F51B5', '#4CAF50', '#FFC107', '#F44336', '#9C27B0', '#03A9F4', '#FF9800'];

export default function RelatorioFluxoCaixaPage() {
  const { selectedShop } = useShop();
  const firestore = useFirestore();
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);

  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setReport(null);

    if (!firestore || !selectedShop) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Firestore ou loja não inicializados.' });
      setIsLoading(false);
      return;
    }
    
    try {
      const startDate = startOfDay(values.dateRange.from);
      const endDate = endOfDay(values.dateRange.to);

      const [cashFlowEntries, productSales, paymentFeesData, dailyMetrics, fixedCostData] = await Promise.all([
        getCashFlowEntries(firestore, selectedShop, startDate, endDate),
        getProductSaleEntries(firestore, selectedShop, startDate, endDate),
        getPaymentFees(firestore, selectedShop),
        getDailyMetrics(firestore, selectedShop, startDate, endDate),
        getFixedCost(firestore, selectedShop)
      ]);
      
      const hasTransactions = cashFlowEntries.length > 0 || productSales.length > 0 || dailyMetrics.length > 0;

       if (!hasTransactions) {
        setReport({ hasData: false } as ReportData);
        setIsLoading(false);
        return;
      }
      
      const monthlyFixedCosts = fixedCostData?.amount || 0;
      const paymentFeesMap = paymentFeesData.reduce((acc, fee) => { acc[fee.paymentMethod] = fee.feePercentage; return acc; }, {} as Record<string, number>);
      
      const incomeEntries = cashFlowEntries.filter(e => e.type === 'Entrada');
      const totalIncome = incomeEntries.reduce((sum, e) => sum + e.amount, 0);
      
      const expenses = cashFlowEntries.filter(e => e.type === 'Saída');
      const totalOutcome = expenses.reduce((sum, e) => sum + e.amount, 0);

      const incomeByMethod: Record<string, number> = {};
      incomeEntries.forEach(e => { incomeByMethod[e.paymentMethod] = (incomeByMethod[e.paymentMethod] || 0) + e.amount; });
      
      let totalFees = 0;
      const feeDetails = Object.entries(incomeByMethod).map(([method, declared]) => {
            if (method === 'Dinheiro') return null;
            const feePercentage = paymentFeesMap[method] || 0;
            const feeAmount = declared * (feePercentage / 100);
            totalFees += feeAmount;
            return { method, declared, feePercentage, net: declared - feeAmount };
        }).filter((fee): fee is NonNullable<typeof fee> => fee !== null);
      
      const daysInPeriod = eachDayOfInterval({ start: startDate, end: endDate });
      const dailyBreakEven = monthlyFixedCosts > 0 ? monthlyFixedCosts / 30 : 0;
      const proportionalFixedCost = dailyBreakEven * daysInPeriod.length;

      const netBalance = totalIncome - totalOutcome;
      const netProfit = netBalance - totalFees;
      
      const totalSalesCount = dailyMetrics.reduce((sum, m) => sum + m.numberOfSales, 0);
      const averageTicket = totalSalesCount > 0 ? totalIncome / totalSalesCount : 0;

      const expenseByDescription: Record<string, number> = {};
      expenses.forEach(e => { expenseByDescription[e.description || 'Outras Despesas'] = (expenseByDescription[e.description || 'Outras Despesas'] || 0) + e.amount; });
      
      const expenseDetailsByType = Object.entries(expenseByDescription).map(([type, amount]) => ({ type, amount })).filter(i => i.amount > 0);
      const topExpenses = [...expenseDetailsByType].sort((a,b) => b.amount - a.amount).slice(0, 3).map(e => ({ description: e.type, amount: e.amount }));
      
      const salesByProductType: Record<string, number> = {};
      productSales.forEach(sale => { salesByProductType[sale.productCategory] = (salesByProductType[sale.productCategory] || 0) + sale.quantity; });
      const salesPerformance = Object.entries(salesByProductType).sort(([, a], [, b]) => b - a).slice(0, 5).map(([productType, amount]) => ({ productType, amount }));

      const dailySalesMap = new Map<string, number>();
      daysInPeriod.forEach(day => {
          dailySalesMap.set(format(day, 'yyyy-MM-dd'), 0);
      });
      incomeEntries.forEach(entry => {
        const dayKey = format(entry.date.toDate(), 'yyyy-MM-dd');
        if (dailySalesMap.has(dayKey)) {
          dailySalesMap.set(dayKey, (dailySalesMap.get(dayKey) || 0) + entry.amount);
        }
      });
      const dailySales = Array.from(dailySalesMap.entries())
        .map(item => ({
            fullDate: item[0],
            sales: item[1]
        }))
        .sort((a, b) => a.fullDate.localeCompare(b.fullDate))
        .map(item => ({
            date: format(new Date(`${item.fullDate}T12:00:00`), 'dd/MM'),
            sales: item.sales
        }));

      const topExpenseInsight = expenseDetailsByType.length > 0 ? expenseDetailsByType.sort((a,b) => b.amount - a.amount)[0] : null;
      const dominantPaymentInsight = Object.entries(incomeByMethod).length > 0 ? Object.entries(incomeByMethod).sort(([,a],[,b]) => b - a)[0] : null;
      const starProductInsight = salesPerformance.length > 0 ? salesPerformance[0] : null;
      const salesByWeek: Record<string, number> = {};
      const monthNames = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
      incomeEntries.forEach(entry => {
        const date = entry.date.toDate();
        const weekKey = `SEM-${getWeekOfMonth(date, { weekStartsOn: 1 })} ${monthNames[getMonth(date)]}`;
        salesByWeek[weekKey] = (salesByWeek[weekKey] || 0) + entry.amount;
      });
      const peakSaleWeekEntry = Object.entries(salesByWeek).length > 0 ? Object.entries(salesByWeek).sort(([,a],[,b]) => b-a)[0] : null;

      setReport({
        overview: { totalIncome, totalOutcome, netBalance, totalFees, proportionalFixedCost, netProfit, averageTicket },
        dailySales, dailyBreakEven,
        incomeComposition: Object.entries(incomeByMethod).map(([method, amount]) => ({ method, amount })),
        feeDetails,
        expenseDetails: { byType: expenseDetailsByType, topExpenses },
        salesPerformance: salesPerformance,
        hasData: true,
        analystInsights: {
            topExpense: topExpenseInsight ? { name: topExpenseInsight.type, amount: topExpenseInsight.amount } : null,
            peakSaleWeek: peakSaleWeekEntry ? { week: peakSaleWeekEntry[0], amount: peakSaleWeekEntry[1] } : null,
            starProduct: starProductInsight ? { name: starProductInsight.productType, quantity: starProductInsight.amount } : null,
            dominantPayment: dominantPaymentInsight ? { name: dominantPaymentInsight[0], amount: dominantPaymentInsight[1] } : null,
            verdict: { netProfit }
        }
      });

    } catch (error) {
      console.error("Failed to generate report:", error);
      toast({ variant: "destructive", title: "Erro ao gerar relatório", description: "Houve um problema ao processar os dados." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">Relatório de Fluxo de Caixa</h1><p className="text-muted-foreground">Gere um relatório analítico para <span className="font-semibold text-primary">{selectedShop}</span></p></div>

      <Card>
        <CardHeader><CardTitle>Gerar Novo Relatório</CardTitle><CardDescription>Selecione o período para a análise. Os custos fixos são buscados da tela de configurações.</CardDescription></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col md:flex-row md:items-end gap-4">
              <FormField control={form.control} name="dateRange" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Período do Relatório</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full md:w-[350px] justify-start text-left font-normal",!field.value?.from && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value?.from ? (field.value.to ? (<>{format(field.value.from, "PPP", { locale: ptBR })} -{" "}{format(field.value.to, "PPP", { locale: ptBR })}</>) : (format(field.value.from, "PPP", { locale: ptBR }))) : (<span>Selecione um período</span>)}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={field.value?.from} selected={field.value} onSelect={field.onChange} numberOfMonths={2} locale={ptBR} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
              <Button type="submit" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Gerar Relatório</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {isLoading && (<div className="text-center p-8"><Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" /><p className="mt-4 text-muted-foreground">Analisando os dados... Isso pode levar um momento.</p></div>)}

      {report && (
        <div className="space-y-6">
            {!report.hasData ? (<Card><CardHeader><CardTitle>Nenhum dado encontrado</CardTitle></CardHeader><CardContent><p>Não foram encontrados registros financeiros ou de vendas para o período e loja selecionados.</p></CardContent></Card>) : (
            <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Faturamento Bruto</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(report.overview.totalIncome)}</div></CardContent></Card>
                  <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Saídas Variáveis</CardTitle><TrendingDown className="h-4 w-4 text-muted-foreground text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(report.overview.totalOutcome)}</div><p className="text-xs text-muted-foreground">Não inclui custos fixos</p></CardContent></Card>
                   <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ticket Médio</CardTitle><HandCoins className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(report.overview.averageTicket)}</div></CardContent></Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Lucro Real</CardTitle><Wallet className="h-4 w-4 text-muted-foreground" /></CardHeader>
                    <CardContent>
                        <div className={cn("text-2xl font-bold", report.overview.netProfit >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(report.overview.netProfit)}</div>
                        <p className="text-xs text-muted-foreground">Balanço após taxas de pagamento.</p>
                    </CardContent>
                  </Card>
                </div>
                
                {report.dailySales.length > 0 && report.dailyBreakEven > 0 && (
                    <Card><CardHeader><CardTitle>Vendas Diárias vs Ponto de Equilíbrio</CardTitle><CardDescription>Comparativo de vendas diárias com a meta de break-even diário de <span className="font-semibold text-primary">{formatCurrency(report.dailyBreakEven)}</span>.</CardDescription></CardHeader><CardContent className="pl-2"><ResponsiveContainer width="100%" height={300}><BarChart data={report.dailySales} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}><XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/><YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`}/><Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{fill: 'hsl(var(--muted))'}}/><Bar dataKey="sales" name="Vendas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /><ReferenceLine y={report.dailyBreakEven} label={{ value: `Meta: ${formatCurrency(report.dailyBreakEven)}`, position: "insideTopRight", fill: "hsl(var(--foreground))", fontSize: 10 }} stroke="hsl(var(--destructive))" strokeDasharray="3 3" /></BarChart></ResponsiveContainer></CardContent></Card>
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                    {report.incomeComposition.length > 0 && (<Card><CardHeader><CardTitle>Composição de Recebimentos</CardTitle><CardDescription>Valor bruto total recebido por forma de pagamento.</CardDescription></CardHeader><CardContent className="pl-2"><ResponsiveContainer width="100%" height={300}><BarChart data={report.incomeComposition}><XAxis dataKey="method" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/><YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`}/><Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{fill: 'hsl(var(--muted))'}}/><Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>)}
                    {report.expenseDetails.topExpenses.length > 0 && (<Card><CardHeader><CardTitle>Top 3 Maiores Gastos</CardTitle><CardDescription>Os itens que mais impactaram as saídas no período.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader><TableBody>{report.expenseDetails.topExpenses.map((expense, index) => (<TableRow key={index}><TableCell className="font-medium">{expense.description}</TableCell><TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>)}
                </div>

                {report.feeDetails.length > 0 && (<Card><CardHeader><CardTitle>Detalhamento de Taxas por Pagamento</CardTitle><CardDescription>Análise do valor líquido recebido após as taxas de cada método.</CardDescription></CardHeader><CardContent><div className="space-y-4">{report.feeDetails.map((item) => (<div key={item.method} className="p-3 bg-muted/50 rounded-lg"><h4 className="font-semibold text-lg mb-2">{item.method}</h4><div className="flex flex-wrap items-center justify-between text-sm gap-4"><div className="flex items-center"><span className="text-muted-foreground mr-2">VALOR DECLARADO:</span><span className="font-mono">{formatCurrency(item.declared)}</span></div><div className="flex items-center"><span className="text-muted-foreground mr-2">TAXA:</span><span className="font-mono">{item.feePercentage.toFixed(2)}%</span></div><div className="flex items-center font-bold"><span className="text-muted-foreground mr-2">VALOR REAL:</span><span className="font-mono text-primary">{formatCurrency(item.net)}</span></div></div></div>))}</div></CardContent></Card>)}
                
                <div className="grid gap-6 lg:grid-cols-2">
                    {report.expenseDetails.byType.length > 0 && (<Card className="lg:col-span-1"><CardHeader><CardTitle>Detalhamento de Despesas</CardTitle><CardDescription>Distribuição das saídas por descrição.</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={report.expenseDetails.byType} dataKey="amount" nameKey="type" cx="50%" cy="50%" outerRadius={80} label>{report.expenseDetails.byType.map((entry, index) => (<Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />))}</Pie><Tooltip formatter={(value: number) => formatCurrency(value)} /><Legend/></PieChart></ResponsiveContainer></CardContent></Card>)}
                    {report.salesPerformance.length > 0 && (<Card className="lg:col-span-1"><CardHeader><CardTitle>Performance de Vendas</CardTitle><CardDescription>Top 5 categorias mais vendidas (por quantidade).</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Produto</TableHead><TableHead className="text-right">Quantidade</TableHead></TableRow></TableHeader><TableBody>{report.salesPerformance.map((item, index) => (<TableRow key={index}><TableCell className="font-medium">{item.productType}</TableCell><TableCell className="text-right">{Number.isInteger(item.amount) ? item.amount : item.amount.toFixed(3)}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>)}
                </div>

                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="text-yellow-400" />Insights do Analista</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {report.analystInsights.topExpense && (<Card className="flex flex-col items-center justify-center p-4 text-center"><AlertTriangle className="h-8 w-8 text-destructive mb-2" /><p className="text-sm font-bold">Maior Gasto</p><p className="text-lg text-muted-foreground truncate w-full" title={report.analystInsights.topExpense.name}>{report.analystInsights.topExpense.name}</p><p className="text-sm font-semibold text-destructive">{formatCurrency(report.analystInsights.topExpense.amount)}</p></Card>)}
                             {report.analystInsights.peakSaleWeek && (<Card className="flex flex-col items-center justify-center p-4 text-center"><TrendingUp className="h-8 w-8 text-green-500 mb-2" /><p className="text-sm font-bold">Pico de Vendas</p><p className="text-lg text-muted-foreground">{report.analystInsights.peakSaleWeek.week}</p><p className="text-sm font-semibold text-green-600">{formatCurrency(report.analystInsights.peakSaleWeek.amount)}</p></Card>)}
                            {report.analystInsights.starProduct && (<Card className="flex flex-col items-center justify-center p-4 text-center"><Star className="h-8 w-8 text-yellow-400 mb-2" /><p className="text-sm font-bold">Produto Estrela</p><p className="text-lg text-muted-foreground truncate w-full" title={report.analystInsights.starProduct.name}>{report.analystInsights.starProduct.name}</p><p className="text-sm font-semibold">{`${report.analystInsights.starProduct.quantity.toFixed(Number.isInteger(report.analystInsights.starProduct.quantity) ? 0 : 3)} un.`}</p></Card>)}
                             {report.analystInsights.dominantPayment && (<Card className="flex flex-col items-center justify-center p-4 text-center"><HandCoins className="h-8 w-8 text-blue-500 mb-2" /><p className="text-sm font-bold">Pagamento Dominante</p><p className="text-lg text-muted-foreground">{report.analystInsights.dominantPayment.name}</p><p className="text-sm font-semibold text-blue-600">{formatCurrency(report.analystInsights.dominantPayment.amount)}</p></Card>)}
                        </div>
                        {report.analystInsights.verdict && (<Card className="p-4 bg-muted/30 mt-4"><div className="flex items-center gap-4"><div><Lightbulb className="h-10 w-10 text-blue-500" /></div><div><h4 className="font-bold text-lg">Veredito</h4><p className={cn("text-lg font-semibold", report.analystInsights.verdict.netProfit >= 0 ? 'text-green-600' : 'text-red-600')}>{report.analystInsights.verdict.netProfit >= 0 ? `O período fechou com lucro de ${formatCurrency(report.analystInsights.verdict.netProfit)}.` : `O período fechou com prejuízo de ${formatCurrency(report.analystInsights.verdict.netProfit)}.`}</p><p className="text-sm text-muted-foreground">Este é o balanço final considerando todas as entradas, saídas e taxas de pagamento.</p></div></div></Card>)}
                    </CardContent>
                </Card>
            </>
        )}
        </div>
      )}
    </div>
  );
}
