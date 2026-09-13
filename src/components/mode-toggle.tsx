import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "淺色", icon: Sun },
  { value: "system", label: "跟隨系統", icon: Monitor },
  { value: "dark", label: "深色", icon: Moon },
] as const;

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // next-themes 在 hydration 前拿不到真正的值，先畫一個中性的骨架避免閃爍
  useEffect(() => setMounted(true), []);

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-border bg-card/60 p-0.5">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-label={label}
            aria-pressed={active}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              "size-7 cursor-pointer place-items-center rounded-full transition-colors",
              // 手機空間有限，「跟隨系統」收起來，只留淺色/深色
              value === "system" ? "hidden sm:grid" : "grid",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}
