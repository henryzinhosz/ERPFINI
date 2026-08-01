'use client';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useShop } from "@/contexts/shop-context";
import { useAuth } from "@/contexts/auth-context";
import { getProducts, updateStock, Product as ProductData } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { useState, useEffect } from "react";
import { useFirestore } from "@/firebase";

const formSchema = z.object({
  productId: z.string({ required_error: "Selecione um produto." }),
  quantity: z.coerce.number().int().positive("A quantidade deve ser um número positivo."),
  action: z.enum(["Entrada", "Saída", "Perda"], { required_error: "Selecione uma ação." }),
  operatorName: z.string().optional(),
});


export default function GerenciamentoEstoquePage() {
  const { selectedShop } = useShop();
  const { user } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        productId: undefined,
        quantity: 0,
        action: undefined,
        operatorName: user?.role === 'admin' ? 'Administrador' : '',
    }
  });

  // Efeito para setar o valor padrão do operador
  useEffect(() => {
    if (user?.role === 'admin') {
      form.setValue('operatorName', 'Administrador');
      form.clearErrors('operatorName');
    } else {
      form.setValue('operatorName', '');
    }
  }, [user, form]);
  
  // Efeito para carregar produtos
  useEffect(() => {
    async function fetchProducts() {
        if (!firestore) return;
        setIsLoading(true);
        try {
            const fetchedProducts = await getProducts(firestore);
            setProducts(fetchedProducts);
        } catch (error) {
            console.error("Failed to fetch products:", error);
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar a lista de produtos." });
        } finally {
            setIsLoading(false);
        }
    }
    fetchProducts();
  }, [firestore, toast]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !selectedShop || !firestore) {
      toast({ variant: "destructive", title: "Erro", description: "Usuário ou loja não selecionada." });
      return;
    }

    const product = products.find(p => p.id === values.productId);
    if (!product) {
      toast({ variant: "destructive", title: "Erro", description: "Produto não encontrado." });
      return;
    }
    
    // Se o usuário não for admin e o nome do operador estiver vazio, forçar erro.
    const operator = values.operatorName || (user?.role === 'admin' ? 'Administrador' : '');
    if (user.role !== 'admin' && (!operator || operator.length < 3)) {
        form.setError("operatorName", { type: "manual", message: "O nome do operador é obrigatório (mínimo 3 caracteres)." });
        return;
    }

    const result = await updateStock(
        firestore,
        selectedShop,
        product,
        values.quantity,
        values.action,
        operator
    );

    if (result.success) {
        toast({
          title: "Sucesso!",
          description: `Ação de ${values.action} de ${values.quantity}x ${product.name} registrada por ${operator}.`,
        });
        
        form.reset({
            productId: undefined,
            quantity: 0,
            action: undefined,
            operatorName: user.role === 'admin' ? 'Administrador' : '',
        });
        if (isComboboxOpen) setIsComboboxOpen(false);
    } else {
        toast({ variant: "destructive", title: "Erro ao atualizar estoque", description: result.message });
    }
  }

  if (isLoading || !user) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Estoque</h1>
        <p className="text-muted-foreground">Registre entradas e saídas de produtos para: <span className="font-semibold text-primary">{selectedShop}</span></p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Registrar Movimentação</CardTitle>
          <CardDescription>Preencha os campos para adicionar ou remover itens do estoque.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
               <FormField
                control={form.control}
                name="operatorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Operador</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={user?.role !== 'admin' ? "Digite seu nome" : ""} 
                        {...field} 
                        disabled={user?.role === 'admin'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Nome do Produto</FormLabel>
                    <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={isComboboxOpen}
                                    className={cn(
                                    "w-full justify-between",
                                    !field.value && "text-muted-foreground"
                                    )}
                                >
                                    {field.value
                                    ? products.find((p) => p.name.toLowerCase() === field.value.toLowerCase())?.name
                                    : "Selecione um produto"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Buscar produto..." />
                                <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                                <CommandGroup>
                                {products.map((p) => (
                                    <CommandItem
                                    value={p.name}
                                    key={p.id}
                                    onSelect={(currentValue) => {
                                        const product = products.find(prod => prod.name.toLowerCase() === currentValue.toLowerCase());
                                        if (product) {
                                            form.setValue("productId", product.id, { shouldValidate: true });
                                        }
                                        setIsComboboxOpen(false);
                                    }}
                                    >
                                    <Check
                                        className={cn(
                                        "mr-2 h-4 w-4",
                                        products.find(prod => prod.name.toLowerCase() === field.value?.toLowerCase())?.id === p.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {p.name}
                                    </CommandItem>
                                ))}
                                </CommandGroup>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="action"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Ação</FormLabel>
                    <FormControl>
                       <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value || ''}
                        className="flex flex-row space-x-4"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Entrada" />
                          </FormControl>
                          <FormLabel className="font-normal">Entrada</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Saída" />
                          </FormControl>
                          <FormLabel className="font-normal">Saída</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Perda" />
                          </FormControl>
                          <FormLabel className="font-normal">Perda</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
