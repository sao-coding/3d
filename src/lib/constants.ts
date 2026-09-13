export const SEASONS = ["summer", "offseason"] as const;
export type Season = (typeof SEASONS)[number];

export const QUOTE_STATUSES = ["pending", "completed"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
