import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ColorDot } from "@/components/color-dot";
import { formatCurrency } from "@/lib/utils";
import { orpc } from "@/lib/orpc";

export const Route = createFileRoute("/quote/$id")({
  component: PublicQuotePage,
});

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function PublicQuotePage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery(orpc.quote.getPublic.queryOptions({ input: { id } }));

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">載入中...</div>;
  }
  if (!data) {
    return <div className="p-4 text-center text-muted-foreground">找不到這筆報價</div>;
  }

  const isCompleted = data.status === "completed";

  const copyText = () => {
    const lines = [
      `對象：${data.recipientName || "—"}`,
      `線材：${data.filamentName}`,
      data.totalPrice != null
        ? `${isCompleted ? "總價" : "預估總價"}：${formatCurrency(data.totalPrice)}`
        : `目前基本費：${formatCurrency((data.modelingCost ?? 0) + (data.revisionCost ?? 0) + (data.laborCost ?? 0))}（待確認最終價格）`,
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("已複製報價文字");
  };

  return (
    <div className="container mx-auto max-w-lg space-y-4 px-4 py-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>報價狀態</CardTitle>
          <Badge variant={isCompleted ? "default" : "secondary"}>
            {isCompleted ? "已確認" : "待確認"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          <Row label="對象" value={data.recipientName || "—"} />
          <Row
            label="線材"
            value={
              <span className="flex items-center gap-1.5">
                <ColorDot color={data.filamentColor} />
                {data.filamentName}
              </span>
            }
          />
          <Row label="服務類型" value={data.needsModeling ? "建模" : "代印"} />
          {data.modelUrl && (
            <Row
              label="模型網址"
              value={
                <a href={data.modelUrl} target="_blank" rel="noreferrer" className="underline">
                  查看連結
                </a>
              }
            />
          )}
          {data.notes && <Row label="備註" value={<span className="text-right">{data.notes}</span>} />}
          <hr />
          <p className="text-muted-foreground">
            材料費 = 克重 × 線材每克成本；電費／折舊費依列印小時數計算，逐項列在下面。
          </p>
          <Row
            label={isCompleted ? "克重" : "克重（你填的預估值）"}
            value={data.weightGrams != null ? `${data.weightGrams} g` : "待確認"}
          />
          <Row label="材料費" value={data.materialCost != null ? formatCurrency(data.materialCost) : "待確認"} />
          <Row
            label={isCompleted ? "列印小時數" : "列印小時數（你填的預估值）"}
            value={data.printHours != null ? `${data.printHours} 小時` : "待確認"}
          />
          <Row
            label="電費＋折舊費"
            value={
              data.electricityDepreciationCost != null
                ? formatCurrency(data.electricityDepreciationCost)
                : "待確認"
            }
          />
          <Row label="代印人工費" value={formatCurrency(data.laborCost)} />
          <Row
            label="失敗率攤提"
            value={data.failureBufferCost != null ? formatCurrency(data.failureBufferCost) : "待確認"}
          />
          {data.needsModeling && <Row label="建模費" value={formatCurrency(data.modelingCost)} />}
          {data.revisionCost > 0 && <Row label="修改費" value={formatCurrency(data.revisionCost)} />}
          <hr />
          {data.totalPrice != null && (
            <div className="flex justify-between text-lg font-bold">
              <span>{isCompleted ? "總價" : "預估總價"}</span>
              <span>{formatCurrency(data.totalPrice)}</span>
            </div>
          )}
          {!isCompleted && (
            <p className="text-muted-foreground">
              {data.totalPrice != null
                ? "以上是根據目前資訊估的價格，正式報價仍要等賣家確認克重與工時，之後回來這個連結就會看到更新。"
                : "材料費/電費/折舊/失敗率攤提要等賣家確認克重與工時後才會有最終報價，之後回來這個連結就會看到更新。"}
            </p>
          )}
        </CardContent>
      </Card>
      <Button className="w-full" variant="outline" onClick={copyText}>
        複製報價文字
      </Button>
    </div>
  );
}
