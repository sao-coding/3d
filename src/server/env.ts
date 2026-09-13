import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    // 選填：有新詢價送出時會用來通知你，未設定就靜默跳過
    DISCORD_WEBHOOK_URL: z.url().optional(),
    // 選填：Discord 論壇頻道的標籤 ID，通知建立貼文時會依服務類型自動貼上對應標籤
    DISCORD_TAG_MODELING_ID: z.string().optional(),
    DISCORD_TAG_PRINT_ONLY_ID: z.string().optional(),
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
