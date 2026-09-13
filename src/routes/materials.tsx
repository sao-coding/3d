import { createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MATERIAL_INFO } from "@/lib/material-info";

export const Route = createFileRoute("/materials")({
  component: MaterialsPage,
});

function MaterialsPage() {
  return (
    <div className="container mx-auto max-w-6xl space-y-4 px-4 py-4">
      <div>
        <h1 className="text-xl font-semibold">線材材質介紹</h1>
        <p className="text-sm text-muted-foreground">
          不確定要選哪種材質嗎？這裡整理各材質常見的優缺點與適合場景，給你參考（依常用程度排序）。
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(MATERIAL_INFO).map(([key, info]) => (
          <Card key={key} className="h-full w-full">
            <CardHeader>
              <CardTitle>{info.label}</CardTitle>
              <p className="text-muted-foreground">{info.summary}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Badge>優點</Badge>
                <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
                  {info.pros.map((pro) => (
                    <li key={pro}>{pro}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-1">
                <Badge variant="secondary">缺點</Badge>
                <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
                  {info.cons.map((con) => (
                    <li key={con}>{con}</li>
                  ))}
                </ul>
              </div>
              <p>
                <span className="font-medium">適合：</span>
                <span className="text-muted-foreground">{info.goodFor}</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
