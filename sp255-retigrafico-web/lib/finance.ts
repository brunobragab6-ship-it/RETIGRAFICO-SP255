import contractPricesData from "@/data/contract-prices.json";
import { CATALOG } from "./domain";
import type { ActivityCatalogItem, Execution } from "./types";

type ContractPrice = { lot: string; code: string; description: string; unit: string; unit_price: number };
const CONTRACT_PRICES = contractPricesData as ContractPrice[];
const priceByLotCode = new Map<string, number>();
for (const p of CONTRACT_PRICES) {
  const key = `${p.lot}|${p.code}`;
  const old = priceByLotCode.get(key);
  if (old == null || Math.abs(old - p.unit_price) < 1e-9) priceByLotCode.set(key, p.unit_price);
  else priceByLotCode.delete(key);
}

export function activityCode(x: Execution) {
  return x.activity_id ? (CATALOG.find(a => a.id === x.activity_id)?.code || "") : "";
}

export function contractUnitPrice(lot: string | null | undefined, code: string | null | undefined) {
  if (!lot || !code) return null;
  return priceByLotCode.get(`${lot}|${code}`) ?? null;
}

export function contractUnitPriceForActivity(lot: string | null | undefined, activity: ActivityCatalogItem | null | undefined) {
  return activity ? contractUnitPrice(lot, activity.code) : null;
}

export function executionUnitPrice(x: Execution, code = activityCode(x)) {
  if (typeof x.unit_price === "number" && Number.isFinite(x.unit_price)) return x.unit_price;
  return contractUnitPrice(x.lot, code);
}

export function executionValue(x: Execution, code = activityCode(x)) {
  if (typeof x.resource_value === "number" && Number.isFinite(x.resource_value)) return x.resource_value;
  const up = executionUnitPrice(x, code);
  if (typeof x.quantity === "number" && typeof up === "number") return x.quantity * up;
  return 0;
}
