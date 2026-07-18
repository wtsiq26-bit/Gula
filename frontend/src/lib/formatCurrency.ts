export function formatCurrency(amount: number): string {
  if (amount === undefined || amount === null) return "-";
  return `${Number(amount).toLocaleString("en-US")} د.ع`;
}
