'use client';
import React, { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { ShopName } from "@/contexts/shop-context";
import { useAuth } from "@/contexts/auth-context";
import { bulkAddCashFlowAndMetrics } from "@/lib/data";
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2, PlusCircle, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form } from "@/components/ui/form";


const daySchema = z.object({
  importDate: z.date({ required_error: "A data é obrigatória." }),
  shop: z.nativeEnum(ShopName, { required_error: "A loja é obrigatória." }),
  dinheiro: z.coerce.number().min(0).optional().default(0),
  credito: z.coerce.number().min(0).optional().default(0),
  debito: z.coerce.number().min(0).optional().default(0),
  pix: z.coerce.number().min(0).optional().default(0),
  averageTicket: z.coerce.number().min(0).optional().default(0),
  numberOfSales: z.coerce.number().int().min(0).optional().default(0),
});

const importSchema = z.object({
  days: z.array(daySchema).min(1, "Adicione pelo menos um dia para importar."),
});

export default function ImportacaoDadosAntigosPage() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof importSchema>>({
    resolver: zodResolver(importSchema),
    defaultValues: {
      days: [],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "days"
  });

  useEffect(() => {
    // Add one empty row on initial load
    if (fields.length === 0) {
      append({
        shop: ShopName.ParkShopping,
        importDate: new Date(),
        dinheiro: 0,
        credito: 0,
        debito: 0,
        pix: 0,
        averageTicket: 0,
        numberOfSales: 0,
      });
    }
  }, []);

  async function onSubmit(values: z.infer<typeof importSchema>) {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário ou sistema não inicializado.' });
      return;
    }
    setIsSubmitting(true);

    const entriesToImport = values.days.map(day => ({...day, operatorId: user.username}));

    try {
      await bulkAddCashFlowAndMetrics(firestore, entriesToImport);
      
      toast({
        title: "Sucesso!",
        description: `${values.days.length} dia(s) de dados foram importados.`,
      });

      // Reset the form to a single empty row
      form.reset();
      remove(); // Clears all rows
      append({ // Adds a fresh row
        shop: ShopName.ParkShopping,
        importDate: new Date(),
        dinheiro: 0,
        credito: 0,
        debito: 0,
        pix: 0,
        averageTicket: 0,
        numberOfSales: 0,
      });

    } catch (error) {
      console.error("Failed to bulk import old data:", error);
      toast({ variant: 'destructive', title: 'Erro na importação', description: 'Não foi possível salvar os dados em lote.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (user?.role !== 'admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acesso Negado</CardTitle>
          <CardDescription>Você precisa ser um administrador para acessar esta página.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  const addNewDay = () => {
    const lastDay = fields[fields.length - 1];
    append({
        shop: lastDay?.shop || ShopName.ParkShopping,
        importDate: new Date(),
        dinheiro: 0,
        credito: 0,
        debito: 0,
        pix: 0,
        averageTicket: 0,
        numberOfSales: 0,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Importação em Massa</h1>
        <p className="text-muted-foreground">
          Use esta ferramenta para inserir os totais de vendas de múltiplos dias de uma só vez.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Registrar Dados Históricos</CardTitle>
          <CardDescription>
            Adicione uma linha para cada dia que deseja importar e depois clique em "Salvar Todos os Dados".
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[250px]">Data</TableHead>
                      <TableHead className="min-w-[200px]">Loja</TableHead>
                      <TableHead className="min-w-[150px]">Dinheiro</TableHead>
                      <TableHead className="min-w-[150px]">Crédito</TableHead>
                      <TableHead className="min-w-[150px]">Débito</TableHead>
                      <TableHead className="min-w-[150px]">Pix</TableHead>
                      <TableHead className="min-w-[150px]">Ticket Médio</TableHead>
                      <TableHead className="min-w-[150px]">Nº de Vendas</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                           <Controller
                                control={form.control}
                                name={`days.${index}.importDate`}
                                render={({ field }) => (
                                    <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal",!field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: ptBR }) : (<span>Escolha uma data</span>)}</Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                                    </Popover>
                                )}
                            />
                        </TableCell>
                         <TableCell>
                            <Controller
                                control={form.control}
                                name={`days.${index}.shop`}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="Park Shopping">Park Shopping</SelectItem><SelectItem value="Madureira Shopping">Madureira Shopping</SelectItem></SelectContent>
                                    </Select>
                                )}
                            />
                        </TableCell>
                        <TableCell><Input type="number" step="0.01" placeholder="0.00" {...form.register(`days.${index}.dinheiro`)} /></TableCell>
                        <TableCell><Input type="number" step="0.01" placeholder="0.00" {...form.register(`days.${index}.credito`)} /></TableCell>
                        <TableCell><Input type="number" step="0.01" placeholder="0.00" {...form.register(`days.${index}.debito`)} /></TableCell>
                        <TableCell><Input type="number" step="0.01" placeholder="0.00" {...form.register(`days.${index}.pix`)} /></TableCell>
                        <TableCell><Input type="number" step="0.01" placeholder="0.00" {...form.register(`days.${index}.averageTicket`)} /></TableCell>
                        <TableCell><Input type="number" placeholder="0" {...form.register(`days.${index}.numberOfSales`)} /></TableCell>
                        <TableCell>
                           {fields.length > 1 && <Button variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

               {form.formState.errors.days && <p className="text-sm font-medium text-destructive">{form.formState.errors.days.message}</p>}

              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" onClick={addNewDay}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Adicionar Dia
                </Button>
                <Button type="submit" disabled={isSubmitting || fields.length === 0}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Todos os Dados
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
