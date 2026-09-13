import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { History, Search } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeading, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { ColorDot } from "@/components/color-dot";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberField } from "@/components/number-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn, formatCurrency } from "@/lib/utils";
import { client, orpc } from "@/lib/orpc";

export const Route = createFileRoute("/_authed/history")({
  component: HistoryPage,
});

const completeSchema = z.object({
  weightGrams: z.coerce.number().positive("請輸入克重"),
  printHours: z.coerce.number().positive("請輸入小時數"),
  season: z.enum(["summer", "offseason"]).optional(),
  cleanupMinutes: z.coerce.number().int().min(0).optional(),
  failureRatePercent: z.coerce.number().int().min(0).max(100).optional(),
  revisionCount: z.coerce.number().int().min(0).optional(),
  modelingTierId: z.string().optional(),
  modelingCustomPrice: z.coerce.number().int().min(0).optional(),
});
type CompleteInput = z.input<typeof completeSchema>;
type CompleteValues = z.output<typeof completeSchema>;

function HistoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const listQuery = useQuery(orpc.quote.list.queryOptions());
  const detailQuery = useQuery({
    ...orpc.quote.getById.queryOptions({ input: { id: openId ?? "" } }),
    enabled: Boolean(openId),
  });

  const rows = (listQuery.data ?? [])
    .filter((row) => (row.recipientName ?? "").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const pendingCount = (listQuery.data ?? []).filter((row) => row.status === "pending").length;

  return (
    <PageShell width="xl" className="space-y-8">
      <PageHeading
        eyebrow={
          <>
            <History className="size-3.5" />
            賣家後台
          </>
        }
        title="報價歷史"
        description="待確認的排在最前面；點任一筆填入真實克重與工時即可完成報價。"
        actions={
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              待確認 <span className="font-bold text-brand tabular-nums">{pendingCount}</span>
            </span>
            <span className="rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              全部 <span className="font-bold tabular-nums">{listQuery.data?.length ?? 0}</span>
            </span>
          </div>
        }
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="搜尋對象名稱"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row, index) => {
          const pending = row.status === "pending";
          return (
            <Card
              key={row.id}
              className="animate-rise hover-lift cursor-pointer"
              style={{ animationDelay: `${Math.min(index, 9) * 40}ms` }}
              onClick={() => setOpenId(row.id)}
            >
              <CardContent className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-2">
                  <Badge
                    variant={pending ? "secondary" : "default"}
                    className={cn(
                      pending
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                        : "bg-success/15 text-success",
                    )}
                  >
                    {pending ? "待確認" : "已確認"}
                  </Badge>
                  <p className="truncate text-base font-semibold">
                    {row.recipientName || "（未填寫）"}
                  </p>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <ColorDot color={row.filamentColor} />
                    <span className="truncate">{row.filamentName}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-lg font-bold tracking-tight tabular-nums">
                    {row.roundedPrice != null ? formatCurrency(row.roundedPrice) : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(row.createdAt).toLocaleDateString("zh-TW")}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {rows.length === 0 && (
          <Card className="animate-rise py-12 text-center sm:col-span-2 xl:col-span-3">
            <CardContent className="space-y-1">
              <p className="font-semibold">目前沒有報價紀錄</p>
              <p className="text-sm text-muted-foreground">客人送出詢價後就會出現在這裡。</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={Boolean(openId)} onOpenChange={(open) => !open && setOpenId(null)}>
        <DialogContent>
          {detailQuery.data && (
            <QuoteDetail
              quote={detailQuery.data}
              onCompleted={() => {
                setOpenId(null);
                queryClient.invalidateQueries({ queryKey: orpc.quote.list.queryKey() });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

type QuoteDetailData = Awaited<ReturnType<typeof client.quote.getById>>;

function QuoteDetail({
  quote,
  onCompleted,
}: {
  quote: QuoteDetailData;
  onCompleted: () => void;
}) {
  const modelingTiersQuery = useQuery({
    ...orpc.settings.listModelingTiers.queryOptions(),
    enabled: quote.needsModeling,
  });

  const { control, handleSubmit, watch, formState } = useForm<
    CompleteInput,
    unknown,
    CompleteValues
  >({
    resolver: zodResolver(completeSchema),
    defaultValues: {
      weightGrams: quote.weightGrams ?? undefined,
      printHours: quote.printHours ?? undefined,
      season: quote.season,
      cleanupMinutes: quote.cleanupMinutes ?? 0,
      failureRatePercent: quote.failureRatePercent,
      revisionCount: quote.revisionCount ?? 0,
      modelingTierId: quote.modelingTierId ?? undefined,
      modelingCustomPrice: quote.modelingCustomPrice ?? undefined,
    },
  });

  const onSubmit = async (values: CompleteValues) => {
    try {
      await client.quote.complete({ id: quote.id, ...values });
      toast.success("已完成報價");
      onCompleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "完成報價失敗");
    }
  };

  const isCompleted = quote.status === "completed";

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {quote.recipientName || "（未填寫）"} · {quote.filamentName}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-1">
        <p>服務類型：{quote.needsModeling ? "建模" : "代印"}</p>
        {quote.modelUrl && (
          <p>
            模型網址：
            <a href={quote.modelUrl} target="_blank" rel="noreferrer" className="underline">
              {quote.modelUrl}
            </a>
          </p>
        )}
        {quote.notes && <p className="whitespace-pre-wrap">備註：{quote.notes}</p>}
      </div>

      {isCompleted ? (
        <div className="space-y-1">
          <p>克重：{quote.weightGrams} g</p>
          <p>列印小時數：{quote.printHours} 小時</p>
          <p>材料費：{formatCurrency(quote.materialCost!)}</p>
          <p>電費＋折舊費：{formatCurrency(quote.electricityDepreciationCost!)}</p>
          <p>代印人工費：{formatCurrency(quote.laborCost)}</p>
          <p>失敗率攤提：{formatCurrency(quote.failureBufferCost!)}</p>
          {quote.needsModeling && <p>建模費：{formatCurrency(quote.modelingCost)}</p>}
          {quote.revisionCost > 0 && <p>修改費：{formatCurrency(quote.revisionCost)}</p>}
          <p>總價：{formatCurrency(quote.totalPrice!)}</p>
          <p className="text-lg font-bold">
            建議收費：{formatCurrency(quote.roundedPrice!)}
            <span className="text-sm font-normal text-muted-foreground">
              （只有你看得到，實際收多少你自己決定）
            </span>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <p className="text-muted-foreground">
            切完片後把真正的克重／小時數填進來，確認完成這筆報價。
          </p>
          <div className="space-y-2">
            <Label>克重（g）</Label>
            <Controller
              name="weightGrams"
              control={control}
              render={({ field }) => <NumberField field={field} />}
            />
            {formState.errors.weightGrams && (
              <p className="text-red-500">{formState.errors.weightGrams.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>列印小時數</Label>
            <Controller
              name="printHours"
              control={control}
              render={({ field }) => <NumberField field={field} />}
            />
            {formState.errors.printHours && (
              <p className="text-red-500">{formState.errors.printHours.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>清理分鐘數</Label>
            <Controller
              name="cleanupMinutes"
              control={control}
              render={({ field }) => <NumberField field={field} />}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>季節（影響電費，預設沿用詢價當下的判斷）</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">非夏季</span>
              <Controller
                name="season"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value === "summer"}
                    onCheckedChange={(checked) => field.onChange(checked ? "summer" : "offseason")}
                  />
                )}
              />
              <span className="text-muted-foreground">夏季</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>失敗率攤提 %（預設沿用全域設定，可視情況調整）</Label>
            <Controller
              name="failureRatePercent"
              control={control}
              render={({ field }) => <NumberField field={field} min={0} max={100} />}
            />
          </div>
          {quote.needsModeling && (
            <>
              <div className="space-y-2">
                <Label>建模複雜度分級（客人的選擇僅供參考，可依實際狀況調整）</Label>
                <Controller
                  name="modelingTierId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="選擇分級">
                          {(id: string | null) => {
                            const tier = (modelingTiersQuery.data ?? []).find((t) => t.id === id);
                            return tier ? tier.tierName : "選擇分級";
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(modelingTiersQuery.data ?? []).map((tier) => (
                          <SelectItem key={tier.id} value={tier.id}>
                            {tier.tierName}（{formatCurrency(tier.defaultPrice)}）
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>或直接填自訂建模金額（有填就以這個為準）</Label>
                <Controller
                  name="modelingCustomPrice"
                  control={control}
                  render={({ field }) => <NumberField field={field} min={0} />}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>修改版本數（建模往來過程中總共改了幾版）</Label>
                  <span className="text-muted-foreground">
                    {Number(watch("revisionCount")) || 0}
                  </span>
                </div>
                <Controller
                  name="revisionCount"
                  control={control}
                  render={({ field }) => (
                    <Slider
                      min={0}
                      max={10}
                      step={1}
                      value={[Number(field.value) || 0]}
                      onValueChange={(v) => field.onChange(Array.isArray(v) ? (v[0] ?? 0) : v)}
                    />
                  )}
                />
              </div>
            </>
          )}
          <DialogFooter>
            <Button type="submit" size="lg" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? "處理中..." : "確認並完成報價"}
            </Button>
          </DialogFooter>
        </form>
      )}
    </>
  );
}
