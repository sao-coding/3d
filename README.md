# 3D 列印代工報價網站

一個給自己用的「熟人代印/建模報價」小工具。技術棧：React + TanStack Start（SSR + 檔案式路由）、
oRPC（type-safe RPC）、Drizzle ORM + SQLite/libsql、Better Auth（單一使用者登入）。

單一套件專案，沒有 monorepo/workspace。

## 使用流程

1. 朋友打開網站首頁 `/`（**不用登入**），選線材、服務類型（建模／代印），克重與列印小時數可以
   先留空或填一個大概值，會即時看到目前已知的估價。送出後會拿到一個 `/quote/:id` 的公開連結。
2. 送出詢價後，你的 Discord（若有設定 `DISCORD_WEBHOOK_URL`）會收到通知。
3. 你登入後到 `/history` 打開這筆待確認的報價，用自己的切片軟體切出真正的克重／小時數填入，
   確認完成後對方回去 `/quote/:id` 就能看到最終價格。
4. `/admin/filaments`、`/admin/settings`（都需要登入）管理線材成本與計價參數。

## 開始使用

```bash
pnpm install
cp .env.example .env   # 填 BETTER_AUTH_SECRET（隨機字串）等變數
pnpm run db:push        # 建立 SQLite schema
pnpm run db:seed        # 建立預設全域參數 + 4 個建模分級
pnpm run create-user -- --email you@example.com --password ******** --name "你的名字"
pnpm run dev
```

開發伺服器：http://localhost:3001

單一使用者系統**不開放公開註冊**，唯一帳號只能透過上面的 `create-user` 腳本建立（已經有帳號的話
腳本會拒絕建立第二個）。

## 環境變數（`.env`）

| 變數 | 說明 |
|---|---|
| `DATABASE_URL` | SQLite 檔案路徑，例如 `file:./.data/local.db` |
| `BETTER_AUTH_SECRET` | 隨機字串，可用 `openssl rand -base64 32` 產生 |
| `BETTER_AUTH_URL` | 網站對外網址，本機開發用 `http://localhost:3001` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | 選填。只在**還沒有任何帳號**時，容器啟動時（或跑 `pnpm run create-user`）用來自動建立唯一登入帳號；帳號建立後這幾個變數就沒作用了，可留可刪 |
| `DISCORD_WEBHOOK_URL` | 選填。設定後，有新詢價送出時會發 Discord 通知；留空就不通知 |
| `DISCORD_TAG_MODELING_ID` / `DISCORD_TAG_PRINT_ONLY_ID` | 選填。若 webhook 指向論壇頻道，設定後通知會依服務類型自動貼上對應標籤 |

## 專案結構

```
3d/
├── src/
│   ├── components/        # 共用元件（含 components/ui 下的 shadcn 元件）
│   ├── functions/         # TanStack Start server functions
│   ├── middleware/        # server middleware（auth）
│   ├── lib/                # 前端可用的共用邏輯：pricing.ts（報價公式）、orpc.ts、utils.ts
│   ├── server/
│   │   ├── auth.ts         # Better Auth 設定
│   │   ├── env.ts          # 環境變數驗證
│   │   ├── notify.ts       # Discord webhook 通知
│   │   ├── db/              # Drizzle schema + client
│   │   └── routers/         # oRPC routers（filament / settings / quote）
│   └── routes/              # 檔案式路由（首頁、/quote/$id、/login、/_authed/* 後台）
├── scripts/create-admin-user.ts
└── drizzle.config.ts, vite.config.ts, components.json
```

## 常用指令

- `pnpm run dev`：啟動開發伺服器
- `pnpm run build` / `pnpm run serve`：正式建置 / 預覽
- `pnpm run check-types`：TypeScript 型別檢查
- `pnpm run db:push`：本機開發用，直接把 schema 同步到資料庫（不留遷移紀錄，改 schema 後最快的方式）
- `pnpm run db:generate`：把 schema 變更產生成正式的遷移檔（存到 `src/server/db/migrations`，
  要 commit 進 git）——改完 `src/server/db/schema/*.ts` 之後，準備部署前記得跑這個
- `pnpm run db:migrate`：套用遷移檔（Docker 部署時自動跑這個，不是 `db:push`）
- `pnpm run db:studio`：開 Drizzle Studio 圖形化介面
- `pnpm run db:seed`：建立預設全域參數與建模分級
- `pnpm run create-user -- --email ... --password ... --name ...`：建立唯一登入帳號

## 新增更多 UI 元件

