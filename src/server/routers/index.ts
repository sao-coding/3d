import type { RouterClient } from "@orpc/server";

import { brandRouter } from "@/server/routers/brand";
import { filamentRouter } from "@/server/routers/filament";
import { materialRouter } from "@/server/routers/material";
import { quoteRouter } from "@/server/routers/quote";
import { settingsRouter } from "@/server/routers/settings";

export const appRouter = {
  filament: filamentRouter,
  material: materialRouter,
  brand: brandRouter,
  settings: settingsRouter,
  quote: quoteRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
