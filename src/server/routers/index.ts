import type { RouterClient } from "@orpc/server";

import { filamentRouter } from "@/server/routers/filament";
import { quoteRouter } from "@/server/routers/quote";
import { settingsRouter } from "@/server/routers/settings";

export const appRouter = {
  filament: filamentRouter,
  settings: settingsRouter,
  quote: quoteRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
