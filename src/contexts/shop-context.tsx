'use client';

import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { useAuth } from './auth-context';

export enum ShopName {
  ParkShopping = 'Park Shopping',
  MadureiraShopping = 'Madureira Shopping',
}

interface ShopContextType {
  selectedShop: ShopName;
  setSelectedShop: (shop: ShopName) => void;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export function ShopProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Default to Park Shopping, but it will be overridden by user's shop if they are not admin.
  const [selectedShop, setSelectedShop] = useState<ShopName>(ShopName.ParkShopping);

  useEffect(() => {
    // If the user is not an admin and has a specific shop assigned, force that shop.
    if (user && user.role !== 'admin') {
      if (user.role === 'parkshopping') {
        setSelectedShop(ShopName.ParkShopping);
      } else if (user.role === 'madureirashopping') {
        setSelectedShop(ShopName.MadureiraShopping);
      }
    }
  }, [user]);

  const value = useMemo(() => ({
    selectedShop,
    setSelectedShop,
  }), [selectedShop]);

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const context = useContext(ShopContext);
  if (context === undefined) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
}
