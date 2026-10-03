/**
 * Utility functions for Indian Rupee (INR) currency formatting.
 * Uses the Indian numbering system (Lakhs and Crores, e.g. ₹1,50,000.00).
 */

export function formatINR(
  amount: number | null | undefined,
  options?: {
    showDecimals?: boolean;
    compact?: boolean;
    showSign?: boolean;
  }
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0.00';
  }

  const showDecimals = options?.showDecimals ?? true;
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const formattedNumber = absAmount.toLocaleString('en-IN', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });

  if (isNegative) {
    return `-₹${formattedNumber}`;
  }

  if (options?.showSign && amount > 0) {
    return `+₹${formattedNumber}`;
  }

  return `₹${formattedNumber}`;
}

export function formatCompactINR(amount: number): string {
  if (isNaN(amount)) return '₹0';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 10000000) {
    // 1 Crore
    return `${sign}₹${(abs / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`;
  }
  if (abs >= 100000) {
    // 1 Lakh
    return `${sign}₹${(abs / 100000).toFixed(2).replace(/\.00$/, '')} L`;
  }
  if (abs >= 1000) {
    // 1 Thousand
    return `${sign}₹${(abs / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }

  return `${sign}₹${abs.toFixed(0)}`;
}
