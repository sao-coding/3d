import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { MATERIAL_TYPES, QUOTE_STATUSES, SEASONS } from "@/lib/constants";

export { MATERIAL_TYPES, QUOTE_STATUSES, SEASONS };
export type { MaterialType, QuoteStatus, Season } from "@/lib/constants";

export const filaments = sqliteTable("filaments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  brand: text("brand"),
  materialType: text("material_type", { enum: MATERIAL_TYPES }).notNull(),
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
});

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
  (table) => [index("quotes_filamentId_idx").on(table.filamentId), index("quotes_status_idx").on(table.status)],
);

export const filamentRelations = relations(filaments, ({ many }) => ({
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
