"use client";
import type { Execution } from "./types";
import { normalizeExecution } from "./domain";

// v2: fonte única = Apontamentos (simplificado). Não carrega mais a planilha antiga/RDO seed.
const KEY = "sp255_executions_v2";

export function loadExecutions() {
  if (typeof window === "undefined") return [] as Execution[];
  const raw = localStorage.getItem(KEY);
  if (!raw) return [] as Execution[];
  try {
    return (JSON.parse(raw) as Execution[]).map(normalizeExecution);
  } catch {
    return [] as Execution[];
  }
}

export function saveExecutions(v: Execution[]) {
  localStorage.setItem(KEY, JSON.stringify(v));
}

export function mergeExecutions(cur: Execution[], inc: Execution[]) {
  const m = new Map(cur.map(x => [x.id, x]));
  for (const x of inc) m.set(x.id, x);
  const out = Array.from(m.values());
  saveExecutions(out);
  return out;
}

export function clearExecutions() {
  localStorage.removeItem(KEY);
}
