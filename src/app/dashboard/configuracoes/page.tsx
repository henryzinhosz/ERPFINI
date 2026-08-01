'use client';
import { useState, useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
    getProducts, addProduct, getProductCategories, addProductCategory, getPaymentFees, 
    updatePaymentFees, Product as ProductData, ProductCategory as ProductCategoryData, PaymentFee,
    deleteProduct, updateProduct, deleteProductCategory, updateProductCategory,
    getFixedCost, updateFixedCost, FixedCost,
} from '@/lib/data';
import { Separator } from '@/components/ui/separator';
import { Loader2, Percent, Pencil, X } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { useShop } from '@/contexts/shop-context';
import { useAuth } from '@/contexts/auth-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const productSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  type: z.enum(["Nacional", "Importado"], { required_error: "Selecione um tipo." }),
});

const productCategorySchema = z.object({
    name: z.string().min(3, "O nome da categoria deve ter pelo menos 3 caracteres."),
});

const paymentFeeSchema = z.object({
    fees: z.array(z.object({
        id: z.string().optional(),
        method: z.string(),
        percentage: z.coerce.number().min(0, "A taxa não pode ser negativa.").max(100, "A taxa não pode ser maior que 100."),
    })),
});

const fixedCostSchema = z.object({
    amount: z.coerce.number().min(0, "O custo deve ser um valor positivo."),
});

