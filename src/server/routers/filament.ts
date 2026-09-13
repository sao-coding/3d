import { ORPCError } from "@orpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { filamentLabel } from "@/lib/filament-label";
import { db } from "@/server/db";
import { brands, filaments, materials, quotes } from "@/server/db/schema/app";
import { protectedProcedure, publicProcedure } from "@/server/procedures";

const filamentInput = z.object({
  brandId: z.string().nullable().optional(),
  materialId: z.string().min(1, "請選擇材質"),
  colorName: z.string().optional(),
  color: z.string().optional(),
  purchasePrice: z.number().int().positive(),
  weightGrams: z.number().int().positive().default(1000),
  purchasedAt: z.coerce.date().optional(),
});

/** 列表都要帶廠牌/材質名稱，才組得出顯示名稱 */
const withNames = {
  id: filaments.id,
  brandId: filaments.brandId,
  brandName: brands.name,
  materialId: filaments.materialId,
  materialName: materials.name,
  colorName: filaments.colorName,
  color: filaments.color,
  costPerGram: filaments.costPerGram,
} as const;

export const filamentRouter = {
  // 公開：詢價表單的線材下拉選單用。含每克成本（賣家選擇公開揭露，方便客人理解報價依據），
  // 但不含購入價/淨重等更完整的成本明細（那些留在後台管理用）。
  listActive: publicProcedure.handler(async () => {
    const rows = await db
      .select(withNames)
      .from(filaments)
      .innerJoin(materials, eq(filaments.materialId, materials.id))
      .leftJoin(brands, eq(filaments.brandId, brands.id))
      .where(eq(filaments.isActive, true))
      .orderBy(asc(brands.name), asc(materials.name), asc(filaments.colorName));
    return rows.map((row) => ({ ...row, name: filamentLabel(row) }));
  }),

  // 需登入：後台管理用，含成本與停用中的線材
  list: protectedProcedure.handler(async () => {
    const rows = await db
      .select({
        ...withNames,
        purchasePrice: filaments.purchasePrice,
        weightGrams: filaments.weightGrams,
        isActive: filaments.isActive,
        purchasedAt: filaments.purchasedAt,
      })
      .from(filaments)
      .innerJoin(materials, eq(filaments.materialId, materials.id))
      .leftJoin(brands, eq(filaments.brandId, brands.id))
      .orderBy(asc(brands.name), asc(materials.name), asc(filaments.colorName));
    return rows.map((row) => ({ ...row, name: filamentLabel(row) }));
  }),

  create: protectedProcedure.input(filamentInput).handler(async ({ input }) => {
    const costPerGram = input.purchasePrice / input.weightGrams;
    const [created] = await db
      .insert(filaments)
      .values({ ...input, brandId: input.brandId || null, costPerGram })
      .returning();
    return created;
  }),

  update: protectedProcedure
    .input(filamentInput.partial().extend({ id: z.string() }))
    .handler(async ({ input }) => {
      const { id, ...rest } = input;
      const [existing] = await db.select().from(filaments).where(eq(filaments.id, id));
      if (!existing) throw new ORPCError("NOT_FOUND");

      const purchasePrice = rest.purchasePrice ?? existing.purchasePrice;
      const weightGrams = rest.weightGrams ?? existing.weightGrams;
      const costPerGram = purchasePrice / weightGrams;

      const [updated] = await db
        .update(filaments)
        .set({
          ...rest,
          ...(rest.brandId !== undefined && { brandId: rest.brandId || null }),
          costPerGram,
        })
        .where(eq(filaments.id, id))
        .returning();
      return updated;
    }),

  toggleActive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const [existing] = await db.select().from(filaments).where(eq(filaments.id, input.id));
      if (!existing) throw new ORPCError("NOT_FOUND");

      const [updated] = await db
        .update(filaments)
        .set({ isActive: !existing.isActive })
        .where(eq(filaments.id, input.id))
        .returning();
      return updated;
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
    const [referencing] = await db
      .select({ id: quotes.id })
      .from(quotes)
      .where(eq(quotes.filamentId, input.id))
      .limit(1);
    if (referencing) {
      throw new ORPCError("CONFLICT", {
        message: "這個線材已經被報價紀錄引用，請改成停用而不是刪除。",
      });
    }
    await db.delete(filaments).where(eq(filaments.id, input.id));
    return { success: true };
  }),
};
