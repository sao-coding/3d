import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db";
import { MATERIAL_TYPES, filaments, quotes } from "@/server/db/schema/app";
import { protectedProcedure, publicProcedure } from "@/server/procedures";

const filamentInput = z.object({
  name: z.string().min(1),
  brand: z.string().optional(),
  materialType: z.enum(MATERIAL_TYPES),
  color: z.string().optional(),
  purchasePrice: z.number().int().positive(),
  weightGrams: z.number().int().positive().default(1000),
  purchasedAt: z.coerce.date().optional(),
});

export const filamentRouter = {
  // 公開：詢價表單的線材下拉選單用。含每克成本（賣家選擇公開揭露，方便客人理解報價依據），
  // 但不含購入價/淨重等更完整的成本明細（那些留在後台管理用）。
  listActive: publicProcedure.handler(async () => {
    return db
      .select({
        id: filaments.id,
        name: filaments.name,
        color: filaments.color,
        materialType: filaments.materialType,
        costPerGram: filaments.costPerGram,
      })
      .from(filaments)
      .where(eq(filaments.isActive, true))
      .orderBy(filaments.name);
  }),

  // 需登入：後台管理用，含成本與停用中的線材
  list: protectedProcedure.handler(async () => {
    return db.select().from(filaments).orderBy(filaments.name);
  }),

  create: protectedProcedure.input(filamentInput).handler(async ({ input }) => {
    const costPerGram = input.purchasePrice / input.weightGrams;
    const [created] = await db
      .insert(filaments)
      .values({ ...input, costPerGram })
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
        .set({ ...rest, costPerGram })
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
