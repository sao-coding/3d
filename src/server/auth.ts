import { createDb } from "@/server/db";
import * as schema from "@/server/db/schema/auth";
import { env } from "@/server/env";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";

export function createAuth(opts?: { allowSignUp?: boolean }) {
  const db = createDb();

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",

      schema: schema,
    }),
    trustedOrigins: [env.BETTER_AUTH_URL],
    emailAndPassword: {
      enabled: true,
      // single-user system — public sign-up stays closed; only the seed script
      // (scripts/create-admin-user.ts) passes allowSignUp: true to create the one account.
      disableSignUp: !opts?.allowSignUp,
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    plugins: [tanstackStartCookies()],
  });
}

export const auth = createAuth();
