import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  getDoc,
  setDoc,
  Timestamp,
  DocumentData,
  collectionGroup,
  startAt,
  endAt,
  orderBy,
  Firestore,
  DocumentReference,
  formatDate,
} from "firebase/firestore";
import { ShopName } from "@/contexts/shop-context";
import { format } from "date-fns";

// Note: These interfaces are based on docs/backend.json
export type UserRole = "admin" | "parkshopping" | "madureirashopping";

export interface User {
  id: string;
  username: string;
  role: UserRole;
  unitId?: string;
  email: string;
}

export interface ProductCategory {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  type: 'Nacional' | 'Importado';
}

export interface StockItem extends DocumentData {
  id: string;
  name: string;
  quantity: number;
  type: string;
  unitId: string;
}

export interface StockTransaction extends DocumentData {
    id: string;
    stockItemId: string;
    quantityChange: number;
    date: Timestamp;
    operatorName: string;
    action: 'Entrada' | 'Saída' | 'Transferência' | 'Perda';
    unitId: string;
}

export type PaymentMethod = 'Dinheiro' | 'Pix' | 'Credito' | 'Debito';

export interface CashFlowRecord extends DocumentData {
    id: string;
    date: Timestamp;
    paymentMethod: PaymentMethod;
    amount: number;
    type: 'Entrada' | 'Saída';
    description: string;
    unitId: string;
    operatorId: string;
}

export interface ProductSaleRecord extends DocumentData {
    id: string;
    date: Timestamp;
    productCategory: string; // Name of the product category
    quantity: number;
    unitId: string;
    operatorId: string;
}

export interface PaymentFee extends DocumentData {
    id: string;
    unitId: ShopName;
    paymentMethod: PaymentMethod;
    feePercentage: number;
}

export interface FixedCost extends DocumentData {
    id: string;
    unitId: ShopName;
    amount: number;
}

export interface DailyMetric extends DocumentData {
    id: string;
    date: Timestamp;
    unitId: ShopName;
    averageTicket: number;
    numberOfSales: number;
}

// --- ProductCategory Functions ---

export async function getProductCategories(firestore: Firestore): Promise<ProductCategory[]> {
  const productCategoriesCollection = collection(firestore, "product_categories");
  const q = query(productCategoriesCollection, orderBy("name"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductCategory));
}

export async function addProductCategory(firestore: Firestore, productCategory: Omit<ProductCategory, 'id'>) {
  const productCategoriesCollection = collection(firestore, "product_categories");
  await addDoc(productCategoriesCollection, productCategory);
}

export async function deleteProductCategory(firestore: Firestore, categoryId: string) {
    const categoryRef = doc(firestore, "product_categories", categoryId);
    await deleteDoc(categoryRef);
}

export async function updateProductCategory(firestore: Firestore, categoryId: string, newName: string) {
    const categoryRef = doc(firestore, "product_categories", categoryId);
    await updateDoc(categoryRef, { name: newName });
}


// --- Product Functions ---

export async function getProducts(firestore: Firestore): Promise<Product[]> {
    const productsCollection = collection(firestore, "products");
    const q = query(productsCollection, orderBy("name"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
}

export async function addProduct(firestore: Firestore, product: Omit<Product, 'id'>) {
    const productsCollection = collection(firestore, "products");
    await addDoc(productsCollection, product);
}

export async function deleteProduct(firestore: Firestore, productId: string) {
    const productRef = doc(firestore, "products", productId);
    await deleteDoc(productRef);
}

export async function updateProduct(firestore: Firestore, productId: string, data: Partial<Omit<Product, 'id'>>) {
    const productRef = doc(firestore, "products", productId);
    await updateDoc(productRef, data);
}


// --- Stock Functions ---
export async function getShopStock(firestore: Firestore, unitId: ShopName | 'Estoque Central'): Promise<StockItem[]> {
    const stockItemsCollection = collection(firestore, "stock_items");
    const q = query(stockItemsCollection, where("unitId", "==", unitId));
    const stockSnapshot = await getDocs(q);

    const data = stockSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockItem));
    
    // Sort data in-place after fetching to avoid composite index
    data.sort((a, b) => a.name.localeCompare(b.name));

    return data;
}


export async function getStockData(firestore: Firestore, unitId: ShopName): Promise<StockItem[]> {
    return getShopStock(firestore, unitId);
}


