export const MATERIAL_TYPES = ["PLA", "PETG", "ABS", "PC", "Nylon", "TPU", "其他"] as const;
export type MaterialType = (typeof MATERIAL_TYPES)[number];

export const SEASONS = ["summer", "offseason"] as const;
export type Season = (typeof SEASONS)[number];

export const QUOTE_STATUSES = ["pending", "completed"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
