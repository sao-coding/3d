import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CircleCheck, Clock, Copy, ExternalLink, Receipt } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { ColorDot } from "@/components/color-dot";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { accentStyle, resolveFilamentAccent } from "@/lib/filament-accent";
import { orpc } from "@/lib/orpc";
import { cn, formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/quote/$id")({
  component: PublicQuotePage,
});

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={cn("text-right font-medium", muted && "font-normal text-muted-foreground")}>
        {value}
      </span>
    </div>
  );
}

function Pending() {
  return <span className="font-normal text-muted-foreground/70">待確認</span>;
}

function PublicQuotePage() {
  const { id } = Route.useParams();
  const { resolvedTheme } = useTheme();
  const { data, isLoading } = useQuery(orpc.quote.getPublic.queryOptions({ input: { id } }));

  if (isLoading) {
    return (
      <PageShell width="md" className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-72 w-full" />
      </PageShell>
    );
  }
  if (!data) {
    return (
      <PageShell width="md">
        <Card className="animate-rise py-14 text-center">
          <CardContent className="space-y-2">
            <p className="text-lg font-semibold">找不到這筆報價</p>
            <p className="text-sm text-muted-foreground">連結可能不正確，或這筆報價已被移除。</p>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const isCompleted = data.status === "completed";
  // 這張單的重點色跟著實際用的線材走
  const accent = resolveFilamentAccent(data.filamentColor, resolvedTheme === "dark");

  const copyText = () => {
    const lines = [
      `對象：${data.recipientName || "—"}`,
      `線材：${data.filamentName}`,
      data.totalPrice != null
        ? `${isCompleted ? "總價" : "預估總價"}：${formatCurrency(data.totalPrice)}`
        : `目前基本費：${formatCurrency((data.modelingCost ?? 0) + (data.revisionCost ?? 0) + (data.laborCost ?? 0))}（待確認最終價格）`,
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("已複製報價文字");
  };

  return (
    <PageShell width="md" className="space-y-6" style={accentStyle(accent)}>
      {/* 價格主視覺 */}
      <Card className="card-glow animate-rise overflow-hidden py-0">
        <div className="bg-gradient-to-br from-brand via-brand-2 to-brand-2 px-6 py-8 text-white sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
              {isCompleted ? <CircleCheck className="size-3.5" /> : <Clock className="size-3.5" />}
              {isCompleted ? "已確認" : "待確認"}
            </span>
            <span className="text-xs opacity-90">
              {data.needsModeling ? "建模服務" : "代印服務"}
            </span>
          </div>
          <p className="mt-5 text-xs font-semibold tracking-[0.18em] uppercase opacity-90">
            {isCompleted ? "總價" : "預估總價"}
          </p>
          <p className="mt-1 text-5xl font-extrabold tracking-tight tabular-nums">
            {data.totalPrice != null
              ? formatCurrency(data.totalPrice)
              : formatCurrency(
                  (data.modelingCost ?? 0) + (data.revisionCost ?? 0) + (data.laborCost ?? 0),
                )}
          </p>
          <p className="mt-2 text-sm opacity-90">
            {data.totalPrice != null
              ? isCompleted
                ? "這是確認後的正式報價。"
                : "以目前資訊估算，確認克重與工時後會更新。"
              : "目前僅計入已知的基本費，其餘待確認。"}
          </p>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="animate-rise hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="size-4 text-brand" />
              訂單資訊
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/70">
            <Row label="對象" value={data.recipientName || "—"} />
            <Row
              label="線材"
              value={
                <span className="flex items-center justify-end gap-1.5">
                  <ColorDot color={data.filamentColor} />
                  {data.filamentName}
                </span>
              }
            />
            <Row label="服務類型" value={data.needsModeling ? "建模" : "代印"} />
            {data.modelUrl && (
              <Row
                label="模型網址"
                value={
                  <a
                    href={data.modelUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-brand hover:underline"
                  >
                    查看連結
                    <ExternalLink className="size-3.5" />
                  </a>
                }
              />
            )}
            {data.notes && (
              <Row label="備註" value={<span className="whitespace-pre-wrap">{data.notes}</span>} />
            )}
          </CardContent>
        </Card>

        <Card className="animate-rise hover-lift">
          <CardHeader>
            <CardTitle>費用明細</CardTitle>
            <p className="text-xs text-muted-foreground">
              材料費 = 克重 × 線材每克成本；電費／折舊費依列印小時數計算。
            </p>
          </CardHeader>
          <CardContent className="divide-y divide-border/70">
            <Row
              label={isCompleted ? "克重" : "克重（你填的預估值）"}
              value={data.weightGrams != null ? `${data.weightGrams} g` : <Pending />}
            />
            <Row
              label="材料費"
              value={data.materialCost != null ? formatCurrency(data.materialCost) : <Pending />}
            />
            <Row
              label={isCompleted ? "列印小時數" : "列印小時數（你填的預估值）"}
              value={data.printHours != null ? `${data.printHours} 小時` : <Pending />}
            />
            <Row
              label="電費＋折舊費"
              value={
                data.electricityDepreciationCost != null ? (
                  formatCurrency(data.electricityDepreciationCost)
                ) : (
                  <Pending />
                )
              }
            />
            <Row label="代印人工費" value={formatCurrency(data.laborCost)} />
            <Row
              label="失敗率攤提"
              value={
                data.failureBufferCost != null ? formatCurrency(data.failureBufferCost) : <Pending />
              }
            />
            {data.needsModeling && <Row label="建模費" value={formatCurrency(data.modelingCost)} />}
            {data.revisionCost > 0 && <Row label="修改費" value={formatCurrency(data.revisionCost)} />}
          </CardContent>
        </Card>
      </div>

      {!isCompleted && (
        <div className="animate-rise rounded-2xl border border-brand/20 bg-brand/5 p-4 text-sm/relaxed text-muted-foreground">
          {data.totalPrice != null
            ? "以上是根據目前資訊估的價格，正式報價仍要等賣家確認克重與工時，之後回來這個連結就會看到更新。"
            : "材料費/電費/折舊/失敗率攤提要等賣家確認克重與工時後才會有最終報價，之後回來這個連結就會看到更新。"}
        </div>
      )}

      <Button className="w-full sm:w-auto" size="lg" variant="outline" onClick={copyText}>
        <Copy className="size-4" />
        複製報價文字
      </Button>
    </PageShell>
  );
}