export async function updateStock(
    firestore: Firestore,
    unitId: ShopName | 'Estoque Central',
    product: Product,
    quantityChange: number,
    action: 'Entrada' | 'Saída' | 'Perda',
    operatorName: string
): Promise<{ success: boolean; message?: string }> {
    const stockItemsRef = collection(firestore, "stock_items");

    // Query by unitId first, then find the product by name.
    // This avoids the need for a composite index.
    const unitStockQuery = query(stockItemsRef, where("unitId", "==", unitId));

    try {
        const unitStockSnapshot = await getDocs(unitStockQuery);
        const existingDoc = unitStockSnapshot.docs.find(doc => doc.data().name === product.name);

        const docRef = existingDoc ? existingDoc.ref : doc(stockItemsRef);

        if (!existingDoc && (action === 'Saída' || action === 'Perda')) {
            return { success: false, message: `Não é possível realizar '${action}' de um item que não existe no estoque.` };
        }

        await runTransaction(firestore, async (transaction) => {
            let currentQuantity = 0;
            if (existingDoc) {
                const docSnap = await transaction.get(docRef);
                if (docSnap.exists()) {
                    currentQuantity = (docSnap.data() as StockItem).quantity || 0;
                }
            }
            
            let newQuantity;

            if (action === 'Entrada') {
                newQuantity = currentQuantity + quantityChange;
            } else { // 'Saída' or 'Perda'
                if (currentQuantity < quantityChange) {
                    throw new Error(`Quantidade em estoque insuficiente para "${product.name}". Em estoque: ${currentQuantity}.`);
                }
                newQuantity = currentQuantity - quantityChange;
            }
            
            transaction.set(docRef, {
                name: product.name,
                type: product.type,
                quantity: newQuantity,
                unitId: unitId
            }, { merge: true });


            // Log the transaction
            if (unitId !== 'Estoque Central') {
                const logRef = doc(collection(firestore, "stock_transactions"));
                transaction.set(logRef, {
                    stockItemId: docRef.id,
                    quantityChange: action === 'Entrada' ? quantityChange : -quantityChange,
                    date: serverTimestamp(),
                    operatorName,
                    action,
                    unitId,
                });
            }
        });
        return { success: true };
    } catch (error: any) {
        console.error("Stock update transaction failed: ", error);
        return { success: false, message: error.message };
    }
}

export async function transferStock(
    firestore: Firestore,
    fromUnitId: 'Estoque Central',
    toUnitId: ShopName,
    product: Product,
    quantity: number,
    operatorName: string
): Promise<{ success: boolean, message?: string }> {
     if (fromUnitId === toUnitId) {
        return { success: false, message: "A unidade de origem e destino não podem ser as mesmas." };
    }

    const stockItemsRef = collection(firestore, "stock_items");
    
    // Avoid composite indexes by querying for all items in each unit and filtering in code
    const fromUnitQuery = query(stockItemsRef, where("unitId", "==", fromUnitId));
    const toUnitQuery = query(stockItemsRef, where("unitId", "==", toUnitId));
    
    try {
        const [fromUnitSnapshot, toUnitSnapshot] = await Promise.all([
            getDocs(fromUnitQuery),
            getDocs(toUnitQuery)
        ]);

        const fromItemDoc = fromUnitSnapshot.docs.find(doc => doc.data().name === product.name);
        if (!fromItemDoc) {
            return { success: false, message: `Produto "${product.name}" não encontrado no ${fromUnitId}.` };
        }
        const fromItemRef = fromItemDoc.ref;
        
        const toItemDoc = toUnitSnapshot.docs.find(doc => doc.data().name === product.name);
        const toItemRef = toItemDoc ? toItemDoc.ref : doc(stockItemsRef);

        await runTransaction(firestore, async (transaction) => {
            const fromItemSnap = await transaction.get(fromItemRef);
            if (!fromItemSnap.exists()) {
                 throw new Error(`Produto "${product.name}" desapareceu do ${fromUnitId} durante a transação.`);
            }
            const fromItemData = fromItemSnap.data() as StockItem;
            if (fromItemData.quantity < quantity) {
                throw new Error(`Quantidade insuficiente no ${fromUnitId}. Em estoque: ${fromItemData.quantity}.`);
            }
            
            transaction.update(fromItemRef, { quantity: fromItemData.quantity - quantity });

            let toCurrentQuantity = 0;
            if (toItemDoc) { // if doc exists
                const toItemSnap = await transaction.get(toItemRef);
                if (toItemSnap.exists()) {
                    toCurrentQuantity = (toItemSnap.data() as StockItem).quantity || 0;
                }
            }

            transaction.set(toItemRef, {
                name: product.name,
                type: product.type,
                quantity: toCurrentQuantity + quantity,
                unitId: toUnitId,
            }, { merge: true });

            const logRef = doc(collection(firestore, "stock_transactions"));
            transaction.set(logRef, {
                stockItemId: toItemRef.id,
                quantityChange: quantity,
                date: serverTimestamp(),
                operatorName,
                action: 'Entrada', 
                unitId: toUnitId,
            });
        });
        return { success: true };
    } catch (error: any) {
        console.error("Stock transfer transaction failed: ", error);
        return { success: false, message: error.message };
    }
}


