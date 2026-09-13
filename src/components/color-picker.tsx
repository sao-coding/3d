import { useState } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";

import { ColorDot } from "@/components/color-dot";
import { Button } from "@/components/ui/button";

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setOpen((v) => !v)}
          aria-label="選擇顏色"
        >
          <ColorDot color={value} />
        </Button>
        <HexColorInput
          color={value}
          onChange={onChange}
          prefixed
          className="h-8 w-full min-w-0 border border-input bg-transparent px-2.5 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
        />
      </div>
      {open && (
        <div className="w-fit">
          <HexColorPicker color={value} onChange={onChange} />
        </div>
      )}
    </div>
  );
}
