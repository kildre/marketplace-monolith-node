// src/domain/enums/StatusEnum.ts

export type StatusCode = 'PENDING' | 'APPROVED' | 'DENIED';

export interface Status {
  id: number;   // Java 'short' maps to number in TS
  code: StatusCode;
}

// Canonical definitions (acts like an enum-with-data)
export const StatusEnum = {
  PENDING:  { id: 1, code: 'PENDING'  as const },
  APPROVED: { id: 2, code: 'APPROVED' as const },
  DENIED:   { id: 3, code: 'DENIED'   as const },
} as const;

export type StatusEnumKey = keyof typeof StatusEnum;

export const ALL_STATUSES: readonly Status[] = Object.values(StatusEnum);

// ---- Lookups (equivalent to the Java static from(...) methods) ----
export function fromId(id: number): Status | undefined {
  return ALL_STATUSES.find(s => s.id === id);
}

export function fromCode(code: string): Status | undefined {
  // normalize to be safe; remove to enforce exact match
  const normalized = code.trim().toUpperCase();
  return ALL_STATUSES.find(s => s.code === normalized);
}

// Optional convenience maps
export const StatusIdByCode: Record<StatusCode, number> = {
  PENDING:  1,
  APPROVED: 2,
  DENIED:   3,
};

export const StatusCodeById: Record<number, StatusCode | undefined> = {
  1: 'PENDING',
  2: 'APPROVED',
  3: 'DENIED',
};
