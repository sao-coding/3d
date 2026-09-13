import { Link } from "@tanstack/react-router";
import { Boxes, History, Layers, Menu, Printer, Settings2 } from "lucide-react";

import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

import UserMenu from "./user-menu";

const LINKS = [
  { to: "/" as const, label: "詢價", icon: Printer, requireAuth: false },
  { to: "/materials" as const, label: "材質介紹", icon: Layers, requireAuth: false },
  { to: "/history" as const, label: "報價歷史", icon: History, requireAuth: true },
  { to: "/admin/filaments" as const, label: "線材管理", icon: Boxes, requireAuth: true },
  { to: "/admin/materials" as const, label: "材質管理", icon: Layers, requireAuth: true },
  { to: "/admin/settings" as const, label: "全域設定", icon: Settings2, requireAuth: true },
];

export default function Header() {
  const { data: session } = authClient.useSession();
  const links = LINKS.filter((link) => !link.requireAuth || session);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-10">
        <Link to="/" className="group flex shrink-0 items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-2 text-white shadow-lg shadow-brand/25 transition-transform group-hover:scale-105">
            <Printer className="size-4.5" />
          </span>
          <span className="hidden flex-col leading-none sm:flex">
            <span className="text-sm font-bold tracking-tight">3D 列印代工</span>
            <span className="text-[11px] text-muted-foreground">線上報價計算機</span>
          </span>
        </Link>

        {/* 桌機：直接把連結攤開 */}
        <nav className="hidden min-w-0 flex-1 items-center gap-1 sm:flex">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{
                className: "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
              }}
              activeOptions={{ exact: to === "/" }}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ModeToggle />
          <UserMenu />

          {/* 手機：連結收進選單，避免擠成一條要橫向捲的細長列 */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="icon-lg" aria-label="開啟選單" />}
              className="sm:hidden"
            >
              <Menu className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44 bg-card">
              {links.map(({ to, label, icon: Icon }) => (
                <DropdownMenuItem
                  key={to}
                  render={
                    <Link to={to} activeOptions={{ exact: to === "/" }} activeProps={{ "data-active": "true" }} />
                  }
                  className="data-[active=true]:text-primary"
                >
                  <Icon className="size-4" />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
