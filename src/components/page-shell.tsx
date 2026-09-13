import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

type Width = "sm" | "md" | "lg" | "xl" | "full";

const WIDTH_CLASS: Record<Width, string> = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-[1600px]",
};

/**
 * 全站統一的頁面容器。桌機刻意放寬（預設 max-w-7xl + 更大的水平留白），
 * 手機仍維持單欄。
 */
export function PageShell({
  children,
  width = "xl",
  className,
  style,
}: {
  children: ReactNode;
  width?: Width;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <main
      style={style}
      className={cn(
        "mx-auto w-full px-4 py-8 sm:px-6 lg:px-10 lg:py-12",
        WIDTH_CLASS[width],
        className,
      )}
    >
      {children}
    </main>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-rise flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="space-y-2">
        {eyebrow && (
          <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-brand uppercase">
            {eyebrow}
          </div>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">{title}</h1>
        {description && (
          <p className="max-w-2xl text-sm text-pretty text-muted-foreground sm:text-base">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
