/**
 * 頁面的重點色會跟著客人選的線材跑。
 *
 * 但線材常常是黑/白/灰，或亮到疊白字會看不清楚，那種就不適合當重點色，
 * 直接退回預設的品牌橘（回傳 null，不覆寫任何變數）。
 */

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const raw = m[1]!;
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** WCAG 相對亮度，0 = 黑、1 = 白 */
function luminance([r, g, b]: [number, number, number]): number {
  const lin = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** HSL 的 S，用來濾掉黑白灰 */
function saturation([r, g, b]: [number, number, number]): number {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  if (max === min) return 0;
  const l = (max + min) / 2;
  return l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
}

export interface FilamentAccent {
  color: string;
  /** 疊在這個顏色上的文字色 */
  ink: string;
}

/** 不適合當重點色時回傳 null，讓預設的品牌橘繼續用 */
export function resolveFilamentAccent(
  hex: string | null | undefined,
  isDark = false,
): FilamentAccent | null {
  if (!hex) return null;
  const rgb = parseHex(hex);
  if (!rgb) return null;

  const lum = luminance(rgb);
  const sat = saturation(rgb);

  // 深色模式的重點色要夠亮才看得見，淺色模式則要夠深才疊得住白字
  const min = isDark ? 0.14 : 0.04;
  const max = isDark ? 0.8 : 0.55;
  if (lum < min || lum > max || sat < 0.18) return null;

  return { color: hex, ink: lum > 0.3 ? "#1a1205" : "#ffffff" };
}

/**
 * 掛在容器上，讓底下的重點色跟著換。
 *
 * 自訂屬性是以「已代換的計算值」往下繼承的：`--color-brand: var(--brand)` 在
 * :root 就解析完了，所以只覆寫 --brand 不會影響 bg-brand / from-brand 這類
 * utility。utility 真正讀的是 --color-*，兩層都要寫。
 * （--brand 那層則是給 .text-gradient / .card-glow 這些自訂 class 用的。）
 */
export function accentStyle(accent: FilamentAccent | null): React.CSSProperties | undefined {
  if (!accent) return undefined;
  return {
    "--brand": accent.color,
    "--color-brand": accent.color,
    "--primary": accent.color,
    "--color-primary": accent.color,
    "--primary-foreground": accent.ink,
    "--color-primary-foreground": accent.ink,
    "--ring": accent.color,
    "--color-ring": accent.color,
  } as React.CSSProperties;
}
