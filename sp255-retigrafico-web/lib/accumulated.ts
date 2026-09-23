import * as XLSX from "xlsx";
import type { Execution } from "./types";
import { executionCompany, formatKm } from "./domain";
import { displayResource } from "./retigraph";
import { executionValue, executionUnitPrice } from "./finance";

export type AccumulatedFilters = {
  measurement: string;
  locationCodes?: string[];
  companies?: string[];
  directions?: string[];
  natures?: string[];
  classes?: string[];
  statuses?: string[];
  resources?: string[];
};

function medNumber(med: string) {
  return Number(String(med || "").match(/\d+/)?.[0] || 0);
}

function num(v: unknown) {
  return typeof v === "number" && Number.isFinite(v) ? v : Number(v || 0) || 0;
}

function inList(value: string, selected?: string[]) {
  return !selected?.length || selected.includes(value);
}

function filteredBase(executions: Execution[], filters: AccumulatedFilters) {
  return executions.filter(x => {
    const local = String(x.location_code || x.front || "").trim();
    const company = executionCompany(x);
    const direction = String(x.direction || "").trim();
    const nature = String(x.nature || "").trim();
    const cls = String(x.class || "").trim();
    const status = String(x.status || "").trim();
    const resource = displayResource(x);
    return inList(local, filters.locationCodes)
      && inList(company, filters.companies)
      && inList(direction, filters.directions)
      && inList(nature, filters.natures)
      && inList(cls, filters.classes)
      && inList(status, filters.statuses)
      && inList(resource, filters.resources);
  });
}

export type AccumulatedResourceRow = {
  resource: string;
  nature: string;
  class: string;
  unit: string;
  previousQty: number;
  measurementQty: number;
  accumulatedQty: number;
  previousValue: number;
  measurementValue: number;
  accumulatedValue: number;
  unitPrice: number;
  measurements: Record<string, number>;
  selectedSegments: string[];
  accumulatedSegments: string[];
  selectedDays: string[];
};

export type AccumulatedSegmentRow = {
  measurement: string;
  date: string;
  local: string;
  resource: string;
  nature: string;
  class: string;
  kmStart: string;
  kmEnd: string;
  direction: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  value: number;
  status: string;
  serial: string;
  company: string;
};

export function buildAccumulated(executions: Execution[], filters: AccumulatedFilters) {
  const target = medNumber(filters.measurement);
  const base = filteredBase(executions, filters).filter(x => medNumber(x.measurement) > 0 && medNumber(x.measurement) <= target);
  const selected = base.filter(x => medNumber(x.measurement) === target);
  const previous = base.filter(x => medNumber(x.measurement) < target);

  const keys = Array.from(new Set(base.map(x => `${displayResource(x)}|||${x.unit || ""}`))).sort((a,b)=>a.localeCompare(b,"pt-BR"));
  const rows: AccumulatedResourceRow[] = keys.map(key => {
    const [resource, unit] = key.split("|||");
    const all = base.filter(x => displayResource(x) === resource && String(x.unit || "") === unit);
    const sel = all.filter(x => medNumber(x.measurement) === target);
    const prev = all.filter(x => medNumber(x.measurement) < target);
    const qty = (xs: Execution[]) => xs.reduce((s,x)=>s+num(x.quantity),0);
    const val = (xs: Execution[]) => xs.reduce((s,x)=>s+executionValue(x),0);
    const seg = (x: Execution) => {
      const a = formatKm(x.km_start_m), b = formatKm(x.km_end_m);
      if (!a && !b) return x.ramo_local || x.programming || x.location_code || "SEM KM";
      return `${a || b} → ${b || a}${x.direction ? ` ${x.direction}` : ""}`;
    };
    const measurements: Record<string, number> = {};
    for (const x of all) measurements[x.measurement] = (measurements[x.measurement] || 0) + num(x.quantity);
    const selectedSegments = Array.from(new Set(sel.map(seg))).sort();
    const accumulatedSegments = Array.from(new Set(all.map(seg))).sort();
    const selectedDays = Array.from(new Set(sel.map(x=>x.date).filter(Boolean))).sort();
    const accumulatedQty = qty(all), accumulatedValue = val(all);
    return {
      resource,
      nature: String(all[0]?.nature || ""),
      class: String(all[0]?.class || ""),
      unit,
      previousQty: qty(prev),
      measurementQty: qty(sel),
      accumulatedQty,
      previousValue: val(prev),
      measurementValue: val(sel),
      accumulatedValue,
      unitPrice: accumulatedQty ? accumulatedValue / accumulatedQty : (executionUnitPrice(all[0]) ?? 0),
      measurements,
      selectedSegments,
      accumulatedSegments,
      selectedDays
    };
  });

  const details: AccumulatedSegmentRow[] = selected.map(x => ({
    measurement: x.measurement,
    date: x.date,
    local: String(x.location_code || x.front || ""),
    resource: displayResource(x),
    nature: String(x.nature || ""),
    class: String(x.class || ""),
    kmStart: formatKm(x.km_start_m),
    kmEnd: formatKm(x.km_end_m),
    direction: String(x.direction || ""),
    quantity: num(x.quantity),
    unit: String(x.unit || ""),
    unitPrice: executionUnitPrice(x) ?? 0,
    value: executionValue(x),
    status: String(x.status || ""),
    serial: String(x.serial_kartado || x.rdo || x.id),
    company: executionCompany(x)
  })).sort((a,b)=>a.resource.localeCompare(b.resource,"pt-BR") || a.date.localeCompare(b.date) || a.kmStart.localeCompare(b.kmStart));

  return { base, selected, previous, rows, details };
}

export function exportAccumulatedExcel(executions: Execution[], filters: AccumulatedFilters) {
  const { rows, details } = buildAccumulated(executions, filters);
  const wb = XLSX.utils.book_new();
  const summary = rows.map(r => ({
    "RECURSO / ATIVIDADE": r.resource,
    "NATUREZA": r.nature,
    "CLASSE": r.class,
    "UN.": r.unit,
    "ACUM. ANTERIOR": r.previousQty,
    [`${filters.measurement} QTD.`]: r.measurementQty,
    "ACUMULADO": r.accumulatedQty,
    "R$ UNIT.": r.unitPrice,
    [`${filters.measurement} R$`]: r.measurementValue,
    "R$ ACUMULADO": r.accumulatedValue,
    [`TRECHOS ${filters.measurement}`]: r.selectedSegments.join(" | "),
    [`DIAS ${filters.measurement}`]: r.selectedDays.join(", ")
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "RESUMO ACUMULADO");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(details.map(d => ({
    "MEDIÇÃO": d.measurement,
    "DATA": d.date,
    "LOCAL": d.local,
    "RECURSO": d.resource,
    "NATUREZA": d.nature,
    "CLASSE": d.class,
    "KM INICIAL": d.kmStart,
    "KM FINAL": d.kmEnd,
    "SENTIDO": d.direction,
    "QTD.": d.quantity,
    "UN.": d.unit,
    "R$ UNIT.": d.unitPrice,
    "R$ EXEC.": d.value,
    "STATUS": d.status,
    "SERIAL/RDO": d.serial,
    "EMPRESA": d.company
  }))), `DETALHE ${filters.measurement}`.slice(0,31));
  const name = `ACUMULADOS_${filters.measurement.replace(/\s+/g,"_")}.xlsx`;
  XLSX.writeFile(wb, name);
}
