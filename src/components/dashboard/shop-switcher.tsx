'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useShop, ShopName } from "@/contexts/shop-context";

export function ShopSwitcher() {
  const { selectedShop, setSelectedShop } = useShop();

  return (
    <Select value={selectedShop} onValueChange={(value) => setSelectedShop(value as ShopName)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Selecionar Loja" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Park Shopping">Park Shopping</SelectItem>
        <SelectItem value="Madureira Shopping">Madureira Shopping</SelectItem>
      </SelectContent>
    </Select>
  );
}
