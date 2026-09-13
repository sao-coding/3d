/**
 * 線材沒有獨立的名稱欄位，顯示名稱由「廠牌 材質 色名」組出來。
 * 三段都可能缺（廠牌與色名選填），所以要過濾空值。
 */
export function filamentLabel(parts: {
  brandName?: string | null;
  materialName?: string | null;
  colorName?: string | null;
}): string {
  const label = [parts.brandName, parts.materialName, parts.colorName]
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s))
    .join(" ");
  return label || "未命名線材";
}
