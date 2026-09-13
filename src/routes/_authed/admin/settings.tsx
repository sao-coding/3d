import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Settings2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { NumberField } from "@/components/number-field";
import { PageHeading, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { client, orpc } from "@/lib/orpc";

export const Route = createFileRoute("/_authed/admin/settings")({
  component: SettingsPage,
});

const settingsSchema = z.object({
  failureRatePercent: z.coerce.number().int().min(0).max(100),
  depreciationPerHour: z.coerce.number().int().min(0),
  electricitySummer: z.coerce.number().min(0),
  electricityOffseason: z.coerce.number().min(0),
  slicingFixedFee: z.coerce.number().int().min(0),
  cleanupRatePerMinute: z.coerce.number().int().min(0),
  revisionFee: z.coerce.number().int().min(0),
  freeRevisionCount: z.coerce.number().int().min(0),
});
type SettingsFormInput = z.input<typeof settingsSchema>;
type SettingsFormValues = z.output<typeof settingsSchema>;

function SettingsPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery(orpc.settings.get.queryOptions());
  const tiersQuery = useQuery(orpc.settings.listModelingTiers.queryOptions());

  return (
    <PageShell width="md" className="space-y-8">
      <PageHeading
        eyebrow={
          <>
            <Settings2 className="size-3.5" />
            賣家後台
          </>
        }
        title="全域參數設定"
        description="電費、折舊、人工費與失敗率的預設值，會套用到所有新的報價。"
      />

      {settingsQuery.data && (
        <SettingsForm
          settings={settingsQuery.data}
          onSaved={() => queryClient.invalidateQueries({ queryKey: orpc.settings.get.queryKey() })}
        />
      )}

      <ModelingTiersCard
        tiers={tiersQuery.data ?? []}
        isLoading={tiersQuery.isLoading}
        onChanged={() =>
          queryClient.invalidateQueries({
            queryKey: orpc.settings.listModelingTiers.queryKey(),
          })
        }
      />
    </PageShell>
  );
}

function SettingsForm({
  settings,
  onSaved,
}: {
  settings: Awaited<ReturnType<typeof client.settings.get>>;
  onSaved: () => void;
}) {
  const { control, handleSubmit, formState } = useForm<
    SettingsFormInput,
    unknown,
    SettingsFormValues
  >({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });

  const onSubmit = async (values: SettingsFormValues) => {
    try {
      await client.settings.update(values);
      toast.success("已儲存設定");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "儲存失敗");
    }
  };

  const fields: { name: keyof SettingsFormValues; label: string }[] = [
    { name: "failureRatePercent", label: "預設失敗率攤提 %" },
    { name: "depreciationPerHour", label: "每小時折舊費" },
    { name: "electricitySummer", label: "夏季每度電價" },
    { name: "electricityOffseason", label: "非夏季每度電價" },
    { name: "slicingFixedFee", label: "切片開機固定費" },
    { name: "cleanupRatePerMinute", label: "清理人工每分鐘費用" },
    { name: "revisionFee", label: "超額修改每版費用" },
    { name: "freeRevisionCount", label: "免費修改版本數" },
  ];

  return (
    <Card className="animate-rise">
      <CardHeader>
        <CardTitle>計價參數</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(({ name, label }) => (
              <div key={name} className="space-y-2">
                <Label>{label}</Label>
                <Controller
                  name={name}
                  control={control}
                  render={({ field }) => <NumberField field={field} step="any" />}
                />
              </div>
            ))}
          </div>
          <Button type="submit" size="lg" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "儲存中..." : "儲存設定"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

type Tier = Awaited<ReturnType<typeof client.settings.listModelingTiers>>[number];

function ModelingTiersCard({
  tiers,
  isLoading,
  onChanged,
}: {
  tiers: Tier[];
  isLoading: boolean;
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);

  const addTier = async () => {
    setAdding(true);
    try {
      // 新增一列空白分級，實際名稱與金額直接在列上改再按儲存
      await client.settings.createModelingTier({
        tierName: "新分級",
        defaultPrice: 0,
        sortOrder: (tiers.at(-1)?.sortOrder ?? -1) + 1,
      });
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "新增失敗");
    } finally {
      setAdding(false);
    }
  };

  const removeTier = async (id: string) => {
    try {
      await client.settings.deleteModelingTier({ id });
      toast.success("已刪除分級");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "刪除失敗");
    }
  };

  return (
    <Card className="animate-rise">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>建模複雜度分級</CardTitle>
            <p className="text-sm text-muted-foreground">
              客人在詢價表單會看到這幾個選項與預設金額。
            </p>
          </div>
          <Button type="button" variant="outline" size="lg" onClick={addTier} disabled={adding}>
            <Plus className="size-4" />
            新增分級
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {tiers.map((tier) => (
          <TierRow key={tier.id} tier={tier} onSaved={onChanged} onDelete={removeTier} />
        ))}
        {!isLoading && tiers.length === 0 && (
          <p className="text-sm text-muted-foreground">
            還沒有任何分級。按「新增分級」建立第一個，客人才選得到建模服務的複雜度。
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const tierSchema = z.object({
  tierName: z.string().min(1),
  defaultPrice: z.coerce.number().int().min(0),
  sortOrder: z.coerce.number().int(),
});
type TierFormInput = z.input<typeof tierSchema>;
type TierFormValues = z.output<typeof tierSchema>;

function TierRow({
  tier,
  onSaved,
  onDelete,
}: {
  tier: Tier;
  onSaved: () => void;
  onDelete: (id: string) => void;
}) {
  const { control, handleSubmit, formState } = useForm<TierFormInput, unknown, TierFormValues>({
    resolver: zodResolver(tierSchema),
    defaultValues: tier,
  });

  const onSubmit = async (values: TierFormValues) => {
    try {
      await client.settings.updateModelingTier({ id: tier.id, ...values });
      toast.success("已儲存");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "儲存失敗");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 rounded-xl border border-border/70 bg-muted/30 p-3 sm:grid-cols-[minmax(0,1fr)_6rem_4.5rem_auto_auto]"
    >
      {/* 手機上名稱獨佔一列，金額與順序併一列，按鈕再一列 */}
      <div className="col-span-2 space-y-1 sm:col-span-1">
        <Label>名稱</Label>
        <Controller name="tierName" control={control} render={({ field }) => <Input {...field} />} />
      </div>
      <div className="space-y-1">
        <Label>預設金額</Label>
        <Controller
          name="defaultPrice"
          control={control}
          render={({ field }) => <NumberField field={field} />}
        />
      </div>
      <div className="space-y-1">
        <Label>順序</Label>
        <Controller
          name="sortOrder"
          control={control}
          render={({ field }) => <NumberField field={field} />}
        />
      </div>
      <Button type="submit" size="sm" className="justify-self-start" disabled={formState.isSubmitting}>
        儲存
      </Button>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        className="justify-self-start"
        aria-label={`刪除 ${tier.tierName}`}
        onClick={() => onDelete(tier.id)}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </form>
  );
}
