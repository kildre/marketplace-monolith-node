// src/domain/enums/StatusEnum.ts

export type StatusCode =
  | "PENDING"
  | "APPROVED"
  | "DENIED"
  | "ROM_GENERATED"
  | "MIPR_NEEDED"
  | "PROCURING_PRODUCTS"
  | "ALLOCATION_PENDING"
  | "COMPLETE";

export interface Status {
  id: number; // Java 'short' maps to number in TS
  code: StatusCode;
}

// Canonical definitions (acts like an enum-with-data)
export const StatusEnum = {
  PENDING: { id: 1, code: "PENDING" as const },
  APPROVED: { id: 2, code: "APPROVED" as const },
  DENIED: { id: 3, code: "DENIED" as const },
  ROM_GENERATED: { id: 4, code: "ROM_GENERATED" as const },
  MIPR_NEEDED: { id: 5, code: "MIPR_NEEDED" as const },
  PROCURING_PRODUCTS: { id: 6, code: "PROCURING_PRODUCTS" as const },
  ALLOCATION_PENDING: { id: 7, code: "ALLOCATION_PENDING" as const },
  COMPLETE: { id: 8, code: "COMPLETE" as const },
} as const;

export type StatusEnumKey = keyof typeof StatusEnum;

export const ALL_STATUSES: readonly Status[] = Object.values(StatusEnum);

// ---- Lookups (equivalent to the Java static from(...) methods) ----
export function fromId(id: number): Status | undefined {
  return ALL_STATUSES.find((s) => s.id === id);
}

export function fromCode(code: string): Status | undefined {
  // normalize to be safe; remove to enforce exact match
  const normalized = code.trim().toUpperCase();
  return ALL_STATUSES.find((s) => s.code === normalized);
}

// Optional convenience maps
export const StatusIdByCode: Record<StatusCode, number> = {
  PENDING: 1,
  APPROVED: 2,
  DENIED: 3,
  ROM_GENERATED: 4,
  MIPR_NEEDED: 5,
  PROCURING_PRODUCTS: 6,
  ALLOCATION_PENDING: 7,
  COMPLETE: 8,
};

export const StatusCodeById: Record<number, StatusCode | undefined> = {
  1: "PENDING",
  2: "APPROVED",
  3: "DENIED",
  4: "ROM_GENERATED",
  5: "MIPR_NEEDED",
  6: "PROCURING_PRODUCTS",
  7: "ALLOCATION_PENDING",
  8: "COMPLETE",
};
