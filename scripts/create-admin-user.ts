import "dotenv/config";

import { db } from "../src/server/db";
import { user } from "../src/server/db/schema/auth";
import { createAuth } from "../src/server/auth";

function parseArgs() {
  const args = process.argv.slice(2);
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg?.startsWith("--")) {
      const key = arg.slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith("--")) {
        result[key] = value;
        i++;
      }
    }
  }
  return result;
}

async function main() {
  const args = parseArgs();
  // CLI 參數優先（本機手動建立用），沒帶的話 fall back 到環境變數
  // （Docker 啟動時自動建立用，見 docker-entrypoint.sh）。
  const email = args.email || process.env.ADMIN_EMAIL;
  const password = args.password || process.env.ADMIN_PASSWORD;
  const name = args.name || process.env.ADMIN_NAME;

  if (!email || !password) {
    console.log(
      "未提供帳號密碼（--email/--password 參數或 ADMIN_EMAIL/ADMIN_PASSWORD 環境變數皆未設定），略過建立。\n" +
        "手動建立：pnpm run create-user -- --email you@example.com --password ******** --name 你的名字",
    );
    process.exit(0);
  }

  const existingUsers = await db.select({ id: user.id }).from(user).limit(1);
  if (existingUsers.length > 0) {
    console.log("已經有帳號存在了（單一使用者系統只允許一個帳號），略過建立。");
    process.exit(0);
  }

  const auth = createAuth({ allowSignUp: true });
  await auth.api.signUpEmail({
    body: { email, password, name: name || "Admin" },
  });

  console.log(`帳號建立成功：${email}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("建立帳號失敗", err);
  process.exit(1);
});
