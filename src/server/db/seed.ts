import "dotenv/config";

import { eq } from "drizzle-orm";

import { db } from "./index";
import { modelingTiers, pricingSettings } from "./schema/app";

const DEFAULT_TIERS = [
  { tierName: "有範本可改", defaultPrice: 100, sortOrder: 0 },
  { tierName: "簡單", defaultPrice: 300, sortOrder: 1 },
  { tierName: "中等", defaultPrice: 600, sortOrder: 2 },
  { tierName: "複雜", defaultPrice: 1200, sortOrder: 3 },
] as const;

async function seed() {
  const [existingSettings] = await db
    .select()
    .from(pricingSettings)
    .where(eq(pricingSettings.id, "default"));
  if (!existingSettings) {
    await db.insert(pricingSettings).values({ id: "default" });
    console.log("[seed] created default pricing_settings row");
  } else {
    console.log("[seed] pricing_settings already exists, skipping");
  }

  const existingTiers = await db.select().from(modelingTiers);
  if (existingTiers.length === 0) {
    await db.insert(modelingTiers).values([...DEFAULT_TIERS]);
    console.log("[seed] created 4 default modeling_tiers rows");
  } else {
    console.log(`[seed] modeling_tiers already has ${existingTiers.length} row(s), skipping`);
  }
}

seed()
  .then(() => {
    console.log("[seed] done");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[seed] failed", err);
    process.exit(1);
  });
