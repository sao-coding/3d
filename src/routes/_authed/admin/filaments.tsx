import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { ColorDot } from "@/components/color-dot";
import { ColorPicker } from "@/components/color-picker";
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
import { NumberField } from "@/components/number-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MATERIAL_TYPES } from "@/lib/constants";
import { client, orpc } from "@/lib/orpc";

export const Route = createFileRoute("/_authed/admin/filaments")({
  component: FilamentsPage,
});

const filamentSchema = z.object({
  name: z.string().min(1, "請輸入名稱"),
  brand: z.string().optional(),
  materialType: z.enum(MATERIAL_TYPES),
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

  const invalidate = () => queryClient.invalidateQueries({ queryKey: orpc.filament.list.queryKey() });

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

  return (
    <div className="container mx-auto max-w-3xl space-y-4 px-4 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">線材管理</h1>
        <Dialog open={editing === "new"} onOpenChange={(open) => setEditing(open ? "new" : null)}>
          <DialogTrigger render={<Button />}>新增線材</DialogTrigger>
          <DialogContent>
            <FilamentForm
              onSaved={() => {
                setEditing(null);
                invalidate();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>線材</TableHead>
              <TableHead>材質</TableHead>
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
                <TableCell>{filament.materialType}</TableCell>
                <TableCell>${filament.costPerGram.toFixed(2)}/g</TableCell>
                <TableCell>
                  <Switch
                    checked={filament.isActive}
                    onCheckedChange={() => handleToggleActive(filament.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Dialog
                      open={editing !== null && editing !== "new" && editing.id === filament.id}
                      onOpenChange={(open) => setEditing(open ? filament : null)}
                    >
                      <DialogTrigger render={<Button variant="outline" size="sm" />}>編輯</DialogTrigger>
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
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(filament.id)}>
                      刪除
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function FilamentForm({
  filament,
  onSaved,
}: {
  filament?: FilamentRow;
  onSaved: () => void;
}) {
  const { control, handleSubmit, formState } = useForm<
    FilamentFormInput,
    unknown,
    FilamentFormValues
  >({
    resolver: zodResolver(filamentSchema),
    defaultValues: {
      name: filament?.name ?? "",
      brand: filament?.brand ?? "",
      materialType: filament?.materialType ?? "PLA",
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="space-y-2">
          <Label>名稱</Label>
          <Controller name="name" control={control} render={({ field }) => <Input {...field} />} />
          {formState.errors.name && <p className="text-red-500">{formState.errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>廠牌</Label>
          <Controller name="brand" control={control} render={({ field }) => <Input {...field} />} />
        </div>
        <div className="space-y-2">
          <Label>材質類型</Label>
          <Controller
            name="materialType"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
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
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>購入價</Label>
            <Controller
              name="purchasePrice"
              control={control}
              render={({ field }) => <NumberField field={field} />}
            />
            {formState.errors.purchasePrice && (
              <p className="text-red-500">{formState.errors.purchasePrice.message}</p>
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
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "儲存中..." : "儲存"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
