'use client';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { getProducts, updateStock, transferStock, Product as ProductData, StockItem, getShopStock } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Loader2, Warehouse, Plus, Minus, MoveRight } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { useState, useEffect, useCallback } from "react";
import { useFirestore } from "@/firebase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShopName } from "@/contexts/shop-context";

const entrySchema = z.object({
  productId: z.string({ required_error: "Selecione um produto." }),
  quantity: z.coerce.number().int().positive("A quantidade deve ser um número positivo."),
});

const transferSchema = z.object({
    productId: z.string({ required_error: "Selecione um produto." }),
    quantity: z.coerce.number().int().positive("A quantidade deve ser um número positivo."),
    destinationShop: z.enum(["Park Shopping", "Madureira Shopping"], { required_error: "Selecione uma loja de destino."}),
});

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

export default function EstoqueCentralPage() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [products, setProducts] = useState<ProductData[]>([]);
  const [centralStock, setCentralStock] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isEntryComboboxOpen, setIsEntryComboboxOpen] = useState(false);
  const [isTransferComboboxOpen, setIsTransferComboboxOpen] = useState(false);
  
  const entryForm = useForm<z.infer<typeof entrySchema>>({
    resolver: zodResolver(entrySchema),
    defaultValues: { productId: undefined, quantity: 0 }
  });

  const transferForm = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    defaultValues: { productId: undefined, quantity: 0, destinationShop: undefined }
  });

  const fetchData = useCallback(async () => {
    if (!firestore) return;
    setIsLoading(true);
    try {
        const [fetchedProducts, fetchedStock] = await Promise.all([
            getProducts(firestore),
            getShopStock(firestore, 'Estoque Central'),
        ]);
        setProducts(fetchedProducts);
        setCentralStock(fetchedStock);
    } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os dados iniciais." });
    } finally {
        setIsLoading(false);
    }
  }, [firestore, toast]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function onEntrySubmit(values: z.infer<typeof entrySchema>) {
    if (!user || !firestore) return;

    const product = products.find(p => p.id === values.productId);
    if (!product) {
        toast({ variant: "destructive", title: "Erro", description: "Produto selecionado é inválido." });
        return;
    }
    
    const result = await updateStock(firestore, 'Estoque Central', product, values.quantity, 'Entrada', user.username);

    if(result.success) {
        toast({ title: "Sucesso!", description: `${values.quantity}x ${product.name} adicionado(s) ao Estoque Central.` });
        entryForm.reset({ productId: undefined, quantity: 0 });
        await fetchData();
    } else {
        toast({ variant: "destructive", title: "Erro ao dar entrada", description: result.message });
    }
  }

  async function onTransferSubmit(values: z.infer<typeof transferSchema>) {
    if (!user || !firestore) return;

    const product = products.find(p => p.id === values.productId);
     if (!product) {
        toast({ variant: "destructive", title: "Erro", description: "Produto selecionado é inválido." });
        return;
    }

    const result = await transferStock(firestore, 'Estoque Central', values.destinationShop, product, values.quantity, user.username);
    
    if (result.success) {
        toast({ title: "Sucesso!", description: `Transferência de ${values.quantity}x ${product.name} para ${values.destinationShop} registrada.` });
        transferForm.reset({ productId: undefined, quantity: 0, destinationShop: undefined });
        await fetchData();
    } else {
        toast({ variant: "destructive", title: "Erro ao transferir", description: result.message });
    }
  }
  
  if (user?.role !== 'admin') {
    return (
        <Card>
           <CardHeader>
               <CardTitle>Acesso Negado</CardTitle>
               <CardDescription>Você não tem permissão para acessar esta página.</CardDescription>
           </CardHeader>
        </Card>
    )
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Warehouse /> Estoque Central</h1>
        <p className="text-muted-foreground">Gerencie o estoque principal e transfira itens para as lojas.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
             <Card>
                <CardHeader>
                  <CardTitle>Movimentar Estoque Central</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="entrada">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="entrada"> <Plus className="mr-2 h-4 w-4" /> Entrada de Produto</TabsTrigger>
                            <TabsTrigger value="transferencia"> <MoveRight className="mr-2 h-4 w-4" /> Transferir para Loja</TabsTrigger>
                        </TabsList>
                        <TabsContent value="entrada" className="pt-6">
                            <Form {...entryForm}>
                                <form onSubmit={entryForm.handleSubmit(onEntrySubmit)} className="space-y-6">
                                     <FormField
                                        control={entryForm.control}
                                        name="productId"
                                        render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Nome do Produto</FormLabel>
                                            <Popover open={isEntryComboboxOpen} onOpenChange={setIsEntryComboboxOpen}>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                                            {field.value ? products.find((p) => p.id === field.value)?.name : "Selecione um produto"}
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                    <Command><CommandInput placeholder="Buscar produto..." /><CommandEmpty>Nenhum produto encontrado.</CommandEmpty><CommandGroup>
                                                        {products.map((p) => (<CommandItem value={p.name} key={p.id} onSelect={(currentValue) => {
                                                            const product = products.find(prod => prod.name.toLowerCase() === currentValue.toLowerCase());
                                                            if (product) {
                                                                entryForm.setValue("productId", product.id);
                                                            }
                                                            setIsEntryComboboxOpen(false);
                                                        }}>
                                                            <Check className={cn("mr-2 h-4 w-4", p.id === field.value ? "opacity-100" : "opacity-0")} />
                                                            {p.name}
                                                        </CommandItem>))}
                                                    </CommandGroup></Command>
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <FormField control={entryForm.control} name="quantity" render={({ field }) => (<FormItem><FormLabel>Quantidade</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <Button type="submit" disabled={entryForm.formState.isSubmitting}>
                                        {entryForm.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                        Registrar Entrada
                                    </Button>
                                </form>
                            </Form>
                        </TabsContent>
                        <TabsContent value="transferencia" className="pt-6">
                             <Form {...transferForm}>
                                <form onSubmit={transferForm.handleSubmit(onTransferSubmit)} className="space-y-6">
                                    <FormField
                                        control={transferForm.control}
                                        name="productId"
                                        render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Nome do Produto</FormLabel>
                                            <Popover open={isTransferComboboxOpen} onOpenChange={setIsTransferComboboxOpen}>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                                            {field.value ? products.find((p) => p.id === field.value)?.name : "Selecione um produto"}
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                    <Command><CommandInput placeholder="Buscar produto..." /><CommandEmpty>Nenhum produto encontrado.</CommandEmpty><CommandGroup>
                                                        {products.map((p) => (<CommandItem value={p.name} key={p.id} onSelect={(currentValue) => {
                                                            const product = products.find(prod => prod.name.toLowerCase() === currentValue.toLowerCase());
                                                            if (product) {
                                                                transferForm.setValue("productId", product.id);
                                                            }
                                                            setIsTransferComboboxOpen(false);
                                                        }}>
                                                            <Check className={cn("mr-2 h-4 w-4", p.id === field.value ? "opacity-100" : "opacity-0")} />
                                                            {p.name}
                                                        </CommandItem>))}
                                                    </CommandGroup></Command>
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <FormField control={transferForm.control} name="quantity" render={({ field }) => (<FormItem><FormLabel>Quantidade a Transferir</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>)} />

                                     <FormField
                                        control={transferForm.control}
                                        name="destinationShop"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Loja de Destino</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger><SelectValue placeholder="Selecione para onde transferir" /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Park Shopping">Park Shopping</SelectItem>
                                                    <SelectItem value="Madureira Shopping">Madureira Shopping</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />

                                    <Button type="submit" disabled={transferForm.formState.isSubmitting}>
                                        {transferForm.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MoveRight className="mr-2 h-4 w-4" />}
                                        Realizar Transferência
                                    </Button>
                                </form>
                            </Form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
             </Card>
        </div>
        <div className="lg:col-span-2">
             <Card>
                <CardHeader>
                    <CardTitle>Inventário Central</CardTitle>
                    <CardDescription>Visão geral do que há em casa.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md max-h-[600px] overflow-y-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-muted">
                                <TableRow>
                                    <TableHead>Nome do Produto</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead className="text-right">Quantidade</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {centralStock.length > 0 ? (
                                    centralStock.map(item => (
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
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            Estoque central vazio.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
             </Card>
        </div>
      </div>
    </div>
  );
}