```bash
npx shadcn@latest add <component> --yes --overwrite
```

沿用現有的 `base-lyra` style（`@base-ui/react` primitives），元件會加到 `src/components/ui`。

## 部署（Docker Compose）

```bash
cp .env.example .env   # 填 BETTER_AUTH_SECRET，第一次部署順便填 ADMIN_EMAIL/ADMIN_PASSWORD
pnpm run docker:build
pnpm run docker:up
```

容器啟動時（[docker-entrypoint.sh](docker-entrypoint.sh)）會自動依序做：

1. `drizzle-kit migrate`：套用資料庫遷移（第一次啟動＝建表；之後重啟都是無害的 no-op）
2. `db:seed`：確保預設全域參數 + 4 個建模分級存在（已存在就跳過）
3. `create-user`：如果資料庫裡還沒有任何帳號，且 `.env` 有設定 `ADMIN_EMAIL`/`ADMIN_PASSWORD`，
   就自動建立唯一登入帳號；已經有帳號、或沒設定這兩個變數，就安全地跳過（不會噴錯讓容器起不來）

不用再手動 exec 進容器跑指令建帳號了。之後如果改了 `src/server/db/schema/*.ts`，部署前記得先在
本機跑一次 `pnpm run db:generate` 並把產生的遷移檔 commit 進 git（容器只會 `migrate`，不會
自動幫你生成遷移檔）。

`./.data` 會掛載存放 SQLite 檔案；`docker-compose.yml` 只覆寫 `DATABASE_URL`（一定要蓋成容器內
路徑 `/data/local.db`，跟 `.env` 裡本機開發用的路徑不一樣）。**`BETTER_AUTH_URL` 完全吃
`.env` 的值，不會被 compose 蓋掉**——這個很重要，見下面。記得定期備份 `.data/local.db`——
線材成本資料是唯一真相來源，遺失就要重新登打。

### 有掛反向代理的話

`BETTER_AUTH_URL` 一定要填**使用者瀏覽器實際會打的網址**（協定 + 網域），不是容器內部位址，
也不是 `http://localhost:3001`（除非真的只在本機用、沒有代理）。這個值會影響兩件事：

1. **Discord 通知裡的報價連結**（`/quote/:id`）是直接拿這個值組出來的——填錯／填成 localhost，
   連結在別台裝置上點了就是打不開。
2. **Better Auth 的 cookie／origin 驗證**：`baseURL`/`trustedOrigins` 都是照這個值設的，
   跟實際網址對不上的話，登入的 cookie 行為可能會怪怪的（尤其是 https 的話 cookie 會被標記
   `Secure`，protocol 一定要填對）。

舉例：反向代理設定 `https://print.yourdomain.com` → 內部轉發到容器的 `3001` port，
`.env` 就要填：

```
BETTER_AUTH_URL=https://print.yourdomain.com
```

跟 nginx/Caddy 之間走 http 沒關係，Better Auth 是照這個「對外」網址判斷要不要標記安全 cookie，
不是照它跟代理之間實際的連線協定判斷。

## 已知的設計取捨

- **不做自動切片**：克重／列印小時數無法在不切片的情況下自動算出，所以這兩個欄位在詢價階段是
  選填的（friend 可以先猜，如果模型平台有標示的話），正式報價仍要由你切片後在 `/history` 補上
  真正數字才算數。
- **建議收費**＝總價四捨五入到最接近的 10 元，方便收現金；如果想改邏輯，改 `src/lib/pricing.ts`
  的 `roundedPrice` 計算即可。
- **高溫材質（ABS/PC/Nylon）電費**：規格抓 0.4~0.5 度/小時區間，程式碼取中間值 0.45（同樣在
  `src/lib/pricing.ts` 常數 `HIGH_TEMP_KWH_PER_HOUR`）。
- **公開詢價表單只放「客人真的可能知道、且不會被亂填影響價格」的欄位**：對象名稱、線材、
  服務類型、模型網址、建模分級（僅供參考）、克重／小時數（選填猜測）。像失敗率%、季節、
  清理分鐘數、修改版本數、自訂建模金額這些——客人要嘛不可能知道（清理分鐘數、修改版本數
  在詢價當下根本還沒發生），要嘛是你的定價政策（失敗率%），要嘛是純數字輸入完全沒有下限
  （自訂建模金額），都拿掉了公開表單的控制權，改成只有你在 `/history` 完成報價時才看得到、
  能調整——不然客人當然會直接選對自己最划算的數字。
