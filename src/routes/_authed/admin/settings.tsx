import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberField } from "@/components/number-field";
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
    <div className="container mx-auto max-w-2xl space-y-4 px-4 py-4">
      <h1 className="text-xl font-semibold">全域參數設定</h1>
      {settingsQuery.data && (
        <SettingsForm
          settings={settingsQuery.data}
          onSaved={() => queryClient.invalidateQueries({ queryKey: orpc.settings.get.queryKey() })}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>建模複雜度分級</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(tiersQuery.data ?? []).map((tier) => (
            <TierRow
              key={tier.id}
              tier={tier}
              onSaved={() =>
                queryClient.invalidateQueries({ queryKey: orpc.settings.listModelingTiers.queryKey() })
              }
            />
          ))}
        </CardContent>
      </Card>
    </div>
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
    <Card>
      <CardHeader>
        <CardTitle>計價參數</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
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
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "儲存中..." : "儲存設定"}
          </Button>
        </form>
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
}: {
  tier: Awaited<ReturnType<typeof client.settings.listModelingTiers>>[number];
  onSaved: () => void;
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
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-2">
      <div className="space-y-1">
        <Label>名稱</Label>
        <Controller name="tierName" control={control} render={({ field }) => <Input {...field} />} />
      </div>
      <div className="space-y-1">
        <Label>預設金額</Label>
        <Controller
          name="defaultPrice"
          control={control}
          render={({ field }) => <NumberField field={field} className="w-24" />}
        />
      </div>
      <div className="space-y-1">
        <Label>順序</Label>
        <Controller
          name="sortOrder"
          control={control}
          render={({ field }) => <NumberField field={field} className="w-16" />}
        />
      </div>
      <Button type="submit" size="sm" disabled={formState.isSubmitting}>
        儲存
      </Button>
    </form>
  );
}
