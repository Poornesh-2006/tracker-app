/** ₹ formatting used across money screens: "₹1,23,456" / "-₹500". */
export function money(n: number, decimals = 0): string {
  const abs = Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${n < 0 ? '-' : ''}₹${abs}`;
}

/** Normalizes a subscription price to a monthly amount. */
export function monthlyCost(amount: number, cycle: 'weekly' | 'monthly' | 'yearly'): number {
  if (cycle === 'weekly') return (amount * 52) / 12;
  if (cycle === 'yearly') return amount / 12;
  return amount;
}