// --- Stock Log Functions ---
export async function getStockLogs(firestore: Firestore, unitId: ShopName | 'Estoque Central', startDate?: Date, endDate?: Date): Promise<StockTransaction[]> {
    const logsCollection = collection(firestore, "stock_transactions");
    const q = query(logsCollection, where("unitId", "==", unitId));
    const snapshot = await getDocs(q);
    const allLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockTransaction));

    if (startDate && endDate) {
        const startTime = startDate.getTime();
        const endTime = endDate.getTime();
        return allLogs.filter(log => {
            if (!log.date) return false;
            const logTime = log.date.toDate().getTime();
            return logTime >= startTime && logTime <= endTime;
        });
    }

    return allLogs;
}


// --- Cash Flow, Sales & Metrics Functions ---

export async function addCashFlowEntry(firestore: Firestore, entry: Omit<CashFlowRecord, 'id' | 'date'>, entryDate: Date) {
    await addDoc(collection(firestore, "cash_flow_records"), { ...entry, date: Timestamp.fromDate(entryDate) });
}

export async function addDailyMetric(firestore: Firestore, unitId: ShopName, data: { averageTicket: number; numberOfSales: number }, entryDate: Date) {
    const metricsCollection = collection(firestore, "daily_metrics");
    
    // Create a predictable ID to avoid querying before writing in a batch.
    const metricId = `${format(entryDate, 'yyyy-MM-dd')}_${unitId.replace(/\s+/g, '-')}`;
    const metricRef = doc(firestore, "daily_metrics", metricId);

    // Use set with merge to create or update the document.
    await setDoc(metricRef, { ...data, unitId, date: Timestamp.fromDate(entryDate) }, { merge: true });
}

export async function bulkAddCashFlowAndMetrics(
  firestore: Firestore,
  entries: {
    importDate: Date;
    shop: ShopName;
    dinheiro?: number;
    credito?: number;
    debito?: number;
    pix?: number;
    averageTicket?: number;
    numberOfSales?: number;
    operatorId: string;
  }[]
) {
  const batch = writeBatch(firestore);

  for (const entry of entries) {
    const { importDate, shop, dinheiro, credito, debito, pix, averageTicket, numberOfSales, operatorId } = entry;
    const entryTimestamp = Timestamp.fromDate(importDate);

    // Cash Flow Entries for sales
    const salesEntries: { method: PaymentMethod, amount: number }[] = [
        { method: 'Dinheiro', amount: dinheiro || 0 },
        { method: 'Credito', amount: credito || 0 },
        { method: 'Debito', amount: debito || 0 },
        { method: 'Pix', amount: pix || 0 },
      ];

    salesEntries
      .filter(sale => sale.amount > 0)
      .forEach(sale => {
        const cashFlowRef = doc(collection(firestore, "cash_flow_records"));
        batch.set(cashFlowRef, {
            unitId: shop,
            type: 'Entrada' as const,
            amount: sale.amount,
            description: `Vendas (importação) - ${sale.method}`,
            paymentMethod: sale.method,
            operatorId: operatorId,
            date: entryTimestamp,
        });
      });

    // Daily Metric Entry
    if (averageTicket && numberOfSales && averageTicket > 0 && numberOfSales > 0) {
      const metricId = `${format(importDate, 'yyyy-MM-dd')}_${shop.replace(/\s+/g, '-')}`;
      const metricRef = doc(firestore, "daily_metrics", metricId);
      // This set with merge will create or overwrite, which is perfect for daily summaries.
      batch.set(metricRef, {
        unitId: shop,
        date: entryTimestamp,
        averageTicket,
        numberOfSales,
      }, { merge: true });
    }
  }

  await batch.commit();
}


export async function addProductSaleEntry(firestore: Firestore, entry: Omit<ProductSaleRecord, 'id' | 'date'>, entryDate: Date) {
     await addDoc(collection(firestore, "product_sale_records"), { ...entry, date: Timestamp.fromDate(entryDate) });
}

