"use client";
import * as XLSX from "xlsx";
import type { Execution } from "./types";
import { formatKm } from "./domain";
import { displayResource } from "./retigraph";

export function exportExecutionsExcel(executions: Execution[]) {
  const rows = executions.map(x => ({
    DATA: x.date,
    MEDICAO: x.measurement,
    LOTE: x.lot || "",
    RECURSO_KARTADO: displayResource(x),
    ATIVIDADE_CANONICA: x.activity_name || "",
    NATUREZA: x.nature || "",
    CLASSE: x.class || "",
    KM_INICIAL: formatKm(x.km_start_m),
    KM_FINAL: formatKm(x.km_end_m),
    PROGRAMACAO: x.programming || "",
    LOCAL: x.location_code || x.ramo_local || "",
    FRENTE: x.front || "",
    SENTIDO: x.direction || "",
    QTD: x.quantity,
    UN: x.unit,
    VALOR_UNITARIO: x.unit_price,
    VALOR_RECURSO: x.resource_value,
    OBSERVACOES: x.notes,
    SERIAL_KARTADO: x.serial_kartado,
    STATUS: x.status,
    EMPRESA: x.company,
    EQUIPE: x.team,
    LINHA_ORIGEM: x.source_row,
    FONTE: x.source
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!autofilter"] = { ref: ws["!ref"] || "A1:X1" };
  ws["!cols"] = [12,10,8,58,50,18,20,14,14,38,14,10,10,12,10,14,15,55,25,12,28,28,12,28].map(wch => ({ wch }));
  XLSX.utils.book_append_sheet(wb, ws, "CADERNO DIARIO");
  XLSX.writeFile(wb, "SP255_Caderno_Recursos_Kartado.xlsx");
}
