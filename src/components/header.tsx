import { Link } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

import UserMenu from "./user-menu";

export default function Header() {
  const { data: session } = authClient.useSession();

  const links = [
    { to: "/" as const, label: "首頁", requireAuth: false },
    { to: "/materials" as const, label: "材質介紹", requireAuth: false },
    { to: "/history" as const, label: "報價歷史", requireAuth: true },
    { to: "/admin/filaments" as const, label: "線材管理", requireAuth: true },
    { to: "/admin/settings" as const, label: "全域設定", requireAuth: true },
  ];

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-4 py-2">
        <nav className="flex flex-wrap gap-4 text-sm">
          {links
            .filter((link) => !link.requireAuth || session)
            .map(({ to, label }) => (
              <Link key={to} to={to} className="hover:underline" activeProps={{ className: "font-semibold underline" }}>
                {label}
              </Link>
            ))}
        </nav>
        <div className="flex items-center gap-2">
          <UserMenu />
        </div>
      </div>
      <hr />
    </div>
  );
}
