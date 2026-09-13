import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilamentSelect } from "@/components/filament-select";
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
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { client, orpc } from "@/lib/orpc";

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
    return <span className="text-muted-foreground">{pending ?? "待確認"}</span>;
  }
  return <span>{formatCurrency(value)}</span>;
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

  const submitRequest = async (values: FormOutput) => {
    const input = {
      filamentId: values.filamentId,
      weightGrams: values.weightGrams ?? null,
      printHours: values.printHours ?? null,
      needsModeling: values.needsModeling,
      modelingTierId: values.needsModeling ? (values.modelingTierId ?? null) : null,
      modelUrl: !values.needsModeling ? (values.modelUrl || null) : null,
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

  const needsModeling = watch("needsModeling");

  return (
    <div className="container mx-auto max-w-2xl space-y-4 px-4 py-4">
      <div>
        <h1 className="text-xl font-semibold">3D 列印代工詢價</h1>
        <p className="text-sm text-muted-foreground">
          填好下面資訊就會有初步估價；克重/小時數不知道可以先留空，我確認後會補上最終價格。
        </p>
      </div>

      <form onSubmit={handleSubmit(submitRequest)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>基本資訊</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>對象名稱（選填）</Label>
              <Controller
                name="recipientName"
                control={control}
                render={({ field }) => <Input {...field} placeholder="方便日後辨識，例如：同事小陳" />}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>線材</Label>
                <Link to="/materials" className="text-muted-foreground underline">
                  不知道選哪種材質？看材質介紹
                </Link>
              </div>
              <Controller
                name="filamentId"
                control={control}
                render={({ field }) => (
                  <FilamentSelect
                    filaments={filamentsQuery.data ?? []}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {formState.errors.filamentId && (
                <p className="text-red-500">{formState.errors.filamentId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>服務類型</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={needsModeling ? "default" : "outline"}
                  onClick={() => setValue("needsModeling", true)}
                  className="flex-1"
                >
                  建模
                </Button>
                <Button
                  type="button"
                  variant={!needsModeling ? "default" : "outline"}
                  onClick={() => setValue("needsModeling", false)}
                  className="flex-1"
                >
                  代印
                </Button>
              </div>
            </div>

            {needsModeling ? (
              <div className="space-y-2">
                <Label>建模複雜度（大概估一下就好，實際金額我確認後會調整）</Label>
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
                  <p className="text-red-500">{formState.errors.modelUrl.message}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>備註（選填）</Label>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <Textarea {...field} placeholder="想補充的都可以寫這裡，例如顏色偏好、交件時間等" />
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>列印資訊</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              失敗率攤提（{breakdown?.resolvedFailureRatePercent ?? 12}%）已包含在下面的估價中，
              這是材料/機台耗損的合理攤提，由賣家統一設定。
            </p>

            <div className="grid grid-cols-2 gap-4">
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
            <p className="text-muted-foreground">
              知道的話可以先填一個大概值（例如模型網站上標示的參考重量/時間），最終價格仍以我確認後為準。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>估價結果</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-muted-foreground">
              材料費 = 克重 × 線材每克成本；電費／折舊費依列印小時數計算。
            </p>
            <div className="flex justify-between">
              <span>材料費</span>
              <Money value={breakdown?.materialCost ?? null} />
            </div>
            <div className="flex justify-between">
              <span>電費＋折舊費</span>
              <Money
                value={
                  breakdown?.electricityCost != null && breakdown?.depreciationCost != null
                    ? breakdown.electricityCost + breakdown.depreciationCost
                    : null
                }
              />
            </div>
            <div className="flex justify-between">
              <span>代印人工費</span>
              <Money value={breakdown?.laborCost ?? null} />
            </div>
            <div className="flex justify-between">
              <span>失敗率攤提</span>
              <Money value={breakdown?.failureBufferCost ?? null} />
            </div>
            {needsModeling && (
              <div className="flex justify-between">
                <span>建模費</span>
                <Money value={breakdown?.modelingCost ?? null} />
              </div>
            )}
            <hr />
            {breakdown?.isComplete ? (
              <div className="flex justify-between text-lg font-bold">
                <span>總價</span>
                <span>{formatCurrency(breakdown.totalPrice!)}</span>
              </div>
            ) : (
              <div className="flex justify-between font-medium">
                <span>目前已知基本費</span>
                <span>{breakdown ? formatCurrency(breakdown.knownSubtotal) : "—"}</span>
              </div>
            )}
            {breakdown && !breakdown.isComplete && (
              <p className="text-muted-foreground">
                材料費/電費/折舊/失敗率攤提要等我確認克重與工時後才會有最終報價。
              </p>
            )}
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" size="lg" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "送出中..." : "送出詢價"}
        </Button>
      </form>
    </div>
  );
}
