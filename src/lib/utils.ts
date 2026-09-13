export { cn } from "cn";

export function formatCurrency(amount: number): string {
  return `$${Math.round(amount).toLocaleString("zh-TW")}`;
}
