import type { Season } from "@/lib/constants";

// 規格書給高溫材質 0.4~0.5 度/小時的區間，取中間值；低溫材質規格書直接給 0.24。
const LOW_TEMP_KWH_PER_HOUR = 0.24;
const HIGH_TEMP_KWH_PER_HOUR = 0.45;

export interface PricingSettingsInput {
  failureRatePercent: number;
  depreciationPerHour: number;
  electricitySummer: number;
  electricityOffseason: number;
  slicingFixedFee: number;
  cleanupRatePerMinute: number;
  revisionFee: number;
  freeRevisionCount: number;
}

export interface CalculateQuoteInput {
  costPerGram: number;
  /** 高溫材質每小時耗電較高，由材質設定決定 */
  isHighTemp: boolean;
  weightGrams: number | null;
  printHours: number | null;
  season: Season;
  cleanupMinutes: number | null;
  /** 覆寫本次採用的失敗率%；省略則採用全域設定的預設值 */
  failureRatePercent?: number | null;
  needsModeling: boolean;
  /** 建模費金額（自訂金額或分級預設金額，由呼叫端先解析好） */
  modelingPrice?: number | null;
  revisionCount: number;
}

export interface QuoteBreakdown {
  materialCost: number | null;
  electricityCost: number | null;
  depreciationCost: number | null;
  laborCost: number;
  failureBufferCost: number | null;
  modelingCost: number;
  revisionCost: number;
  resolvedFailureRatePercent: number;
  /** 克重與小時數都已知，才有辦法算出最終總價 */
  isComplete: boolean;
  /** 詢價當下就能確定的部分（建模費+修改費+開機固定費），不受克重/小時數影響 */
  knownSubtotal: number;
  totalPrice: number | null;
  roundedPrice: number | null;
}

export function getDefaultSeason(date: Date = new Date()): Season {
  const month = date.getMonth() + 1;
  return month >= 6 && month <= 9 ? "summer" : "offseason";
}

export function calculateQuote(
  input: CalculateQuoteInput,
  settings: PricingSettingsInput,
): QuoteBreakdown {
  const kwhPerHour = input.isHighTemp ? HIGH_TEMP_KWH_PER_HOUR : LOW_TEMP_KWH_PER_HOUR;
  const electricityRate =
    input.season === "summer" ? settings.electricitySummer : settings.electricityOffseason;

  const materialCost = input.weightGrams != null ? input.weightGrams * input.costPerGram : null;
  const electricityCost =
    input.printHours != null ? input.printHours * kwhPerHour * electricityRate : null;
  const depreciationCost =
    input.printHours != null ? input.printHours * settings.depreciationPerHour : null;

  const cleanupMinutes = input.cleanupMinutes ?? 0;
  const laborCost = settings.slicingFixedFee + cleanupMinutes * settings.cleanupRatePerMinute;

  const resolvedFailureRatePercent = input.failureRatePercent ?? settings.failureRatePercent;
  const failureBufferCost =
    materialCost != null && electricityCost != null && depreciationCost != null
      ? (materialCost + electricityCost + depreciationCost) * (resolvedFailureRatePercent / 100)
      : null;

  const modelingCost = input.needsModeling ? (input.modelingPrice ?? 0) : 0;

  const excessRevisions = Math.max(0, input.revisionCount - settings.freeRevisionCount);
  const revisionCost = excessRevisions * settings.revisionFee;

  const knownSubtotal = laborCost + modelingCost + revisionCost;
  const isComplete =
    materialCost != null &&
    electricityCost != null &&
    depreciationCost != null &&
    failureBufferCost != null;

  const totalPriceRaw = isComplete
    ? materialCost + electricityCost + depreciationCost + laborCost + failureBufferCost + modelingCost + revisionCost
    : null;
  const totalPrice = totalPriceRaw != null ? Math.round(totalPriceRaw) : null;
  const roundedPrice = totalPriceRaw != null ? Math.round(totalPriceRaw / 10) * 10 : null;

  return {
    materialCost: materialCost != null ? Math.round(materialCost) : null,
    electricityCost: electricityCost != null ? Math.round(electricityCost) : null,
    depreciationCost: depreciationCost != null ? Math.round(depreciationCost) : null,
    laborCost: Math.round(laborCost),
    failureBufferCost: failureBufferCost != null ? Math.round(failureBufferCost) : null,
    modelingCost: Math.round(modelingCost),
    revisionCost: Math.round(revisionCost),
    resolvedFailureRatePercent,
    isComplete,
    knownSubtotal: Math.round(knownSubtotal),
    totalPrice,
    roundedPrice,
  };
}
