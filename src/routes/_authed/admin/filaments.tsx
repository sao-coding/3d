import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Boxes, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ColorDot } from "@/components/color-dot";
import { ColorPicker } from "@/components/color-picker";
import { NumberField } from "@/components/number-field";
import { PageHeading, PageShell } from "@/components/page-shell";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { client, orpc } from "@/lib/orpc";

export const Route = createFileRoute("/_authed/admin/filaments")({
  component: FilamentsPage,
});

const NO_BRAND = "__none__";

const filamentSchema = z.object({
  brandId: z.string().optional(),
  materialId: z.string().min(1, "請選擇材質"),
  colorName: z.string().optional(),
  color: z.string().optional(),
  purchasePrice: z.coerce.number().int().positive("請輸入購入價"),
  weightGrams: z.coerce.number().int().positive().default(1000),
  purchasedAt: z.string().optional(),
});
type FilamentFormInput = z.input<typeof filamentSchema>;
type FilamentFormValues = z.output<typeof filamentSchema>;

type FilamentRow = Awaited<ReturnType<typeof client.filament.list>>[number];

function FilamentsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<FilamentRow | "new" | null>(null);

  const listQuery = useQuery(orpc.filament.list.queryOptions());
  const materialsQuery = useQuery(orpc.material.list.queryOptions());

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: orpc.filament.list.queryKey() });

  const handleToggleActive = async (id: string) => {
    await client.filament.toggleActive({ id });
    invalidate();
  };

  const handleDelete = async (id: string) => {
    try {
      await client.filament.delete({ id });
      toast.success("已刪除線材");
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "刪除失敗，請改成停用");
    }
  };

  const hasMaterials = (materialsQuery.data ?? []).length > 0;

  return (
    <PageShell width="lg" className="space-y-8">
      <PageHeading
        eyebrow={
          <>
            <Boxes className="size-3.5" />
            賣家後台
          </>
        }
        title="線材管理"
        description="線材顯示名稱由「廠牌 材質 色名」自動組成。這裡維護的每克成本會直接影響客人看到的估價。"
        actions={
          <Dialog open={editing === "new"} onOpenChange={(open) => setEditing(open ? "new" : null)}>
            <DialogTrigger
              render={<Button size="lg" disabled={!hasMaterials} />}
            >
              <Plus className="size-4" />
              新增線材
            </DialogTrigger>
            <DialogContent>
              <FilamentForm
                onSaved={() => {
                  setEditing(null);
                  invalidate();
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      {!hasMaterials && !materialsQuery.isLoading && (
        <div className="animate-rise rounded-2xl border border-brand/20 bg-brand/5 p-4 text-sm text-muted-foreground">
          還沒有任何材質，線材必須先選一個材質才能建立。請先到{" "}
          <Link to="/admin/materials" className="font-medium text-brand hover:underline">
            材質管理
          </Link>{" "}
          新增。
        </div>
      )}

      <div className="animate-rise overflow-x-auto rounded-2xl border border-border bg-card p-1 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>線材</TableHead>
              {/* 廠牌與材質已經包含在「線材」那一欄的名稱裡，手機上就不重複佔寬度 */}
              <TableHead className="hidden md:table-cell">廠牌</TableHead>
              <TableHead className="hidden md:table-cell">材質</TableHead>
              <TableHead>每克成本</TableHead>
              <TableHead>啟用</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(listQuery.data ?? []).map((filament) => (
              <TableRow key={filament.id}>
                <TableCell>
                  <span className="flex items-center gap-1.5">
                    <ColorDot color={filament.color} />
                    {filament.name}
                  </span>
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {filament.brandName ?? "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell">{filament.materialName}</TableCell>
                <TableCell className="whitespace-nowrap">
                  ${filament.costPerGram.toFixed(2)}/g
                </TableCell>
                <TableCell>
                  <Switch
                    checked={filament.isActive}
                    onCheckedChange={() => handleToggleActive(filament.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Dialog
                      open={editing !== null && editing !== "new" && editing.id === filament.id}
                      onOpenChange={(open) => setEditing(open ? filament : null)}
                    >
                      <DialogTrigger
                        render={<Button variant="outline" size="sm" aria-label="編輯" />}
                      >
                        <Pencil className="size-3.5" />
                        <span className="hidden lg:inline">編輯</span>
                      </DialogTrigger>
                      <DialogContent>
                        <FilamentForm
                          filament={filament}
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
                      aria-label="刪除"
                      onClick={() => handleDelete(filament.id)}
                    >
                      <Trash2 className="size-3.5" />
                      <span className="hidden lg:inline">刪除</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <BrandsSection />
    </PageShell>
  );
}

/** 廠牌就是一串名字，放在用得到它的線材頁上直接維護 */
function BrandsSection() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const brandsQuery = useQuery(orpc.brand.list.queryOptions());
  const invalidate = () => queryClient.invalidateQueries({ queryKey: orpc.brand.list.queryKey() });

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await client.brand.create({ name, sortOrder: 0 });
      setNewName("");
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "新增失敗");
    }
  };

  const remove = async (id: string) => {
    try {
      await client.brand.delete({ id });
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "刪除失敗");
    }
  };

  const brands = brandsQuery.data ?? [];

  return (
    <Card className="animate-rise">
      <CardHeader>
        <CardTitle>廠牌</CardTitle>
        <p className="text-sm text-muted-foreground">新增線材時可以選的廠牌清單。</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="例如：eSUN"
            className="max-w-xs"
          />
          <Button type="button" size="lg" onClick={add} disabled={!newName.trim()}>
            <Plus className="size-4" />
            新增
          </Button>
        </div>

        {brands.length === 0 ? (
          <p className="text-sm text-muted-foreground">還沒有廠牌，線材的廠牌欄位可以先留空。</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {brands.map((brand) => (
              <span
                key={brand.id}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card/70 py-1 pr-1 pl-3 text-sm"
              >
                {brand.name}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`刪除 ${brand.name}`}
                  onClick={() => remove(brand.id)}
                >
                  <X className="size-3" />
                </Button>
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FilamentForm({ filament, onSaved }: { filament?: FilamentRow; onSaved: () => void }) {
  const materialsQuery = useQuery(orpc.material.list.queryOptions());
  const brandsQuery = useQuery(orpc.brand.list.queryOptions());
  const materials = materialsQuery.data ?? [];
  const brands = brandsQuery.data ?? [];

  const { control, handleSubmit, formState } = useForm<
    FilamentFormInput,
    unknown,
    FilamentFormValues
  >({
    resolver: zodResolver(filamentSchema),
    defaultValues: {
      brandId: filament?.brandId ?? NO_BRAND,
      materialId: filament?.materialId ?? materials[0]?.id ?? "",
      colorName: filament?.colorName ?? "",
      color: filament?.color ?? "#1a1a1a",
      purchasePrice: filament?.purchasePrice ?? undefined,
      weightGrams: filament?.weightGrams ?? 1000,
      purchasedAt: filament?.purchasedAt
        ? new Date(filament.purchasedAt).toISOString().slice(0, 10)
        : "",
    },
  });

  const onSubmit = async (values: FilamentFormValues) => {
    const payload = {
      ...values,
      brandId: values.brandId && values.brandId !== NO_BRAND ? values.brandId : null,
      purchasedAt: values.purchasedAt ? new Date(values.purchasedAt) : undefined,
    };
    try {
      if (filament) {
        await client.filament.update({ id: filament.id, ...payload });
      } else {
        await client.filament.create(payload);
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
        <DialogTitle>{filament ? "編輯線材" : "新增線材"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>廠牌</Label>
            <Controller
              name="brandId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="不指定">
                      {(id: string | null) =>
                        brands.find((b) => b.id === id)?.name ?? "不指定"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_BRAND}>不指定</SelectItem>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>材質</Label>
            <Controller
              name="materialId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="選擇材質">
                      {(id: string | null) =>
                        materials.find((m) => m.id === id)?.name ?? "選擇材質"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {formState.errors.materialId && (
              <p className="text-xs font-medium text-destructive">
                {formState.errors.materialId.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>色名</Label>
            <Controller
              name="colorName"
              control={control}
              render={({ field }) => <Input {...field} placeholder="例如：黑、消光灰" />}
            />
            <p className="text-xs text-muted-foreground">用來分辨同廠牌同材質的不同顏色。</p>
          </div>
          <div className="space-y-2">
            <Label>顏色</Label>
            <Controller
              name="color"
              control={control}
              render={({ field }) => (
                <ColorPicker value={field.value || "#1a1a1a"} onChange={field.onChange} />
              )}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>購入價</Label>
            <Controller
              name="purchasePrice"
              control={control}
              render={({ field }) => <NumberField field={field} />}
            />
            {formState.errors.purchasePrice && (
              <p className="text-xs font-medium text-destructive">
                {formState.errors.purchasePrice.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>淨重（g）</Label>
            <Controller
              name="weightGrams"
              control={control}
              render={({ field }) => <NumberField field={field} />}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>購入日期</Label>
          <Controller
            name="purchasedAt"
            control={control}
            render={({ field }) => <Input {...field} type="date" />}
          />
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
