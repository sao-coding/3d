import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Layers, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { NumberField } from "@/components/number-field";
import { PageHeading, PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { client, orpc } from "@/lib/orpc";

export const Route = createFileRoute("/_authed/admin/materials")({
  component: MaterialsAdminPage,
});

// useFieldArray 需要物件陣列，所以優缺點用 { value } 包起來，送出前再攤平成字串陣列
const materialSchema = z.object({
  name: z.string().min(1, "請輸入材質名稱"),
  pros: z.array(z.object({ value: z.string() })),
  cons: z.array(z.object({ value: z.string() })),
  goodFor: z.string().optional(),
  isHighTemp: z.boolean(),
  sortOrder: z.coerce.number().int(),
});
type MaterialFormInput = z.input<typeof materialSchema>;
type MaterialFormValues = z.output<typeof materialSchema>;

type MaterialRow = Awaited<ReturnType<typeof client.material.list>>[number];

function MaterialsAdminPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<MaterialRow | "new" | null>(null);

  const materialsQuery = useQuery(orpc.material.list.queryOptions());
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: orpc.material.list.queryKey() });

  const handleDelete = async (id: string) => {
    try {
      await client.material.delete({ id });
      toast.success("已刪除材質");
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "刪除失敗");
    }
  };

  const materials = materialsQuery.data ?? [];

  return (
    <PageShell width="lg" className="space-y-8">
      <PageHeading
        eyebrow={
          <>
            <Layers className="size-3.5" />
            賣家後台
          </>
        }
        title="材質管理"
        description="這裡維護的材質會同時用在「材質介紹」頁面與線材的材質分類。"
        actions={
          <Dialog
            open={editing === "new"}
            onOpenChange={(open) => setEditing(open ? "new" : null)}
          >
            <DialogTrigger render={<Button size="lg" />}>
              <Plus className="size-4" />
              新增材質
            </DialogTrigger>
            <DialogContent>
              <MaterialForm
                onSaved={() => {
                  setEditing(null);
                  invalidate();
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {materials.map((material, index) => (
          <Card
            key={material.id}
            className="animate-rise hover-lift"
            style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{material.name}</CardTitle>
                  {material.isHighTemp && <Badge variant="secondary">高溫</Badge>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Dialog
                    open={editing !== null && editing !== "new" && editing.id === material.id}
                    onOpenChange={(open) => setEditing(open ? material : null)}
                  >
                    <DialogTrigger render={<Button variant="outline" size="sm" />}>
                      <Pencil className="size-3.5" />
                      編輯
                    </DialogTrigger>
                    <DialogContent>
                      <MaterialForm
                        material={material}
                        onSaved={() => {
                          setEditing(null);
                          invalidate();
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(material.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-1">
                {material.pros.map((pro) => (
                  <li key={pro} className="flex gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    <span className="text-muted-foreground">{pro}</span>
                  </li>
                ))}
                {material.cons.map((con) => (
                  <li key={con} className="flex gap-2 text-sm">
                    <X className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <span className="text-muted-foreground">{con}</span>
                  </li>
                ))}
              </ul>
              {material.goodFor && (
                <p className="text-sm">
                  <span className="font-medium">適合：</span>
                  <span className="text-muted-foreground">{material.goodFor}</span>
                </p>
              )}
            </CardContent>
          </Card>
        ))}
        {!materialsQuery.isLoading && materials.length === 0 && (
          <Card className="animate-rise py-12 text-center md:col-span-2">
            <CardContent className="space-y-1">
              <p className="font-semibold">還沒有材質</p>
              <p className="text-sm text-muted-foreground">
                新增第一個材質後，詢價表單與材質介紹頁就會有東西可以選。
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  );
}

/** 優點／缺點共用的可增減輸入清單 */
function BulletFields({
  control,
  name,
  label,
  placeholder,
}: {
  control: ReturnType<typeof useForm<MaterialFormInput, unknown, MaterialFormValues>>["control"];
  name: "pros" | "cons";
  label: string;
  placeholder: string;
}) {
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-2">
            <Controller
              name={`${name}.${index}.value` as const}
              control={control}
              render={({ field: input }) => (
                <Input {...input} placeholder={placeholder} className="flex-1" />
              )}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`新增一項${label}`}
              onClick={() => append({ value: "" })}
            >
              <Plus className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`刪除這一項${label}`}
              disabled={fields.length === 1}
              onClick={() => remove(index)}
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MaterialForm({
  material,
  onSaved,
}: {
  material?: MaterialRow;
  onSaved: () => void;
}) {
  const { control, handleSubmit, formState } = useForm<
    MaterialFormInput,
    unknown,
    MaterialFormValues
  >({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      name: material?.name ?? "",
      // 至少留一個空欄位，不然新增時畫面上沒有東西可以打
      pros: material?.pros.length ? material.pros.map((value) => ({ value })) : [{ value: "" }],
      cons: material?.cons.length ? material.cons.map((value) => ({ value })) : [{ value: "" }],
      goodFor: material?.goodFor ?? "",
      isHighTemp: material?.isHighTemp ?? false,
      sortOrder: material?.sortOrder ?? 0,
    },
  });

  const onSubmit = async (values: MaterialFormValues) => {
    const payload = {
      name: values.name,
      pros: values.pros.map((p) => p.value),
      cons: values.cons.map((c) => c.value),
      goodFor: values.goodFor,
      isHighTemp: values.isHighTemp,
      sortOrder: values.sortOrder,
    };
    try {
      if (material) {
        await client.material.update({ id: material.id, ...payload });
      } else {
        await client.material.create(payload);
      }
      toast.success("已儲存");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "儲存失敗");
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{material ? "編輯材質" : "新增材質"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="max-h-[65vh] space-y-4 overflow-y-auto">
        <div className="space-y-2">
          <Label>材質名稱</Label>
          <Controller
            name="name"
            control={control}
            render={({ field }) => <Input {...field} placeholder="例如：PLA" />}
          />
          {formState.errors.name && (
            <p className="text-xs font-medium text-destructive">{formState.errors.name.message}</p>
          )}
        </div>

        <BulletFields control={control} name="pros" label="優點" placeholder="例如：好印、翹曲風險低" />
        <BulletFields control={control} name="cons" label="缺點" placeholder="例如：耐熱差，夏天易變形" />

        <div className="space-y-2">
          <Label>適合什麼</Label>
          <Controller
            name="goodFor"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="例如：公仔、模型、擺飾、室內用小物" />
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>排序</Label>
            <Controller
              name="sortOrder"
              control={control}
              render={({ field }) => <NumberField field={field} />}
            />
            <p className="text-xs text-muted-foreground">數字小的排前面。</p>
          </div>
          <div className="space-y-2">
            <Label>高溫材質</Label>
            <div className="flex h-10 items-center">
              <Controller
                name="isHighTemp"
                control={control}
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              ABS／PC／Nylon 這類需要高溫的材質耗電較多，打開會用較高的每小時度數計電費。
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="submit" size="lg" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "儲存中..." : "儲存"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
