import * as XLSX from "xlsx";
import type { Execution, ImportPreview } from "./types";
import { measurementForDate, normalizeExecution } from "./domain";

function dateIso(v: unknown) {
  if (typeof v === "number" && Number.isFinite(v)) {
    // Excel 1900 date system. A fração do dia não altera a data de produção.
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

function n(v: unknown) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v ?? "").trim();
  if (!s) return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const x = Number(normalized);
  return Number.isFinite(x) ? x : null;
}

function unit(resource: string) {
  const m = resource.match(/\(([^()]*)\)\s*$/);
  return m ? m[1].replace(/\s*x\s*/i, "·").replace(/m3/gi, "m³").replace(/m2/gi, "m²").trim() : null;
}

function stripFinalUnit(resource: string) {
  return resource.replace(/\s*\([^()]*\)\s*$/, "").trim();
}

function key(ex: Execution) {
  return [ex.serial_kartado, ex.resource_index, ex.date, ex.km_start_raw, ex.km_end_raw]
    .join("|")
    .toLowerCase();
}

function resourceIndexes(rows: Record<string, unknown>[]) {
  const keys = new Set<string>();
  for (const row of rows.slice(0, 25)) Object.keys(row).forEach(k => keys.add(k));
  return Array.from(keys)
    .map(k => k.match(/^Recurso_(\d+)$/)?.[1])
    .filter(Boolean)
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
}

export function parseKartadoWorkbook(
  buffer: ArrayBuffer,
  sourceName: string,
  existing: Execution[] = []
): ImportPreview {
  const wb = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheetName = wb.SheetNames.find(nm => /apontamentos/i.test(nm)) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error("A planilha não possui uma aba de apontamentos válida.");

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  const indexes = resourceIndexes(rows);
  if (!indexes.length) throw new Error("Não encontrei colunas Recurso_1, Recurso_2... no arquivo.");

  const oldIds = new Set(existing.map(x => x.id));
  const byId = new Map<string, Execution>();
  const duplicates: Execution[] = [];

  rows.forEach((row, rowIndex) => {
    const serial = String(row["Serial"] ?? "").trim();
    if (!serial) return;

    // Regra da obra: Executado em é a data da produção. Só usa as demais como fallback.
    const date = dateIso(row["Executado em"] || row["Encontrado em"] || row["Criado em"]);

    for (const j of indexes) {
      const resource = String(row[`Recurso_${j}`] ?? "").trim();
      if (!resource) continue;

      const ex = normalizeExecution({
        id: `kartado-${serial}-r${j}-${date || rowIndex + 2}`,
        date,
        measurement: measurementForDate(date),
        resource_raw: resource,
        resource_index: j,
        activity_raw: stripFinalUnit(resource),
        km_start_raw: row["km inicial"] as string | number,
        km_end_raw: row["km final"] as string | number,
        direction: String(row["Sentido"] ?? ""),
        quantity: n(row[`Quantidade_${j}`]),
        unit: unit(resource),
        unit_price: n(row[`Valor Unitário_${j}`]),
        resource_value: n(row[`Valor_${j}`]),
        row_total_value: n(row["Valor total"]),
        notes: String(row["Observações"] ?? "").trim(),
        programming: String(row["Programação"] ?? "").trim(),
        lot: String(row["Lote"] ?? "").trim(),
        serial_kartado: serial,
        inventory_serial: String(row["Serial Inventário Vinculado"] ?? "").trim(),
        source: sourceName,
        source_row: rowIndex + 2,
        status: String(row["Status"] ?? "").trim(),
        nature: String(row["Natureza"] ?? "").trim(),
        class: String(row["Classe"] ?? "").trim(),
        company: String(row["Empresa"] ?? "").trim(),
        team: String(row["Equipe"] ?? "").trim(),
        created_at_source: dateIso(row["Criado em"]),
        found_at_source: dateIso(row["Encontrado em"]),
        updated_at_source: dateIso(row["Atualizado em"]),
        executed_at_source: dateIso(row["Executado em"])
      });

      if (oldIds.has(ex.id)) duplicates.push(ex);
      // Upsert: o mesmo Serial + Recurso_N + data mantém o mesmo ID.
      // Ao reimportar um Excel mais novo, quantidade/status/valor são atualizados sem duplicar.
      byId.set(ex.id, ex);
    }
  });

  const executions = Array.from(byId.values());

  return {
    executions,
    pendingMappings: executions.filter(x => x.mapping_status === "PENDING"),
    conflicts: executions.filter(x => x.classification_status !== "OK"),
    duplicates,
    sourceName,
    sourceRows: rows.length,
    resourceColumns: indexes.length
  };
}
