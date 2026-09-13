import { ORPCError } from "@orpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db";
import { filaments, materials } from "@/server/db/schema/app";
import { protectedProcedure, publicProcedure } from "@/server/procedures";

// 空字串的優缺點項目不存 —— 表單上多按幾次加號留下的空欄位不該進 DB
const bulletList = z
  .array(z.string())
  .transform((items) => items.map((s) => s.trim()).filter(Boolean));

const materialInput = z.object({
  name: z.string().min(1, "請輸入材質名稱"),
  pros: bulletList,
  cons: bulletList,
  goodFor: z.string().optional(),
  isHighTemp: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const materialRouter = {
  // 公開：/materials 材質介紹頁與詢價表單的材質分類都讀這個
  list: publicProcedure.handler(async () => {
    return db.select().from(materials).orderBy(asc(materials.sortOrder), asc(materials.name));
  }),

  create: protectedProcedure.input(materialInput).handler(async ({ input }) => {
    const [created] = await db
      .insert(materials)
      .values({ ...input, goodFor: input.goodFor || null })
      .returning();
    return created;
  }),

  update: protectedProcedure
    .input(materialInput.partial().extend({ id: z.string() }))
    .handler(async ({ input }) => {
      const { id, ...rest } = input;
      const [updated] = await db
        .update(materials)
        .set({ ...rest, ...(rest.goodFor !== undefined && { goodFor: rest.goodFor || null }) })
        .where(eq(materials.id, id))
        .returning();
      if (!updated) throw new ORPCError("NOT_FOUND");
      return updated;
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
    const [referencing] = await db
      .select({ id: filaments.id })
      .from(filaments)
      .where(eq(filaments.materialId, input.id))
      .limit(1);
    if (referencing) {
      throw new ORPCError("CONFLICT", {
        message: "還有線材使用這個材質，請先改掉那些線材的材質再刪除。",
      });
    }
    await db.delete(materials).where(eq(materials.id, input.id));
    return { success: true };
  }),
};
