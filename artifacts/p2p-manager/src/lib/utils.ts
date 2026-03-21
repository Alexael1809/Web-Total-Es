import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency: string = "USDT") {
  const isFiat = currency !== "USDT" && currency !== "USD";
  
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: currency === 'USDT' ? 'USD' : currency,
    minimumFractionDigits: isFiat ? 2 : 2,
    maximumFractionDigits: isFiat ? 2 : 4,
  }).format(value || 0).replace('USD', currency);
}

export function formatDate(dateString: string) {
  try {
    return format(new Date(dateString), "dd MMM yyyy, HH:mm", { locale: es });
  } catch (e) {
    return dateString;
  }
}

export function formatShortDate(dateString: string) {
  try {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: es });
  } catch (e) {
    return dateString;
  }
}
