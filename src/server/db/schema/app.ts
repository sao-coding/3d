import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { QUOTE_STATUSES, SEASONS } from "@/lib/constants";

export { QUOTE_STATUSES, SEASONS };
export type { QuoteStatus, Season } from "@/lib/constants";

/**
 * 材質（PLA、PETG…）。同時是 /materials 的材質介紹內容，也是線材的材質分類，
 * 兩邊講的是同一件事，所以共用同一張表。
 */
export const materials = sqliteTable("materials", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  pros: text("pros", { mode: "json" }).$type<string[]>().notNull(),
  cons: text("cons", { mode: "json" }).$type<string[]>().notNull(),
  goodFor: text("good_for"),
  /**
   * 高溫材質（ABS/PC/Nylon 這類）耗電量較高，計價時每小時用的度數不同。
   * 這是計價輸入，不是介紹文案。
   */
  isHighTemp: integer("is_high_temp", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

/** 線材廠牌（eSUN、Bambu…） */
export const brands = sqliteTable("brands", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

export const filaments = sqliteTable(
  "filaments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    brandId: text("brand_id").references(() => brands.id, { onDelete: "restrict" }),
    materialId: text("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "restrict" }),
    /** 色名（黑、消光灰…）。沒有獨立的線材名稱，靠「廠牌 材質 色名」辨識。 */
    colorName: text("color_name"),
    color: text("color"),
    purchasePrice: integer("purchase_price").notNull(),
    weightGrams: integer("weight_grams").notNull().default(1000),
    costPerGram: real("cost_per_gram").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    purchasedAt: integer("purchased_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("filaments_brandId_idx").on(table.brandId),
    index("filaments_materialId_idx").on(table.materialId),
  ],
);

export const pricingSettings = sqliteTable("pricing_settings", {
  id: text("id").primaryKey().default("default"),
  failureRatePercent: integer("failure_rate_percent").notNull().default(12),
  depreciationPerHour: integer("depreciation_per_hour").notNull().default(5),
  electricitySummer: real("electricity_summer").notNull().default(6.0),
  electricityOffseason: real("electricity_offseason").notNull().default(4.8),
  slicingFixedFee: integer("slicing_fixed_fee").notNull().default(30),
  cleanupRatePerMinute: integer("cleanup_rate_per_minute").notNull().default(3),
  revisionFee: integer("revision_fee").notNull().default(250),
  freeRevisionCount: integer("free_revision_count").notNull().default(2),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const modelingTiers = sqliteTable("modeling_tiers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tierName: text("tier_name").notNull(),
  defaultPrice: integer("default_price").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const quotes = sqliteTable(
  "quotes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    status: text("status", { enum: QUOTE_STATUSES }).notNull().default("pending"),
    recipientName: text("recipient_name"),
    filamentId: text("filament_id")
      .notNull()
      .references(() => filaments.id, { onDelete: "restrict" }),
    weightGrams: real("weight_grams"),
    printHours: real("print_hours"),
    season: text("season", { enum: SEASONS }).notNull(),
    cleanupMinutes: integer("cleanup_minutes").notNull().default(0),
    failureRatePercent: integer("failure_rate_percent").notNull(),
    needsModeling: integer("needs_modeling", { mode: "boolean" }).notNull().default(false),
    modelingTierId: text("modeling_tier_id").references(() => modelingTiers.id, {
      onDelete: "set null",
    }),
    modelingCustomPrice: integer("modeling_custom_price"),
    modelUrl: text("model_url"),
    notes: text("notes"),
    revisionCount: integer("revision_count").notNull().default(0),
    materialCost: integer("material_cost"),
    electricityDepreciationCost: integer("electricity_depreciation_cost"),
    laborCost: integer("labor_cost").notNull(),
    failureBufferCost: integer("failure_buffer_cost"),
    modelingCost: integer("modeling_cost").notNull(),
    revisionCost: integer("revision_cost").notNull(),
    totalPrice: integer("total_price"),
    roundedPrice: integer("rounded_price"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("quotes_filamentId_idx").on(table.filamentId),
    index("quotes_status_idx").on(table.status),
  ],
);

export const materialRelations = relations(materials, ({ many }) => ({
  filaments: many(filaments),
}));

export const brandRelations = relations(brands, ({ many }) => ({
  filaments: many(filaments),
}));

export const filamentRelations = relations(filaments, ({ one, many }) => ({
  material: one(materials, {
    fields: [filaments.materialId],
    references: [materials.id],
  }),
  brand: one(brands, {
    fields: [filaments.brandId],
    references: [brands.id],
  }),
  quotes: many(quotes),
}));

export const modelingTierRelations = relations(modelingTiers, ({ many }) => ({
  quotes: many(quotes),
}));

export const quoteRelations = relations(quotes, ({ one }) => ({
  filament: one(filaments, {
    fields: [quotes.filamentId],
    references: [filaments.id],
  }),
  modelingTier: one(modelingTiers, {
    fields: [quotes.modelingTierId],
    references: [modelingTiers.id],
  }),
}));
