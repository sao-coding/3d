import { ORPCError } from "@orpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { filamentLabel } from "@/lib/filament-label";
import { calculateQuote, getDefaultSeason, type QuoteBreakdown } from "@/lib/pricing";
import { db } from "@/server/db";
import { SEASONS, brands, filaments, materials, modelingTiers, quotes } from "@/server/db/schema/app";
import { notifyNewQuoteRequest } from "@/server/notify";
import { protectedProcedure, publicProcedure } from "@/server/procedures";
import { getOrCreateSettings } from "@/server/routers/settings";

const quoteInput = z.object({
  filamentId: z.string(),
  weightGrams: z.number().positive().nullable().optional(),
  printHours: z.number().positive().nullable().optional(),
  // 詢價當下不給客人選季節（他們沒有立場，也沒必要知道）；沒帶就用系統目前日期自動判斷，
  // 只有你在 /history 完成報價時才可能需要手動覆寫（例如排到下個月才印）。
  season: z.enum(SEASONS).optional(),
  cleanupMinutes: z.number().int().min(0).nullable().optional(),
  failureRatePercent: z.number().int().min(0).max(100).nullable().optional(),
  needsModeling: z.boolean(),
  modelingTierId: z.string().nullable().optional(),
  modelingCustomPrice: z.number().int().min(0).nullable().optional(),
  modelUrl: z.url().nullable().optional(),
  notes: z.string().optional(),
  revisionCount: z.number().int().min(0).default(0),
  recipientName: z.string().optional(),
});

/** 線材連同廠牌/材質一起撈，才組得出顯示名稱、也才知道是不是高溫材質 */
const filamentWithNames = {
  id: filaments.id,
  color: filaments.color,
  colorName: filaments.colorName,
  costPerGram: filaments.costPerGram,
  brandName: brands.name,
  materialName: materials.name,
  isHighTemp: materials.isHighTemp,
} as const;

async function resolveBreakdown(input: z.infer<typeof quoteInput>) {
  const [filament] = await db
    .select(filamentWithNames)
    .from(filaments)
    .innerJoin(materials, eq(filaments.materialId, materials.id))
    .leftJoin(brands, eq(filaments.brandId, brands.id))
    .where(eq(filaments.id, input.filamentId));
  if (!filament) throw new ORPCError("NOT_FOUND", { message: "找不到這個線材" });

  const settings = await getOrCreateSettings();
  const season = input.season ?? getDefaultSeason();

  let modelingPrice: number | null = null;
  if (input.needsModeling) {
    if (input.modelingCustomPrice != null) {
      modelingPrice = input.modelingCustomPrice;
    } else if (input.modelingTierId) {
      const [tier] = await db
        .select()
        .from(modelingTiers)
        .where(eq(modelingTiers.id, input.modelingTierId));
      modelingPrice = tier?.defaultPrice ?? 0;
    }
  }

  const breakdown = calculateQuote(
    {
      costPerGram: filament.costPerGram,
      isHighTemp: filament.isHighTemp,
      weightGrams: input.weightGrams ?? null,
      printHours: input.printHours ?? null,
      season,
      cleanupMinutes: input.cleanupMinutes ?? null,
      failureRatePercent: input.failureRatePercent ?? null,
      needsModeling: input.needsModeling,
      modelingPrice,
      revisionCount: input.revisionCount,
    },
    settings,
  );

  return { filament, breakdown, season };
}

function electricityDepreciationCost(breakdown: QuoteBreakdown) {
  return breakdown.electricityCost != null && breakdown.depreciationCost != null
    ? breakdown.electricityCost + breakdown.depreciationCost
    : null;
}

// 「建議收費」是你自己收多少的參考，不是給客人看的——公開的 calculate/submitRequest
// 回傳前先拿掉，客人（含打開瀏覽器 Network 分頁的人）只看得到「總價」。
function publicBreakdown(breakdown: QuoteBreakdown) {
  const { roundedPrice: _roundedPrice, ...rest } = breakdown;
  return rest;
}

