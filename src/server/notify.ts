import { env } from "@/server/env";

export interface NewQuoteRequestPayload {
  quoteId: string;
  recipientName?: string | null;
  filamentName: string;
  serviceType: "modeling" | "print_only";
  modelUrl?: string | null;
  notes?: string | null;
  knownSubtotal: number;
  isComplete: boolean;
  roundedPrice: number | null;
}

function formatDateYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function resolveTagId(serviceType: NewQuoteRequestPayload["serviceType"]): string | undefined {
  return serviceType === "modeling"
    ? env.DISCORD_TAG_MODELING_ID
    : env.DISCORD_TAG_PRINT_ONLY_ID;
}

async function postToDiscord(
  webhookUrl: string,
  content: string,
  threadName: string,
  appliedTagId: string | undefined,
) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (res.ok) return;

  // Discord「論壇」頻道的 webhook 一定要帶 thread_name（或 thread_id）才能發文，一般文字頻道
  // 則不能帶這個欄位；沒辦法事先知道對方頻道是哪一種，所以先照一般訊息送，400 的話再補
  // thread_name（+ 有設定標籤 ID 的話一併帶 applied_tags）開一則新的論壇貼文重試一次。
  if (res.status === 400) {
    const retryRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        content,
        thread_name: threadName.slice(0, 100),
        ...(appliedTagId ? { applied_tags: [appliedTagId] } : {}),
      }),
    });
    if (retryRes.ok) return;
    throw new Error(`discord webhook failed (${retryRes.status}): ${await retryRes.text()}`);
  }

  throw new Error(`discord webhook failed (${res.status}): ${await res.text()}`);
}

export async function notifyNewQuoteRequest(payload: NewQuoteRequestPayload): Promise<void> {
  const webhookUrl = env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const quoteLink = `${env.BETTER_AUTH_URL}/quote/${payload.quoteId}`;
  const serviceLabel = payload.serviceType === "modeling" ? "建模" : "代印";
  const priceLine = payload.isComplete
    ? `預估總價：$${payload.roundedPrice}`
    : `目前已知基本費：$${payload.knownSubtotal}（材料/電費/工時尚待確認）`;

  const lines = [
    "📥 有新的詢價！",
    `對象：${payload.recipientName || "（未填寫）"}`,
    `線材：${payload.filamentName}`,
    `服務類型：${serviceLabel}`,
    payload.modelUrl ? `模型網址：${payload.modelUrl}` : null,
    payload.notes ? `備註：${payload.notes}` : null,
    priceLine,
    `查看/完成報價：${quoteLink}`,
  ].filter(Boolean);

  const threadName = `${formatDateYMD(new Date())} - ${payload.recipientName || "（未填寫）"}`;
  const appliedTagId = resolveTagId(payload.serviceType);

  try {
    await postToDiscord(webhookUrl, lines.join("\n"), threadName, appliedTagId);
  } catch (err) {
    console.error("[discord-notify] failed to send new quote request notification", err);
  }
}
