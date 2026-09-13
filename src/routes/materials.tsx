import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Check, Layers, X } from "lucide-react";

import { PageHeading, PageShell } from "@/components/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc";

export const Route = createFileRoute("/materials")({
  component: MaterialsPage,
});

function MaterialsPage() {
  const materialsQuery = useQuery(orpc.material.list.queryOptions());
  const materials = materialsQuery.data ?? [];

  return (
    <PageShell width="xl" className="space-y-10">
      <PageHeading
        eyebrow={
          <>
            <Layers className="size-3.5" />
            材質指南
          </>
        }
        title={
          <>
            挑一個
            <span className="text-gradient">適合的材質</span>
          </>
        }
        description="不確定要選哪種材質嗎？這裡整理各材質常見的優缺點與適合場景，依常用程度排序。"
        actions={
          <Link to="/" className={buttonVariants({ size: "lg", className: "rounded-lg" })}>
            回去填詢價
            <ArrowRight className="size-4" />
          </Link>
        }
      />

      {materialsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full" />
          ))}
        </div>
      ) : materials.length === 0 ? (
        <Card className="animate-rise py-14 text-center">
          <CardContent className="space-y-1">
            <p className="font-semibold">還沒有材質資料</p>
            <p className="text-sm text-muted-foreground">賣家在後台新增材質後就會顯示在這裡。</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {materials.map((material, index) => (
            <Card
              key={material.id}
              className="animate-rise hover-lift h-full w-full"
              style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
            >
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand/15 to-brand-2/15 text-xs font-bold text-brand ring-1 ring-brand/20">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <CardTitle className="text-lg">{material.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {material.pros.length > 0 && (
                  <ul className="space-y-1.5">
                    {material.pros.map((pro) => (
                      <li key={pro} className="flex gap-2 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-success" />
                        <span className="text-muted-foreground">{pro}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {material.cons.length > 0 && (
                  <ul className="space-y-1.5">
                    {material.cons.map((con) => (
                      <li key={con} className="flex gap-2 text-sm">
                        <X className="mt-0.5 size-4 shrink-0 text-destructive" />
                        <span className="text-muted-foreground">{con}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {material.goodFor && (
                  <div className="rounded-xl border border-brand/20 bg-brand/5 p-3">
                    <p className="text-xs font-semibold tracking-wide text-brand uppercase">適合</p>
                    <p className="mt-1 text-sm text-pretty text-muted-foreground">
                      {material.goodFor}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
