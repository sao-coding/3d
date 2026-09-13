import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Calculator, Clock, Package, Sparkles, WandSparkles, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { FilamentSelect } from "@/components/filament-select";
import { NumberField } from "@/components/number-field";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { accentStyle, resolveFilamentAccent } from "@/lib/filament-accent";
import { client, orpc } from "@/lib/orpc";
import { cn, formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: QuoteRequestPage,
});

const formSchema = z.object({
  recipientName: z.string().optional(),
  filamentId: z.string().min(1, "請選擇線材"),
  needsModeling: z.boolean(),
  modelingTierId: z.string().optional(),
  modelUrl: z.url("請輸入正確的網址").optional().or(z.literal("")),
  notes: z.string().optional(),
  weightGrams: z.coerce.number().positive().optional(),
  printHours: z.coerce.number().positive().optional(),
});

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

function Money({ value, pending }: { value: number | null; pending?: string }) {
  if (value == null) {
    return <span className="text-muted-foreground/70">{pending ?? "待確認"}</span>;
  }
  return <span className="font-medium tabular-nums">{formatCurrency(value)}</span>;
}

function PriceRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {value}
    </div>
  );
}

/** 帶步驟編號與圖示的表單區塊，讓長表單讀起來有節奏 */
function SectionCard({
  step,
  icon: Icon,
  title,
  description,
  children,
}: {
  step: number;
  icon: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="animate-rise hover-lift">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand/15 to-brand-2/15 text-brand ring-1 ring-brand/20">
            <Icon className="size-5" />
          </span>
          <div className="space-y-0.5">
            <CardTitle className="flex items-center gap-2">
              <span className="text-xs font-bold text-brand tabular-nums">
                {String(step).padStart(2, "0")}
              </span>
              {title}
            </CardTitle>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function toNumberOrNull(v: unknown): number | null {
  if (v === "" || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function QuoteRequestPage() {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();

  const { control, handleSubmit, watch, setValue, formState } = useForm<
    FormInput,
    unknown,
    FormOutput
  >({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipientName: "",
      filamentId: "",
      needsModeling: false,
      modelingTierId: undefined,
      modelUrl: "",
      notes: "",
      weightGrams: undefined,
      printHours: undefined,
    },
  });

  const values = watch();
  const debouncedValues = useDebouncedValue(values, 300);

  const filamentsQuery = useQuery(orpc.filament.listActive.queryOptions());
  const modelingTiersQuery = useQuery(orpc.settings.listModelingTiers.queryOptions());

  const calculateInput = useMemo(
    () => ({
      filamentId: String(debouncedValues.filamentId ?? ""),
      weightGrams: toNumberOrNull(debouncedValues.weightGrams),
      printHours: toNumberOrNull(debouncedValues.printHours),
      needsModeling: Boolean(debouncedValues.needsModeling),
      modelingTierId: debouncedValues.needsModeling
        ? (debouncedValues.modelingTierId as string | undefined) || null
        : null,
      modelUrl: !debouncedValues.needsModeling
        ? (debouncedValues.modelUrl as string | undefined) || null
        : null,
      // 以下都不是詢價當下客人能知道、或不該讓客人自己填的東西——季節由系統依目前日期自動判斷、
      // 清理分鐘數/自訂建模金額/修改版本數只有你切完片、實際往來後才知道，一律留到
      // /history 完成報價時由你自己填。
      cleanupMinutes: null,
      modelingCustomPrice: null,
      revisionCount: 0,
    }),
    [debouncedValues],
  );

  const calculateQuery = useQuery(
    orpc.quote.calculate.queryOptions({
      input: calculateInput,
      enabled: Boolean(calculateInput.filamentId),
    }),
  );
  const breakdown = calculateQuery.data;

  const needsModeling = watch("needsModeling");
  const filamentId = watch("filamentId");
  const filaments = filamentsQuery.data ?? [];
  const filament = filaments.find((f) => f.id === filamentId);

  // 選了線材之後，整頁的重點色就跟著那捲線材的顏色走
  const accent = resolveFilamentAccent(filament?.color, resolvedTheme === "dark");

  const submitRequest = async (values: FormOutput) => {
    const input = {
      filamentId: values.filamentId,
      weightGrams: values.weightGrams ?? null,
      printHours: values.printHours ?? null,
      needsModeling: values.needsModeling,
      modelingTierId: values.needsModeling ? (values.modelingTierId ?? null) : null,
      modelUrl: !values.needsModeling ? values.modelUrl || null : null,
      notes: values.notes || undefined,
      cleanupMinutes: null,
      modelingCustomPrice: null,
      revisionCount: 0,
      recipientName: values.recipientName || undefined,
    };
    try {
      const result = await client.quote.submitRequest(input);
      navigate({ to: "/quote/$id", params: { id: result.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "送出詢價失敗，請稍後再試");
    }
  };

  return (
    <PageShell
      width="xl"
      className="space-y-10 transition-colors duration-500"
      style={accentStyle(accent)}
    >
      {/* Hero */}
      <section className="animate-rise space-y-5 text-center lg:text-left">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
          <Sparkles className="size-3.5" />
          填一填，馬上看到初步估價
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
          3D 列印代工
          <span className="text-gradient"> 線上詢價</span>
        </h1>
        <p className="mx-auto max-w-2xl text-base text-pretty text-muted-foreground lg:mx-0">
          選好線材、填上大概的克重與工時，右邊就會即時算出估價。不知道的欄位可以先留空，
          我確認完會補上最終價格。
        </p>
        <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
          {[
            { icon: Zap, label: "即時估價" },
            { icon: Calculator, label: "費用逐項透明" },
            { icon: Clock, label: "克重／工時可先留空" },
          ].map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground"
            >
              <Icon className="size-3.5 text-brand" />
              {label}
            </span>
          ))}
        </div>
      </section>

      <form
        onSubmit={handleSubmit(submitRequest)}
        className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] xl:gap-8 2xl:grid-cols-[minmax(0,1fr)_420px]"
      >
        {/* 左欄：表單 */}
        <div className="space-y-6">
          <SectionCard step={1} icon={Package} title="基本資訊" description="想印什麼、用什麼線材">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>對象名稱（選填）</Label>
                <Controller
                  name="recipientName"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} placeholder="方便日後辨識，例如：同事小陳" />
                  )}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>線材</Label>
                  <Link
                    to="/materials"
                    className="inline-flex items-center gap-0.5 text-xs font-medium text-brand hover:underline"
                  >
                    選哪種材質？
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
                <Controller
                  name="filamentId"
                  control={control}
                  render={({ field }) => (
                    <FilamentSelect
                      filaments={filaments}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                {formState.errors.filamentId && (
                  <p className="text-xs font-medium text-destructive">
                    {formState.errors.filamentId.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>服務類型</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    active: needsModeling,
                    onSelect: () => setValue("needsModeling", true),
                    icon: WandSparkles,
                    title: "建模",
                    hint: "沒有模型檔，需要我幫你畫",
                  },
                  {
                    active: !needsModeling,
                    onSelect: () => setValue("needsModeling", false),
                    icon: Package,
                    title: "代印",
                    hint: "已經有模型檔，只要幫忙印",
                  },
                ].map(({ active, onSelect, icon: Icon, title, hint }) => (
                  <button
                    key={title}
                    type="button"
                    onClick={onSelect}
                    aria-pressed={active}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-left transition-all",
                      active
                        ? "border-brand bg-brand/8 shadow-sm shadow-brand/20 ring-1 ring-brand/30"
                        : "border-border bg-card hover:border-brand/40 hover:bg-muted/50",
                    )}
                  >
                    <Icon
                      className={cn("mt-0.5 size-5", active ? "text-brand" : "text-muted-foreground")}
                    />
                    <span className="space-y-0.5">
                      <span className="block text-sm font-semibold">{title}</span>
                      <span className="block text-xs text-muted-foreground">{hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {needsModeling ? (
              <div className="space-y-2">
                <Label>建模複雜度</Label>
                <p className="text-xs text-muted-foreground">
                  大概估一下就好，實際金額我確認後會調整。
                </p>
                <Controller
                  name="modelingTierId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="選擇分級">
                          {(id: string | null) => {
                            const tier = (modelingTiersQuery.data ?? []).find((t) => t.id === id);
                            return tier
                              ? `${tier.tierName}（${formatCurrency(tier.defaultPrice)}）`
                              : "選擇分級";
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
            ) : (
              <div className="space-y-2">
                <Label>模型網址（選填）</Label>
                <Controller
                  name="modelUrl"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} placeholder="貼你要印的模型連結，方便我找檔案" />
                  )}
                />
                {formState.errors.modelUrl && (
                  <p className="text-xs font-medium text-destructive">
                    {formState.errors.modelUrl.message}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>備註（選填）</Label>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    placeholder="想補充的都可以寫這裡，例如顏色偏好、交件時間等"
                  />
                )}
              />
            </div>
          </SectionCard>

          <SectionCard
            step={2}
            icon={Clock}
            title="列印資訊"
            description="知道的話先填個大概值，估價會更準"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>克重（選填）</Label>
                <Controller
                  name="weightGrams"
                  control={control}
                  render={({ field }) => <NumberField field={field} placeholder="公克" />}
                />
              </div>
              <div className="space-y-2">
                <Label>列印小時數（選填）</Label>
                <Controller
                  name="printHours"
                  control={control}
                  render={({ field }) => <NumberField field={field} placeholder="小時" />}
                />
              </div>
            </div>

            <div className="rounded-xl border border-brand/20 bg-brand/5 p-4 text-xs/relaxed text-muted-foreground">
              <p className="mb-1 font-semibold text-foreground">關於失敗率攤提</p>
              估價已包含 {breakdown?.resolvedFailureRatePercent ?? 12}% 的失敗率攤提，
              這是材料／機台耗損的合理攤提，由賣家統一設定。
              克重與工時可參考模型網站上標示的數值，最終價格仍以我確認後為準。
            </div>
          </SectionCard>
        </div>

        {/* 右欄：桌機黏著的估價卡 */}
        <aside className="lg:sticky lg:top-24">
          <Card className="card-glow animate-rise overflow-hidden pt-0">
            <div className="bg-gradient-to-br from-brand via-brand-2 to-brand-2 px-5 py-5 text-white transition-colors duration-500">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase opacity-90">
                <Calculator className="size-4" />
                即時估價
              </div>
              {breakdown ? (
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold tracking-tight tabular-nums">
                    {formatCurrency(
                      breakdown.isComplete ? breakdown.totalPrice! : breakdown.knownSubtotal,
                    )}
                  </span>
                  <span className="text-xs opacity-90">
                    {breakdown.isComplete ? "預估總價" : "目前已知基本費"}
                  </span>
                </div>
              ) : (
                <p className="mt-3 text-lg font-semibold">選一個線材就會開始計算</p>
              )}
            </div>

            <CardContent className="space-y-1 pt-1">
              <div className="divide-y divide-border/70">
                <PriceRow label="材料費" value={<Money value={breakdown?.materialCost ?? null} />} />
                <PriceRow
                  label="電費＋折舊費"
                  value={
                    <Money
                      value={
                        breakdown?.electricityCost != null && breakdown?.depreciationCost != null
                          ? breakdown.electricityCost + breakdown.depreciationCost
                          : null
                      }
                    />
                  }
                />
                <PriceRow label="代印人工費" value={<Money value={breakdown?.laborCost ?? null} />} />
                <PriceRow
                  label="失敗率攤提"
                  value={<Money value={breakdown?.failureBufferCost ?? null} />}
                />
                {needsModeling && (
                  <PriceRow
                    label="建模費"
                    value={<Money value={breakdown?.modelingCost ?? null} />}
                  />
                )}
              </div>

              {breakdown && !breakdown.isComplete && (
                <p className="rounded-lg bg-muted/60 p-3 text-xs/relaxed text-muted-foreground">
                  材料費／電費／折舊／失敗率攤提要等我確認克重與工時後，才會有最終報價。
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                className="mt-2 w-full bg-gradient-to-r from-brand to-brand-2 text-base font-semibold text-white shadow-lg shadow-brand/25 transition-shadow hover:shadow-xl hover:shadow-brand/30"
                disabled={formState.isSubmitting}
              >
                {formState.isSubmitting ? "送出中..." : "送出詢價"}
                {!formState.isSubmitting && <ArrowRight className="size-4" />}
              </Button>
              <p className="pt-1 text-center text-xs text-muted-foreground">
                送出後會拿到一個專屬連結，隨時回來看最新報價
              </p>
            </CardContent>
          </Card>
        </aside>
      </form>
    </PageShell>
  );
}
