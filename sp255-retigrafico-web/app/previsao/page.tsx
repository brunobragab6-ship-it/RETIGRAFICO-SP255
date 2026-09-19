"use client";
import { useMemo, useState } from "react";
import { useExecutions } from "@/components/ExecutionProvider";
import { buildMeasurementRows, exportMeasurementPreview } from "@/lib/measurement-preview";
import { measurementPeriod, measurementWeeks } from "@/lib/domain";

function fmt(n: number) { return n.toLocaleString("pt-BR", { maximumFractionDigits: 3 }); }
function money(n: number) { return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export default function Previsao() {
  const { executions } = useExecutions();
  const measurements = useMemo(() => Array.from(new Set(executions.map(x => x.measurement).filter(Boolean))).sort(), [executions]);
  const [med, setMed] = useState(measurements.at(-1) || "MED 06");
  const [lot, setLot] = useState("2A");
  const rows = useMemo(() => buildMeasurementRows(executions, med).filter(r => r.lot === lot), [executions, med, lot]);
  const weeks = measurementWeeks(med);
  const period = measurementPeriod(med);
  const total = rows.reduce((s, r) => s + r.totalValue, 0);

  return <>
    <div className="page-title"><div><h1>Prévia de Medição</h1><p>Recursos do Kartado consolidados por Frente/Local + segmento de KM + período da medição.</p></div></div>
    <div className="toolbar">
      <select value={med} onChange={e => setMed(e.target.value)}>{measurements.length ? measurements.map(m => <option key={m}>{m}</option>) : <option>MED 06</option>}</select>
      <select value={lot} onChange={e => setLot(e.target.value)}><option value="2A">LOTE 2A</option><option value="2B">LOTE 2B</option></select>
      <button className="btn" onClick={() => exportMeasurementPreview(executions, med)}>BAIXAR EXCEL DA PRÉVIA</button>
      <span className="tiny muted">Período: {period?.start || "-"} → {period?.end || "-"}</span>
    </div>

    <div className="cards" style={{ gridTemplateColumns: "repeat(3,minmax(160px,1fr))" }}>
      <div className="card"><div className="k">Linhas da prévia</div><div className="v">{rows.length}</div></div>
      <div className="card"><div className="k">Recursos distintos</div><div className="v">{new Set(rows.map(r => r.resource)).size}</div></div>
      <div className="card"><div className="k">Valor executado</div><div className="v" style={{ fontSize: 20 }}>{money(total)}</div></div>
    </div>

    <div className="panel table-wrap"><table className="data-table"><thead><tr>
      <th>FRENTE / LOCAL</th><th>SEGMENTO EAP</th><th>NATUREZA</th><th>CLASSE</th><th>CÓDIGO</th><th>RECURSO / ITEM</th><th>UN.</th>
      {weeks.map(w => <th key={w.label}>{w.label}</th>)}<th>QTD. EXEC.</th><th>R$ UNIT.</th><th>R$ EXECUTADO</th><th>DIAS</th>
    </tr></thead><tbody>{rows.map((r, i) => <tr key={`${r.local}-${r.segment}-${r.resource}-${i}`}>
      <td>{r.local}</td><td title={`Trechos executados: ${r.executedSegments.join(" | ")}`}>{r.segment}</td><td>{r.nature}</td><td>{r.class}</td><td>{r.code}</td><td>{r.resource}</td><td>{r.unit}</td>
      {r.weeks.map((v: number, j: number) => <td key={j}>{v ? fmt(v) : ""}</td>)}
      <td><b>{fmt(r.totalQty)}</b></td><td>{r.unitPrice ? money(r.unitPrice) : ""}</td><td><b>{r.totalValue ? money(r.totalValue) : ""}</b></td><td>{r.days.join(", ")}</td>
    </tr>)}</tbody></table>{!rows.length && <div className="alert">Nenhum recurso executado encontrado para {med} / Lote {lot}.</div>}</div>
  </>;
}
