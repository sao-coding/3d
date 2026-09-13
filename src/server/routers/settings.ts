import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db";
import { modelingTiers, pricingSettings } from "@/server/db/schema/app";
import { protectedProcedure, publicProcedure } from "@/server/procedures";

const DEFAULT_SETTINGS_ID = "default";

export async function getOrCreateSettings() {
  const [existing] = await db
    .select()
    .from(pricingSettings)
    .where(eq(pricingSettings.id, DEFAULT_SETTINGS_ID));
  if (existing) return existing;

  const [created] = await db
    .insert(pricingSettings)
    .values({ id: DEFAULT_SETTINGS_ID })
    .returning();
  if (!created) throw new Error("failed to create default pricing_settings row");
  return created;
}

const settingsInput = z.object({
  failureRatePercent: z.number().int().min(0).max(100),
  depreciationPerHour: z.number().int().min(0),
  electricitySummer: z.number().min(0),
  electricityOffseason: z.number().min(0),
  slicingFixedFee: z.number().int().min(0),
  cleanupRatePerMinute: z.number().int().min(0),
  revisionFee: z.number().int().min(0),
  freeRevisionCount: z.number().int().min(0),
});

export const settingsRouter = {
  // 需登入：後台的全域參數設定
  get: protectedProcedure.handler(async () => getOrCreateSettings()),

  update: protectedProcedure.input(settingsInput).handler(async ({ input }) => {
    await getOrCreateSettings();
    const [updated] = await db
      .update(pricingSettings)
      .set(input)
      .where(eq(pricingSettings.id, DEFAULT_SETTINGS_ID))
      .returning();
    return updated;
  }),

  // 公開：詢價表單的建模分級下拉選單用（服務價目本來就是要給客戶看的，不算成本機密）
  listModelingTiers: publicProcedure.handler(async () => {
    return db.select().from(modelingTiers).orderBy(modelingTiers.sortOrder);
  }),

  updateModelingTier: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        tierName: z.string().min(1).optional(),
        defaultPrice: z.number().int().min(0).optional(),
        sortOrder: z.number().int().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { id, ...rest } = input;
      const [updated] = await db
        .update(modelingTiers)
        .set(rest)
        .where(eq(modelingTiers.id, id))
        .returning();
      return updated;
    }),
};
