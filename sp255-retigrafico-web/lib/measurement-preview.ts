"use client";
import * as XLSX from "xlsx";
import type { Execution } from "./types";
import { CATALOG, LOCATIONS, formatKm, measurementPeriod, measurementWeeks } from "./domain";
import contractPricesData from "@/data/contract-prices.json";
import { displayResource } from "./retigraph";

function num(v: unknown) { return typeof v === "number" && Number.isFinite(v) ? v : 0; }
function accepted(x: Execution) { return ["Executado", "Aprovado", ""].includes(x.status || ""); }
type ContractPrice = { lot: string; code: string; description: string; unit: string; unit_price: number };
const CONTRACT_PRICES = contractPricesData as ContractPrice[];
const priceByLotCode = new Map<string, number>();
for (const p of CONTRACT_PRICES) {
  const key = `${p.lot}|${p.code}`;
  const old = priceByLotCode.get(key);
  if (old == null || Math.abs(old - p.unit_price) < 1e-9) priceByLotCode.set(key, p.unit_price);
  else priceByLotCode.delete(key); // não adivinhar quando houver preço conflitante para o mesmo código
}
function contractPrice(x: Execution, code: string) {
  return code && x.lot ? priceByLotCode.get(`${x.lot}|${code}`) ?? null : null;
}
function executionUnitPrice(x: Execution, code: string) {
  return typeof x.unit_price === "number" ? x.unit_price : contractPrice(x, code);
}
function resourceValue(x: Execution, code: string) {
  if (typeof x.resource_value === "number") return x.resource_value;
  const up = executionUnitPrice(x, code);
  if (typeof x.quantity === "number" && typeof up === "number") return x.quantity * up;
  return 0;
}
function segment(x: Execution) {
  if (x.km_start_m != null || x.km_end_m != null) {
    const a = formatKm(x.km_start_m), b = formatKm(x.km_end_m);
    return a && b ? `${a} → ${b}` : (a || b);
  }
  return x.ramo_local || x.programming || x.location_code || "SEM KM";
}
function eapSegment(x: Execution) {
  if (x.location_type !== "FRENTE" || !x.location_code || x.km_min_m == null) return segment(x);
  const front = LOCATIONS.find(l => l.type === "FRENTE" && l.code === x.location_code);
  if (!front?.km_start || !front.km_end) return segment(x);
  const km = x.km_min_m;
  // Segmentos observados na planilha modelo EAP2A(B).
  if (front.code === "C") {
    if (km < 97500) return "096+500 → 097+500";
    if (km < 98600) return "097+500 → 098+600";
    return "098+600 → 100+500";
  }
  if (front.code === "F") return "111+500 → 117+220";
  // Para D/E e frentes do Lote 2B, consolida em faixas de 1 km a partir do início da frente.
  const size = 1000;
  const idx = Math.max(0, Math.floor((km - front.km_start) / size));
  const a = Math.min(front.km_start + idx * size, front.km_end);
  const b = Math.min(a + size, front.km_end);
  return `${formatKm(a)} → ${formatKm(b)}`;
}
function localLabel(x: Execution) {
  return x.location_type === "FRENTE" ? `FRENTE ${x.location_code || x.front || "-"}` : (x.location_code || "SEM LOCAL");
}
function catalogInfo(x: Execution) {
  const c = x.activity_id ? CATALOG.find(a => a.id === x.activity_id) : undefined;
  return { code: c?.code || "", group: c?.group || x.nature || "", subgroup: c?.subgroup || x.class || "", canonical: c?.name || x.activity_name || x.activity_raw };
}
function weekIndex(date: string, weeks: { start: string; end: string }[]) {
  return weeks.findIndex(w => date >= w.start && date <= w.end);
}

export function buildMeasurementRows(executions: Execution[], med: string) {
  const weeks = measurementWeeks(med);
  const xs = executions.filter(x => x.measurement === med && accepted(x));
  const groups = new Map<string, any>();

  for (const x of xs) {
    const c = catalogInfo(x);
    const key = [x.lot || "", localLabel(x), eapSegment(x), displayResource(x), x.unit || ""].join("||");
    if (!groups.has(key)) groups.set(key, {
      lot: x.lot || "",
      local: localLabel(x),
      locationCode: x.location_code || x.front || "",
      segment: eapSegment(x),
      executedSegments: new Set<string>(),
      nature: x.nature || c.group,
      class: x.class || c.subgroup,
      group: c.group,
      subgroup: c.subgroup,
      code: c.code,
      resource: displayResource(x),
      canonical: c.canonical,
      unit: x.unit || "",
      weeks: [0, 0, 0, 0],
      totalQty: 0,
      totalValue: 0,
      unitPrices: [] as number[],
      dates: new Set<string>(),
      serials: new Set<string>()
    });
    const g = groups.get(key)!;
    const q = num(x.quantity);
    const wi = weekIndex(x.date, weeks);
    if (wi >= 0 && wi < 4) g.weeks[wi] += q;
    g.totalQty += q;
    g.totalValue += resourceValue(x, c.code);
    const up = executionUnitPrice(x, c.code);
    if (typeof up === "number") g.unitPrices.push(up);
    g.executedSegments.add(segment(x));
    if (x.date) g.dates.add(x.date);
    if (x.serial_kartado) g.serials.add(x.serial_kartado);
  }

  return Array.from(groups.values()).map(g => ({
    ...g,
    unitPrice: g.unitPrices.length ? g.unitPrices[g.unitPrices.length - 1] : (g.totalQty ? g.totalValue / g.totalQty : 0),
    days: Array.from(g.dates).sort(),
    serialCount: g.serials.size,
    executedSegments: Array.from(g.executedSegments).sort()
  })).sort((a, b) => `${a.lot}|${a.local}|${a.segment}|${a.resource}`.localeCompare(`${b.lot}|${b.local}|${b.segment}|${b.resource}`, "pt-BR"));
}