export async function getDailyMetrics(firestore: Firestore, unitId: ShopName, startDate: Date, endDate: Date): Promise<DailyMetric[]> {
    if (!firestore || !unitId) return [];
    const metricsCollection = collection(firestore, "daily_metrics");
    const q = query(metricsCollection, where("unitId", "==", unitId));
    const snapshot = await getDocs(q);
    const allEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyMetric));

    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    return allEntries.filter(entry => {
        if (!entry.date) return false;
        const entryTime = entry.date.toDate().getTime();
        return entryTime >= startTime && entryTime <= endTime;
    });
}

export async function getCashFlowEntries(firestore: Firestore, unitId: ShopName, startDate?: Date, endDate?: Date): Promise<CashFlowRecord[]> {
  if (!firestore || !unitId) return [];
  const cashFlowCollection = collection(firestore, "cash_flow_records");
  const q = query(cashFlowCollection, where("unitId", "==", unitId));
  const snapshot = await getDocs(q);
  const allEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CashFlowRecord));
  
  if (startDate && endDate) {
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    return allEntries.filter(entry => {
        if (!entry.date) return false;
        const entryTime = entry.date.toDate().getTime();
        return entryTime >= startTime && entryTime <= endTime;
    });
  }

  return allEntries;
}

export async function getProductSaleEntries(firestore: Firestore, unitId: ShopName, startDate?: Date, endDate?: Date): Promise<ProductSaleRecord[]> {
  const salesCollection = collection(firestore, "product_sale_records");
  const q = query(salesCollection, where("unitId", "==", unitId));
  const snapshot = await getDocs(q);
  const allEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductSaleRecord));

  if (startDate && endDate) {
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    return allEntries.filter(entry => {
        if (!entry.date) return false;
        const entryTime = entry.date.toDate().getTime();
        return entryTime >= startTime && entryTime <= endTime;
    });
  }
  return allEntries;
}


export async function getWeeklyBalance(firestore: Firestore, unitId: ShopName): Promise<CashFlowRecord[]> {
    if (!firestore || !unitId) return [];
    const cashFlowCollection = collection(firestore, "cash_flow_records");
    const q = query(cashFlowCollection, where("unitId", "==", unitId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as CashFlowRecord));
}

// --- Payment Fee Functions ---
export async function getPaymentFees(firestore: Firestore, unitId: ShopName): Promise<PaymentFee[]> {
    const feesCollection = collection(firestore, "payment_fees");
    const q = query(feesCollection, where("unitId", "==", unitId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentFee));
}

export async function updatePaymentFees(firestore: Firestore, unitId: ShopName, fees: { method: string, percentage: number }[]) {
    const batch = writeBatch(firestore);
    const feesCollection = collection(firestore, "payment_fees");

    for (const fee of fees) {
        const q = query(feesCollection, where("unitId", "==", unitId), where("paymentMethod", "==", fee.method));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            batch.set(doc(feesCollection), { unitId, paymentMethod: fee.method, feePercentage: fee.percentage });
        } else {
            batch.update(snapshot.docs[0].ref, { feePercentage: fee.percentage });
        }
    }
    await batch.commit();
}

// --- Fixed Cost Functions ---
export async function getFixedCost(firestore: Firestore, unitId: ShopName): Promise<FixedCost | null> {
    if (!unitId) return null;
    const costsCollection = collection(firestore, "fixed_costs");
    const q = query(costsCollection, where("unitId", "==", unitId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        return null;
    }
    const docData = snapshot.docs[0];
    return { id: docData.id, ...docData.data() } as FixedCost;
}

export async function updateFixedCost(firestore: Firestore, unitId: ShopName, amount: number) {
    const costsCollection = collection(firestore, "fixed_costs");
    const q = query(costsCollection, where("unitId", "==", unitId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        await addDoc(costsCollection, { unitId, amount });
    } else {
        const docRef = snapshot.docs[0].ref;
        await updateDoc(docRef, { amount });
    }
}

export async function updateCashFlowEntry(firestore: Firestore, recordId: string, updates: Partial<CashFlowRecord>) {
    const recordRef = doc(firestore, "cash_flow_records", recordId);
    // Ensure we don't try to update the ID
    const { id, ...updateData } = updates;
    await updateDoc(recordRef, updateData);
}

export async function deleteCashFlowEntry(firestore: Firestore, recordId: string) {
    const recordRef = doc(firestore, "cash_flow_records", recordId);
    await deleteDoc(recordRef);
}
