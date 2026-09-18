import type { Execution } from "./types";
import { formatKm } from "./domain";

export type Bucket = { start: number; end: number; label: string };

export function makeBuckets(start: number, end: number, size = 100) {
  const a: Bucket[] = [];
  for (let c = start; c < end; c += size) a.push({ start: c, end: Math.min(end, c + size), label: formatKm(c) });
  return a;
}

export function overlaps(ex: Execution, b: Bucket) {
  if (ex.km_min_m == null || ex.km_max_m == null) return false;
  if (ex.km_min_m === ex.km_max_m) return ex.km_min_m >= b.start && ex.km_min_m < b.end;
  return ex.km_min_m < b.end && ex.km_max_m > b.start;
}

export function displayResource(ex: Execution) {
  return ex.resource_raw || ex.activity_name || ex.activity_raw;
}

export function activityRows(exs: Execution[]) {
  return Array.from(new Set(exs.map(displayResource))).sort((a, b) => a.localeCompare(b, "pt-BR"));
}
