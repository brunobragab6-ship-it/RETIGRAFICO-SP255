"use client";
import { useMemo, useState } from "react";
import { useExecutions } from "@/components/ExecutionProvider";
import { formatKm } from "@/lib/domain";
import { exportExecutionsExcel } from "@/lib/export";
import { exportMeasurementPreview } from "@/lib/measurement-preview";
import { displayResource } from "@/lib/retigraph";

function fmt(n: unknown) { return typeof n === "number" ? n.toLocaleString("pt-BR", { maximumFractionDigits: 3 }) : String(n ?? ""); }

export default function Caderno() {
  const { executions } = useExecutions();
  const measurements = useMemo(() => Array.from(new Set(executions.map(x => x.measurement).filter(Boolean))).sort(), [executions]);
  const [med, setMed] = useState("");
  const [q, setQ] = useState("");
  const rows = useMemo(() => executions.filter(x => (!med || x.measurement === med) && (!q || JSON.stringify(x).toLowerCase().includes(q.toLowerCase()))).sort((a, b) => `${a.date}|${a.source_row || 0}|${a.resource_index || 0}`.localeCompare(`${b.date}|${b.source_row || 0}|${b.resource_index || 0}`)), [executions, med, q]);

  return <>
    <div className="page-title"><div><h1>Caderno Diário</h1><p>Uma linha por Recurso_N do Kartado. Nenhum recurso válido é descartado.</p></div></div>
    <div className="toolbar">
      <select value={med} onChange={e => setMed(e.target.value)}><option value="">Todas medições</option>{measurements.map(m => <option key={m}>{m}</option>)}</select>
      <input className="input" placeholder="Pesquisar KM, recurso, serial..." value={q} onChange={e => setQ(e.target.value)} />
      <button className="btn secondary" onClick={() => exportExecutionsExcel(rows)}>BAIXAR CADERNO EXCEL</button>
      <button className="btn" disabled={!med} onClick={() => med && exportMeasurementPreview(executions, med)}>BAIXAR PRÉVIA MEDIÇÃO</button>
      <button className="btn secondary" onClick={() => window.print()}>IMPRIMIR / PDF</button>
      <span className="tiny muted">{rows.length} recursos</span>
    </div>
    {!med && <div className="alert">Selecione uma medição para habilitar a exportação da <b>Prévia de Medição</b>.</div>}
    <div className="panel table-wrap"><table className="data-table"><thead><tr>{[
      "DATA","MEDIÇÃO","RECURSO / ITEM","KM INICIAL","KM FINAL","LOCAL","FR.","SENT.","QTD.","UN.","R$ UNIT.","R$ RECURSO","PROGRAMAÇÃO","OBSERVAÇÕES","SERIAL KARTADO","STATUS"
    ].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(x => <tr key={x.id}>
      <td>{x.date}</td><td>{x.measurement}</td><td>{displayResource(x)}</td><td>{formatKm(x.km_start_m)}</td><td>{formatKm(x.km_end_m)}</td><td>{x.location_code || x.ramo_local}</td><td>{x.front}</td><td>{x.direction}</td><td>{fmt(x.quantity)}</td><td>{x.unit}</td><td>{x.unit_price != null ? `R$ ${fmt(x.unit_price)}` : ""}</td><td>{x.resource_value != null ? `R$ ${fmt(x.resource_value)}` : ""}</td><td>{x.programming}</td><td>{x.notes}</td><td>{x.serial_kartado}</td><td>{x.status}</td>
    </tr>)}</tbody></table></div>
  </>;
}