const completeInput = quoteInput.partial().extend({
  id: z.string(),
  weightGrams: z.number().positive(),
  printHours: z.number().positive(),
});

export const quoteRouter = {
  // 公開：詢價表單即時預覽，純計算不寫入
  calculate: publicProcedure.input(quoteInput).handler(async ({ input }) => {
    const { breakdown } = await resolveBreakdown(input);
    return publicBreakdown(breakdown);
  }),

  // 公開：送出詢價，建立 pending 報價 + 通知
  submitRequest: publicProcedure.input(quoteInput).handler(async ({ input }) => {
    const { filament, breakdown, season } = await resolveBreakdown(input);

    const [created] = await db
      .insert(quotes)
      .values({
        status: "pending",
        recipientName: input.recipientName,
        filamentId: input.filamentId,
        weightGrams: input.weightGrams ?? null,
        printHours: input.printHours ?? null,
        season,
        cleanupMinutes: input.cleanupMinutes ?? 0,
        failureRatePercent: breakdown.resolvedFailureRatePercent,
        needsModeling: input.needsModeling,
        modelingTierId: input.needsModeling ? input.modelingTierId : null,
        modelingCustomPrice: input.needsModeling ? input.modelingCustomPrice : null,
        modelUrl: input.needsModeling ? null : input.modelUrl,
        notes: input.notes || null,
        revisionCount: input.revisionCount,
        materialCost: breakdown.materialCost,
        electricityDepreciationCost: electricityDepreciationCost(breakdown),
        laborCost: breakdown.laborCost,
        failureBufferCost: breakdown.failureBufferCost,
        modelingCost: breakdown.modelingCost,
        revisionCost: breakdown.revisionCost,
        totalPrice: breakdown.totalPrice,
        roundedPrice: breakdown.roundedPrice,
      })
      .returning();
    if (!created) throw new ORPCError("INTERNAL_SERVER_ERROR");

    await notifyNewQuoteRequest({
      quoteId: created.id,
      recipientName: created.recipientName,
      filamentName: filamentLabel(filament),
      serviceType: input.needsModeling ? "modeling" : "print_only",
      modelUrl: created.modelUrl,
      notes: created.notes,
      knownSubtotal: breakdown.knownSubtotal,
      isComplete: breakdown.isComplete,
      roundedPrice: breakdown.roundedPrice,
    });

    return { id: created.id, breakdown: publicBreakdown(breakdown) };
  }),

  // 需登入：你切完片、補上真正克重/小時數，完成這筆報價
  complete: protectedProcedure.input(completeInput).handler(async ({ input }) => {
    const [existing] = await db.select().from(quotes).where(eq(quotes.id, input.id));
    if (!existing) throw new ORPCError("NOT_FOUND");

    const merged: z.infer<typeof quoteInput> = {
      filamentId: input.filamentId ?? existing.filamentId,
      weightGrams: input.weightGrams,
      printHours: input.printHours,
      season: input.season ?? existing.season,
      cleanupMinutes: input.cleanupMinutes ?? existing.cleanupMinutes,
      failureRatePercent: input.failureRatePercent ?? existing.failureRatePercent,
      needsModeling: input.needsModeling ?? existing.needsModeling,
      modelingTierId: input.modelingTierId ?? existing.modelingTierId,
      modelingCustomPrice: input.modelingCustomPrice ?? existing.modelingCustomPrice,
      modelUrl: input.modelUrl ?? existing.modelUrl,
      notes: input.notes ?? existing.notes ?? undefined,
      revisionCount: input.revisionCount ?? existing.revisionCount,
      recipientName: input.recipientName ?? existing.recipientName ?? undefined,
    };

    const { breakdown } = await resolveBreakdown(merged);

    const [updated] = await db
      .update(quotes)
      .set({
        status: "completed",
        recipientName: merged.recipientName,
        filamentId: merged.filamentId,
        weightGrams: merged.weightGrams,
        printHours: merged.printHours,
        season: merged.season,
        cleanupMinutes: merged.cleanupMinutes ?? 0,
        failureRatePercent: breakdown.resolvedFailureRatePercent,
        needsModeling: merged.needsModeling,
        modelingTierId: merged.needsModeling ? merged.modelingTierId : null,
        modelingCustomPrice: merged.needsModeling ? merged.modelingCustomPrice : null,
        modelUrl: merged.needsModeling ? null : merged.modelUrl,
        notes: merged.notes || null,
        revisionCount: merged.revisionCount,
        materialCost: breakdown.materialCost,
        electricityDepreciationCost: electricityDepreciationCost(breakdown),
        laborCost: breakdown.laborCost,
        failureBufferCost: breakdown.failureBufferCost,
        modelingCost: breakdown.modelingCost,
        revisionCost: breakdown.revisionCost,
        totalPrice: breakdown.totalPrice,
        roundedPrice: breakdown.roundedPrice,
      })
      .where(eq(quotes.id, input.id))
      .returning();

    return updated;
  }),

  // 公開：朋友憑連結查詢這筆報價目前狀態/最終價格
  getPublic: publicProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
    const [row] = await db
      .select({
        id: quotes.id,
        status: quotes.status,
        recipientName: quotes.recipientName,
        brandName: brands.name,
        materialName: materials.name,
        colorName: filaments.colorName,
        filamentColor: filaments.color,
        needsModeling: quotes.needsModeling,
        modelUrl: quotes.modelUrl,
        notes: quotes.notes,
        weightGrams: quotes.weightGrams,
        printHours: quotes.printHours,
        materialCost: quotes.materialCost,
        electricityDepreciationCost: quotes.electricityDepreciationCost,
        laborCost: quotes.laborCost,
        failureBufferCost: quotes.failureBufferCost,
        modelingCost: quotes.modelingCost,
        revisionCost: quotes.revisionCost,
        totalPrice: quotes.totalPrice,
        createdAt: quotes.createdAt,
      })
      .from(quotes)
      .innerJoin(filaments, eq(quotes.filamentId, filaments.id))
      .innerJoin(materials, eq(filaments.materialId, materials.id))
      .leftJoin(brands, eq(filaments.brandId, brands.id))
      .where(eq(quotes.id, input.id));
    if (!row) throw new ORPCError("NOT_FOUND");
    return { ...row, filamentName: filamentLabel(row) };
  }),

  // 需登入：/history 完整列表
  list: protectedProcedure.handler(async () => {
    const rows = await db
      .select({
        id: quotes.id,
        status: quotes.status,
        recipientName: quotes.recipientName,
        brandName: brands.name,
        materialName: materials.name,
        colorName: filaments.colorName,
        filamentColor: filaments.color,
        totalPrice: quotes.totalPrice,
        roundedPrice: quotes.roundedPrice,
        createdAt: quotes.createdAt,
      })
      .from(quotes)
      .innerJoin(filaments, eq(quotes.filamentId, filaments.id))
      .innerJoin(materials, eq(filaments.materialId, materials.id))
      .leftJoin(brands, eq(filaments.brandId, brands.id))
      .orderBy(desc(quotes.createdAt));
    return rows.map((row) => ({ ...row, filamentName: filamentLabel(row) }));
  }),

  // 需登入：/history 明細與「完成報價」表單的初始值
  getById: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
    const [row] = await db
      .select({
        quote: quotes,
        brandName: brands.name,
        materialName: materials.name,
        colorName: filaments.colorName,
        filamentColor: filaments.color,
      })
      .from(quotes)
      .innerJoin(filaments, eq(quotes.filamentId, filaments.id))
      .innerJoin(materials, eq(filaments.materialId, materials.id))
      .leftJoin(brands, eq(filaments.brandId, brands.id))
      .where(eq(quotes.id, input.id));
    if (!row) throw new ORPCError("NOT_FOUND");
    return {
      ...row.quote,
      filamentName: filamentLabel(row),
      filamentColor: row.filamentColor,
    };
  }),
};