export default function ConfiguracoesPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { user } = useAuth();
    const { selectedShop } = useShop();

    const [productList, setProductList] = useState<ProductData[]>([]);
    const [productCategoryList, setProductCategoryList] = useState<ProductCategoryData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fixedCost, setFixedCost] = useState<FixedCost | null>(null);

    const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; type: 'product' | 'category' } | null>(null);
    const [itemToEdit, setItemToEdit] = useState<ProductData | {id: string, name: string, type: 'category'} | null>(null);

    const productForm = useForm<z.infer<typeof productSchema>>({
        resolver: zodResolver(productSchema),
        defaultValues: { name: "", type: undefined }
    });
    
    const editProductForm = useForm<z.infer<typeof productSchema>>({
      resolver: zodResolver(productSchema),
    });

    const productCategoryForm = useForm<z.infer<typeof productCategorySchema>>({
        resolver: zodResolver(productCategorySchema),
        defaultValues: { name: "" }
    });

    const paymentFeeForm = useForm<z.infer<typeof paymentFeeSchema>>({
        resolver: zodResolver(paymentFeeSchema),
    });

    const fixedCostForm = useForm<z.infer<typeof fixedCostSchema>>({
        resolver: zodResolver(fixedCostSchema),
        defaultValues: { amount: 0 }
    });

    const { fields: feeFields } = useFieldArray({
      control: paymentFeeForm.control,
      name: "fees",
    });

    const fetchData = async () => {
        setIsLoading(true);
        if(!firestore || !selectedShop) return;
        try {
            const [products, categories, fees, cost] = await Promise.all([
                getProducts(firestore), 
                getProductCategories(firestore),
                getPaymentFees(firestore, selectedShop),
                getFixedCost(firestore, selectedShop)
            ]);
            setProductList(products);
            setProductCategoryList(categories);
            
            const feeValues: Record<string, { id?: string, percentage: number }> = { Credito: { percentage: 0 }, Debito: { percentage: 0 }, Pix: { percentage: 0 } };
            fees.forEach(fee => { feeValues[fee.paymentMethod] = { id: fee.id, percentage: fee.feePercentage }; });
            paymentFeeForm.reset({
                fees: [
                    { id: feeValues.Credito.id, method: 'Credito', percentage: feeValues.Credito.percentage },
                    { id: feeValues.Debito.id, method: 'Debito', percentage: feeValues.Debito.percentage },
                    { id: feeValues.Pix.id, method: 'Pix', percentage: feeValues.Pix.percentage },
                ]
            });

            setFixedCost(cost);
            if (cost) {
                fixedCostForm.reset({ amount: cost.amount });
            } else {
                fixedCostForm.reset({ amount: 0 });
            }
            
        } catch (error) {
            console.error("Failed to fetch data:", error);
            toast({ variant: 'destructive', title: "Erro ao buscar dados", description: "Não foi possível carregar os dados do Firestore." });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if(firestore && selectedShop) {
            fetchData();
        }
    }, [firestore, selectedShop]);
    
    useEffect(() => {
        if (itemToEdit && 'type' in itemToEdit && itemToEdit.type !== 'category') {
            editProductForm.reset(itemToEdit);
        }
    }, [itemToEdit, editProductForm]);

    async function onProductSubmit(values: z.infer<typeof productSchema>) {
        if (!firestore) return;
        try {
            await addProduct(firestore, values);
            toast({ title: "Sucesso!", description: `Produto "${values.name}" adicionado.` });
            productForm.reset();
            await fetchData();
        } catch (error: any) {
            console.error("Erro ao adicionar produto:", error);
            toast({ variant: 'destructive', title: "Erro", description: error.message });
        }
    }

    async function onProductCategorySubmit(values: z.infer<typeof productCategorySchema>) {
        if (!firestore) return;
        try {
            await addProductCategory(firestore, { name: values.name });
            toast({ title: "Sucesso!", description: `Categoria "${values.name}" adicionada.` });
            productCategoryForm.reset();
            await fetchData();
        } catch (error: any) {
            console.error("Erro ao adicionar categoria:", error);
            toast({ variant: 'destructive', title: "Erro", description: error.message });
        }
    }
    
    async function onFeeSubmit(values: z.infer<typeof paymentFeeSchema>) {
        if (!firestore || !selectedShop) return;
        try {
            await updatePaymentFees(firestore, selectedShop, values.fees);
            toast({ title: "Sucesso!", description: `Taxas para a loja ${selectedShop} atualizadas.` });
            await fetchData();
        } catch (error: any) {
             console.error("Erro ao atualizar taxas:", error);
             toast({ variant: 'destructive', title: "Erro ao atualizar taxas", description: error.message });
        }
    }

    async function onFixedCostSubmit(values: z.infer<typeof fixedCostSchema>) {
        if (!firestore || !selectedShop) return;
        try {
            await updateFixedCost(firestore, selectedShop, values.amount);
            toast({ title: "Sucesso!", description: `Custo fixo para a loja ${selectedShop} atualizado.` });
            await fetchData();
        } catch (error: any) {
             console.error("Erro ao atualizar custo:", error);
             toast({ variant: 'destructive', title: "Erro ao atualizar custo", description: error.message });
        }
    }

    const handleOpenDeleteDialog = (item: {id: string, name: string, type: 'product' | 'category'}) => {
        setItemToDelete(item);
    };

    const handleCloseDeleteDialog = () => setItemToDelete(null);

    const handleDeleteConfirm = async () => {
        if (!itemToDelete || !firestore) return;
        try {
            if (itemToDelete.type === 'product') {
                await deleteProduct(firestore, itemToDelete.id);
            } else {
                await deleteProductCategory(firestore, itemToDelete.id);
            }
            toast({ title: "Sucesso!", description: `"${itemToDelete.name}" foi excluído.` });
            await fetchData();
        } catch (error: any) {
            console.error("Erro ao excluir item:", error);
            toast({ variant: 'destructive', title: "Erro ao excluir", description: error.message });
        } finally {
            handleCloseDeleteDialog();
        }
    };

    const handleOpenEditDialog = (item: ProductData | {id: string, name: string, type: 'category'}) => {
        setItemToEdit(item);
    };

    const handleCloseEditDialog = () => {
        setItemToEdit(null);
        editProductForm.reset();
    };

    const handleEditSubmit = async (values: z.infer<typeof productSchema>) => {
        if (!itemToEdit || !firestore) return;

        try {
            if ('type' in itemToEdit && itemToEdit.type === 'category') {
                if(values.name.trim()) {
                    await updateProductCategory(firestore, itemToEdit.id, values.name);
                    toast({ title: "Sucesso!", description: `Categoria atualizada para "${values.name}".` });
                }
            } else {
                await updateProduct(firestore, itemToEdit.id, values);
                toast({ title: "Sucesso!", description: `Produto "${values.name}" atualizado.` });
            }
            await fetchData();
        } catch (error: any) {
            console.error("Erro ao editar item:", error);
            toast({ variant: 'destructive', title: "Erro ao atualizar", description: error.message });
        } finally {
            handleCloseEditDialog();
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
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
    
    const isEditingCategory = itemToEdit && 'type' in itemToEdit && itemToEdit.type === 'category';

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Configurações de Administrador</h1>
                <p className="text-muted-foreground">Gerencie as opções do sistema para a loja: <span className="font-semibold text-primary">{selectedShop}</span></p>
            </div>

            <Tabs defaultValue="products">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="products">Produtos</TabsTrigger>
                    <TabsTrigger value="categories">Categorias de Venda</TabsTrigger>
                    <TabsTrigger value="fees">Taxas & Custos</TabsTrigger>
                </TabsList>
                
                <TabsContent value="products">
                     <Card>
                        <CardHeader>
                            <CardTitle>Gerenciar Catálogo de Produtos</CardTitle>
                            <CardDescription>Adicione novas balas e doces ao seu catálogo de produtos.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <form onSubmit={productForm.handleSubmit(onProductSubmit)} className="grid gap-4 md:grid-cols-4 items-end">
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="name">Nome do Produto</Label>
                                    <Input id="name" {...productForm.register('name')} placeholder="Ex: Gummy Bear Americano" />
                                    {productForm.formState.errors.name && <p className="text-sm text-destructive">{productForm.formState.errors.name.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="type">Tipo</Label>
                                    <Controller name="type" control={productForm.control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger id="type"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="Nacional">Nacional</SelectItem><SelectItem value="Importado">Importado</SelectItem></SelectContent></Select>)} />
                                    {productForm.formState.errors.type && <p className="text-sm text-destructive">{productForm.formState.errors.type.message}</p>}
                                </div>
                                <Button type="submit">Adicionar Produto</Button>
                            </form>
                             <Separator />
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium">Produtos Cadastrados</h3>
                                <div className="border rounded-md max-h-96 overflow-y-auto">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-muted"><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right w-[100px]">Ações</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {productList.length > 0 ? productList.map(p => (
                                                <TableRow key={p.id} className="group">
                                                    <TableCell>{p.name}</TableCell>
                                                    <TableCell>{p.type}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                                                            <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(p)}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleOpenDeleteDialog({ id: p.id, name: p.name, type: 'product' })}>
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )) : <TableRow><TableCell colSpan={3} className="h-24 text-center">Nenhum produto cadastrado.</TableCell></TableRow>}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="categories">
                     <Card>
                        <CardHeader>
                            <CardTitle>Gerenciar Categorias de Venda</CardTitle>
                            <CardDescription>Adicione ou visualize as categorias usadas no Fluxo de Caixa.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                           <form onSubmit={productCategoryForm.handleSubmit(onProductCategorySubmit)} className="grid gap-4 md:grid-cols-3 items-end">
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="product-category-name">Nome da Nova Categoria</Label>
                                    <Input id="product-category-name" {...productCategoryForm.register('name')} placeholder="Ex: Doce de Leite" />
                                    {productCategoryForm.formState.errors.name && <p className="text-sm text-destructive">{productCategoryForm.formState.errors.name.message}</p>}
                                </div>
                                <Button type="submit" className="w-full">Adicionar Categoria</Button>
                            </form>
                            <Separator />
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium">Categorias Cadastradas</h3>
                                 <div className="border rounded-md max-h-80 overflow-y-auto">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-muted"><TableRow><TableHead>Nome</TableHead><TableHead className="text-right w-[100px]">Ações</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {productCategoryList.length > 0 ? productCategoryList.map(cat => (
                                                <TableRow key={cat.id} className="group">
                                                    <TableCell>{cat.name}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                                                            <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog({ id: cat.id, name: cat.name, type: 'category' })}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleOpenDeleteDialog({ id: cat.id, name: cat.name, type: 'category' })}>
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )) : <TableRow><TableCell colSpan={2} className="h-24 text-center">Nenhuma categoria cadastrada.</TableCell></TableRow>}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="fees">
                    <Card>
                        <CardHeader>
                            <CardTitle>Taxas por Método de Pagamento</CardTitle>
                            <CardDescription>Defina as taxas percentuais para cada forma de pagamento na loja <span className="font-semibold text-primary">{selectedShop}</span>.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={paymentFeeForm.handleSubmit(onFeeSubmit)} className="space-y-6">
                                <div className="grid gap-4 sm:grid-cols-3">
                                {feeFields.map((field, index) => (
                                    <div key={field.id} className="space-y-2">
                                        <Label htmlFor={`fees.${index}.percentage`}>{field.method}</Label>
                                        <div className="relative">
                                            <Input
                                                id={`fees.${index}.percentage`}
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                {...paymentFeeForm.register(`fees.${index}.percentage`)}
                                                className="pl-8"
                                            />
                                            <Percent className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        </div>
                                        {paymentFeeForm.formState.errors.fees?.[index]?.percentage && <p className="text-sm text-destructive">{paymentFeeForm.formState.errors.fees?.[index]?.percentage?.message}</p>}
                                    </div>
                                ))}
                                </div>
                                <Button type="submit">Salvar Taxas</Button>
                            </form>
                        </CardContent>
                    </Card>
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>Custos Fixos Mensais</CardTitle>
                            <CardDescription>Informe o valor total dos custos fixos mensais para a loja <span className="font-semibold text-primary">{selectedShop}</span>. Este valor será usado para calcular o ponto de equilíbrio no relatório de fluxo de caixa.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={fixedCostForm.handleSubmit(onFixedCostSubmit)} className="space-y-4">
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="fixed-cost-amount">Valor Mensal (R$)</Label>
                                        <Input
                                            id="fixed-cost-amount"
                                            type="number"
                                            step="0.01"
                                            placeholder="5000.00"
                                            {...fixedCostForm.register('amount')}
                                        />
                                        {fixedCostForm.formState.errors.amount && <p className="text-sm text-destructive">{fixedCostForm.formState.errors.amount.message}</p>}
                                    </div>
                                </div>
                                <Button type="submit">Salvar Custo Fixo</Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={!!itemToEdit} onOpenChange={(open) => !open && handleCloseEditDialog()}>
              <DialogContent>
                <form onSubmit={editProductForm.handleSubmit(handleEditSubmit)}>
                    <DialogHeader>
                    <DialogTitle>Editar {isEditingCategory ? 'Categoria' : 'Produto'}</DialogTitle>
                    <DialogDescription>
                        Altere os detalhes abaixo e clique em salvar.
                    </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Nome</Label>
                            <Input id="edit-name" {...editProductForm.register('name')} />
                            {editProductForm.formState.errors.name && <p className="text-sm text-destructive">{editProductForm.formState.errors.name.message}</p>}
                        </div>
                        {!isEditingCategory && (
                            <>
                             <div className="space-y-2">
                                <Label htmlFor="edit-type">Tipo</Label>
                                <Controller name="type" control={editProductForm.control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger id="edit-type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Nacional">Nacional</SelectItem><SelectItem value="Importado">Importado</SelectItem></SelectContent></Select>)} />
                                {editProductForm.formState.errors.type && <p className="text-sm text-destructive">{editProductForm.formState.errors.type.message}</p>}
                            </div>
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleCloseEditDialog}>Cancelar</Button>
                        <Button type="submit">Salvar Alterações</Button>
                    </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && handleCloseDeleteDialog()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Isso irá excluir permanentemente o item "{itemToDelete?.name}".
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleCloseDeleteDialog}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

    