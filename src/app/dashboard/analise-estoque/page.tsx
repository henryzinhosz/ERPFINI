'use client';
import { useState, useMemo, useEffect } from 'react';
import { useShop, ShopName } from '@/contexts/shop-context';
import { getShopStock, StockItem, getStockLogs, StockTransaction } from '@/lib/data';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';

const getQuantityBadgeVariant = (quantity: number, type: string): 'destructive' | 'secondary' | 'default' => {
  const thresholds = type === 'Importado'
    ? { low: 2, mid: 4 }
    : { low: 5, mid: 10 };

  if (quantity <= thresholds.low) return 'destructive';
  if (quantity <= thresholds.mid) return 'secondary';
  return 'default';
};

const getQuantityStatus = (quantity: number, type: string) => {
    const thresholds = type === 'Importado'
    ? { low: 2, mid: 4 } 
    : { low: 5, mid: 10 };

  if (quantity <= thresholds.low) return 'Baixo';
  if (quantity <= thresholds.mid) return 'Médio';
  return 'Alto';
}

const getCoverageBadgeVariant = (days: number | string): 'destructive' | 'secondary' | 'default' => {
  if (typeof days !== 'number') return 'default';
  if (days < 7) return 'destructive';
  if (days < 30) return 'secondary';
  return 'default';
};


export default function AnaliseEstoquePage() {
  const { selectedShop } = useShop();
  const [searchTerm, setSearchTerm] = useState('');
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [stockLogs, setStockLogs] = useState<StockTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const firestore = useFirestore();

  useEffect(() => {
    const fetchStock = async () => {
        if (!selectedShop || !firestore) return;
        setIsLoading(true);
        try {
            if (selectedShop === 'Estoque Central') {
              const data = await getShopStock(firestore, selectedShop);
              setStockData(data);
              setStockLogs([]); // No logs for central stock
            } else {
              const [data, logs] = await Promise.all([
                  getShopStock(firestore, selectedShop),
                  getStockLogs(firestore, selectedShop as ShopName)
              ]);
              setStockData(data);
              setStockLogs(logs);
            }
        } catch (error) {
            console.error("Failed to fetch stock data:", error);
            toast({ variant: 'destructive', title: "Erro ao buscar estoque", description: "Não foi possível carregar os dados do Firestore." });
        } finally {
            setIsLoading(false);
        }
    };

    fetchStock();
  }, [selectedShop, firestore, toast]);

   const salesData = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesByProduct: Record<string, number> = {};

    stockLogs
        .filter(log => log.action === 'Saída' && log.date && log.date.toDate() > thirtyDaysAgo)
        .forEach(log => {
            salesByProduct[log.stockItemId] = (salesByProduct[log.stockItemId] || 0) + log.quantityChange;
        });
    
    return salesByProduct;
  }, [stockLogs]);

  const tableData = useMemo(() => {
    // This map is a workaround for old data where stockItemId might refer to an item that doesn't exist anymore
    const stockItemNameMap = new Map<string, string>();
    stockData.forEach(item => stockItemNameMap.set(item.id, item.name));
    
    return stockData
      .filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      ).map(item => {
          let daysOfCover: string | number = '∞';
          if(selectedShop !== 'Estoque Central') {
            const salesLast30Days = salesData[item.id] || 0;
            const avgDailySales = salesLast30Days / 30;
            if (avgDailySales > 0) {
                daysOfCover = Math.floor(item.quantity / avgDailySales);
            }
          }
          return { ...item, daysOfCover };
      });
  }, [stockData, searchTerm, salesData, selectedShop]);


  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Análise de Estoque</h1>
            <p className="text-muted-foreground">Visão geral do estoque para: <span className="font-semibold text-primary">{selectedShop}</span></p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Produtos em Estoque</CardTitle>
          <CardDescription>Busque e visualize os produtos em estoque na sua unidade.</CardDescription>
           <div className="relative pt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-[-50%] h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por nome do produto..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full md:w-1/3 pl-10"
              />
            </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Produto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  {selectedShop !== 'Estoque Central' && <TableHead className="text-right">Cobertura</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.length > 0 ? (
                  tableData.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={getQuantityBadgeVariant(item.quantity, item.type)}
                          className={cn({
                            'bg-red-500 text-white': getQuantityBadgeVariant(item.quantity, item.type) === 'destructive',
                            'bg-yellow-400 text-black': getQuantityBadgeVariant(item.quantity, item.type) === 'secondary',
                            'bg-green-500 text-white': getQuantityBadgeVariant(item.quantity, item.type) === 'default',
                          })}
                        >
                            {getQuantityStatus(item.quantity, item.type)}
                        </Badge>
                      </TableCell>
                       {selectedShop !== 'Estoque Central' && (
                        <TableCell className="text-right">
                           <Badge 
                            variant={getCoverageBadgeVariant(item.daysOfCover)}
                            className={cn({
                                'bg-red-500 text-white': getCoverageBadgeVariant(item.daysOfCover) === 'destructive',
                                'bg-yellow-400 text-black': getCoverageBadgeVariant(item.daysOfCover) === 'secondary',
                                'bg-green-500 text-white': getCoverageBadgeVariant(item.daysOfCover) === 'default',
                            })}
                           >
                            {typeof item.daysOfCover === 'number' ? `${item.daysOfCover} dias` : item.daysOfCover}
                           </Badge>
                        </TableCell>
                       )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={selectedShop !== 'Estoque Central' ? 5 : 4} className="h-24 text-center">
                      Nenhum produto encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    