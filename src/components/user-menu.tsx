import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";

export default function UserMenu() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <Skeleton className="h-10 w-20" />;
  }

  if (!session) {
    return (
      <Link to="/login">
        <Button variant="outline" size="lg">
          登入
        </Button>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="lg" />}>
        <span className="max-w-24 truncate">{session.user.name}</span>
      </DropdownMenuTrigger>
      {/* 預設只有 min-w-32，信箱會被切掉，所以這裡指定寬一點 */}
      <DropdownMenuContent align="end" className="min-w-56 bg-card">
        {/* 帳號資訊只是顯示用，不做成 menu item —— 不能點卻有 hover 效果會誤導 */}
        <div className="px-3 py-2">
          <p className="truncate text-sm font-medium">{session.user.name}</p>
          <p className="mt-0.5 text-xs break-all text-muted-foreground">{session.user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            authClient.signOut({
              fetchOptions: {
                onSuccess: () => {
                  navigate({ to: "/" });
                },
              },
            });
          }}
        >
          <LogOut className="size-4" />
          登出
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
