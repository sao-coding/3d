import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColorDot } from "@/components/color-dot";

export interface FilamentOption {
  id: string;
  /** 由「廠牌 材質 色名」組出來的顯示名稱 */
  name: string;
  color?: string | null;
  materialName?: string | null;
  costPerGram: number;
}

function formatPerGram(costPerGram: number): string {
  return `$${costPerGram.toFixed(2)}/g`;
}

export function FilamentSelect({
  filaments,
  value,
  onChange,
  placeholder = "選擇線材",
}: {
  filaments: FilamentOption[];
  value: string | undefined;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as string)}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder}>
          {(id: string | null) => {
            const selected = filaments.find((f) => f.id === id);
            return selected ? (
              <span className="flex items-center gap-1.5">
                <ColorDot color={selected.color} />
                {selected.name}
                <span className="text-muted-foreground">
                  （{formatPerGram(selected.costPerGram)}）
                </span>
              </span>
            ) : (
              placeholder
            );
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {filaments.map((filament) => (
          <SelectItem key={filament.id} value={filament.id}>
            <ColorDot color={filament.color} />
            <span>{filament.name}</span>
            <span className="text-muted-foreground">
              （{formatPerGram(filament.costPerGram)}）
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
