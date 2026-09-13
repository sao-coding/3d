import { ORPCError } from "@orpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db";
import { brands, filaments } from "@/server/db/schema/app";
import { protectedProcedure, publicProcedure } from "@/server/procedures";

const brandInput = z.object({
  name: z.string().min(1, "請輸入廠牌名稱"),
  sortOrder: z.number().int().default(0),
});

export const brandRouter = {
  // 公開：線材下拉選單要用廠牌組出顯示名稱
  list: publicProcedure.handler(async () => {
    return db.select().from(brands).orderBy(asc(brands.sortOrder), asc(brands.name));
  }),

  create: protectedProcedure.input(brandInput).handler(async ({ input }) => {
    const [created] = await db.insert(brands).values(input).returning();
    return created;
  }),

  update: protectedProcedure
    .input(brandInput.partial().extend({ id: z.string() }))
    .handler(async ({ input }) => {
      const { id, ...rest } = input;
      const [updated] = await db.update(brands).set(rest).where(eq(brands.id, id)).returning();
      if (!updated) throw new ORPCError("NOT_FOUND");
      return updated;
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
    const [referencing] = await db
      .select({ id: filaments.id })
      .from(filaments)
      .where(eq(filaments.brandId, input.id))
      .limit(1);
    if (referencing) {
      throw new ORPCError("CONFLICT", {
        message: "還有線材屬於這個廠牌，請先改掉那些線材的廠牌再刪除。",
      });
    }
    await db.delete(brands).where(eq(brands.id, input.id));
    return { success: true };
  }),
};