function makePreviewSheet(rows: ReturnType<typeof buildMeasurementRows>, med: string, lot: string) {
  const weeks = measurementWeeks(med);
  const p = measurementPeriod(med);
  const title = `PREVISÃO MEDIÇÃO - ${med} - LOTE ${lot}`;
  const headers = [
    "FRENTE / LOCAL", "SEGMENTO KM", "NATUREZA", "CLASSE", "CÓDIGO", "RECURSO / ITEM", "UNID",
    ...weeks.map(w => w.label), "QUANT. EXECUTADO", "R$ UNIT", "R$ EXECUTADO", "TRECHOS EXECUTADOS", "DIAS", "SERIAIS"
  ];
  const data = rows.filter(r => r.lot === lot).map(r => [
    r.local, r.segment, r.nature, r.class, r.code, r.resource, r.unit,
    ...r.weeks, r.totalQty, r.unitPrice, r.totalValue, r.executedSegments.join(" | "), r.days.join(", "), r.serialCount
  ]);
  const aoa = [[title], [`PERÍODO: ${p?.start || ""} a ${p?.end || ""}`], [], headers, ...data];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!merges"] = [XLSX.utils.decode_range(`A1:${XLSX.utils.encode_col(headers.length - 1)}1`), XLSX.utils.decode_range(`A2:${XLSX.utils.encode_col(headers.length - 1)}2`)];
  ws["!autofilter"] = { ref: `A4:${XLSX.utils.encode_col(headers.length - 1)}${Math.max(4, data.length + 4)}` };
  ws["!cols"] = [
    { wch: 15 }, { wch: 23 }, { wch: 18 }, { wch: 22 }, { wch: 17 }, { wch: 55 }, { wch: 10 },
    ...weeks.map(() => ({ wch: 14 })), { wch: 16 }, { wch: 13 }, { wch: 16 }, { wch: 40 }, { wch: 26 }, { wch: 10 }
  ];
  return ws;
}

function makeDailySheet(executions: Execution[], med: string) {
  const xs = executions.filter(x => x.measurement === med && accepted(x)).sort((a, b) => `${a.date}|${a.location_code}|${displayResource(a)}`.localeCompare(`${b.date}|${b.location_code}|${displayResource(b)}`, "pt-BR"));
  const rows = xs.map(x => {
    const c = catalogInfo(x);
    return {
      DATA: x.date,
      MEDICAO: x.measurement,
      LOTE: x.lot || "",
      LOCAL: localLabel(x),
      SEGMENTO_KM: segment(x),
      NATUREZA: x.nature || c.group,
      CLASSE: x.class || c.subgroup,
      CODIGO: c.code,
      RECURSO_KARTADO: displayResource(x),
      RECURSO_CANONICO: c.canonical,
      QTD: x.quantity,
      UN: x.unit,
      VALOR_UNITARIO: executionUnitPrice(x, c.code),
      VALOR_RECURSO: resourceValue(x, c.code),
      SENTIDO: x.direction,
      STATUS: x.status,
      SERIAL_KARTADO: x.serial_kartado,
      PROGRAMACAO: x.programming,
      OBSERVACOES: x.notes,
      LINHA_ORIGEM: x.source_row
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!autofilter"] = { ref: ws["!ref"] || "A1:T1" };
  ws["!cols"] = [12, 10, 8, 16, 24, 18, 20, 17, 58, 58, 13, 10, 14, 15, 10, 12, 25, 35, 55, 12].map(wch => ({ wch }));
  return ws;
}

function makePendingSheet(executions: Execution[], med: string) {
  const rows = executions.filter(x => x.measurement === med && (x.mapping_status === "PENDING" || x.classification_status !== "OK")).map(x => ({
    DATA: x.date,
    LOCAL: x.location_code || x.front || "",
    KM_INICIAL: formatKm(x.km_start_m),
    KM_FINAL: formatKm(x.km_end_m),
    RECURSO: displayResource(x),
    MAPEAMENTO: x.mapping_status,
    CLASSIFICACAO: x.classification_status,
    MOTIVO: x.mapping_reason || x.classification_reason,
    SERIAL: x.serial_kartado,
    PROGRAMACAO: x.programming,
    OBSERVACOES: x.notes
  }));
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ STATUS: "SEM PENDÊNCIAS" }]);
  ws["!cols"] = [12, 12, 14, 14, 60, 15, 16, 55, 25, 40, 55].map(wch => ({ wch }));
  return ws;
}

export function exportMeasurementPreview(executions: Execution[], med: string) {
  const rows = buildMeasurementRows(executions, med);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makePreviewSheet(rows, med, "2A"), "PREVIA 2A");
  XLSX.utils.book_append_sheet(wb, makePreviewSheet(rows, med, "2B"), "PREVIA 2B");
  XLSX.utils.book_append_sheet(wb, makeDailySheet(executions, med), "MEMORIA DIARIA");
  XLSX.utils.book_append_sheet(wb, makePendingSheet(executions, med), "PENDENCIAS");
  const safe = med.replace(/\s+/g, "_");
  XLSX.writeFile(wb, `SP255_PREVIA_MEDICAO_${safe}.xlsx`);
}
