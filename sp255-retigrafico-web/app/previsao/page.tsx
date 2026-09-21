"use client";
import { useEffect, useMemo, useState } from "react";
import { useExecutions } from "@/components/ExecutionProvider";
import MultiFilter from "@/components/MultiFilter";
import { buildMeasurementRows, exportMeasurementPreview, previewPeriods, type PreviewFilters } from "@/lib/measurement-preview";
import { executionCompany, measurementPeriod } from "@/lib/domain";

function fmt(n: number) { return n.toLocaleString("pt-BR", { maximumFractionDigits: 3 }); }
function money(n: number) { return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export default function Previsao() {
  const { executions } = useExecutions();
  const measurements = useMemo(() => Array.from(new Set(executions.map(x => x.measurement).filter(Boolean))).sort(), [executions]);
  const [med, setMed] = useState("MED 06");
  const [lot, setLot] = useState("2A");
  const [startDate, setStartDate] = useState("2026-09-11");
  const [endDate, setEndDate] = useState("2026-10-10");
  const [directions, setDirections] = useState<string[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [natures, setNatures] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);

  useEffect(() => {
    if (!med) return;
    const p = measurementPeriod(med);
    if (p) { setStartDate(p.start); setEndDate(p.end); }
  }, [med]);

  const natureOptions = useMemo(() => Array.from(new Set(executions.map(x => String(x.nature || "").trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b,"pt-BR")), [executions]);
  const classOptions = useMemo(() => {
    const base=natures.length?executions.filter(x=>natures.includes(String(x.nature||""))):executions;
    return Array.from(new Set(base.map(x=>String(x.class||"").trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b,"pt-BR"));
  },[executions,natures]);

  const filters: PreviewFilters = useMemo(() => ({ measurement: med, startDate, endDate, directions, companies, natures, classes }), [med,startDate,endDate,directions,companies,natures,classes]);
  const rows = useMemo(() => buildMeasurementRows(executions, filters).filter(r => r.lot === lot), [executions, filters, lot]);
  const periods = previewPeriods(filters);
  const total = rows.reduce((s, r) => s + r.totalValue, 0);
  const companiesAvailable = ["Val Rocha","Tranenge"].filter(c=>executions.some(x=>executionCompany(x)===c));

  return <>
    <div className="page-title"><div><h1>Prévia de Medição</h1><p>Layout de engenharia baseado no modelo EAP. A exportação gera os dois lotes no mesmo Excel.</p></div></div>
    <div className="toolbar filter-line">
      <select value={med} onChange={e => setMed(e.target.value)}><option value="">PERÍODO LIVRE</option>{measurements.length ? measurements.map(m => <option key={m}>{m}</option>) : <option>MED 06</option>}</select>
      <label className="filter-label">Data inicial <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} /></label>
      <label className="filter-label">Data final <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} /></label>
      <MultiFilter label="Sentidos" options={["PN","PS","AMBOS"]} selected={directions} onChange={setDirections} />
      <MultiFilter label="Empresas" options={companiesAvailable.length?companiesAvailable:["Val Rocha","Tranenge"]} selected={companies} onChange={setCompanies} />
      <MultiFilter label="Naturezas" options={natureOptions} selected={natures} onChange={v=>{setNatures(v);setClasses([]);}} />
      <MultiFilter label="Classes" options={classOptions} selected={classes} onChange={setClasses} />
      <select value={lot} onChange={e => setLot(e.target.value)}><option value="2A">VISUALIZAR LOTE 2A</option><option value="2B">VISUALIZAR LOTE 2B</option></select>
      <button className="btn" onClick={() => exportMeasurementPreview(executions, filters)}>BAIXAR EXCEL — LOTES 2A + 2B</button>
    </div>
    <div className="alert"><b>Regra de empresa:</b> Equipe <b>EQUIPE 1 TRANENGE - E</b> = <b>Tranenge</b>. Todas as demais equipes = <b>Val Rocha</b>. A planilha exportada traz Empresa/Responsabilidade e Sentido para filtro no próprio Excel.</div>

    <div className="cards" style={{ gridTemplateColumns: "repeat(4,minmax(150px,1fr))" }}>
      <div className="card"><div className="k">Linhas da prévia</div><div className="v">{rows.length}</div></div>
      <div className="card"><div className="k">Recursos distintos</div><div className="v">{new Set(rows.map(r => r.resource)).size}</div></div>
      <div className="card"><div className="k">Valor executado</div><div className="v" style={{ fontSize: 20 }}>{money(total)}</div></div>
      <div className="card"><div className="k">Período selecionado</div><div style={{fontWeight:800,marginTop:8}}>{startDate}<br/>a {endDate}</div></div>
    </div>

    <div className="panel table-wrap"><table className="data-table eap-like"><thead><tr>
      <th>FRENTE / LOCAL</th><th>SEGMENTO EAP</th><th>EMPRESA</th><th>SENTIDO</th><th>NATUREZA</th><th>CLASSE</th><th>CÓDIGO</th><th>RECURSO / ITEM</th><th>UN.</th>
      <th>ANTERIOR</th>{periods.map(w => <th key={w.label}>{w.label}</th>)}<th>QTD. EXEC.</th><th>R$ UNIT.</th><th>R$ EXECUTADO</th><th>DIAS</th>
    </tr></thead><tbody>{rows.map((r, i) => <tr key={`${r.local}-${r.segment}-${r.resource}-${r.company}-${r.direction}-${i}`}>
      <td>{r.local}</td><td title={`Trechos executados: ${r.executedSegments.join(" | ")}`}>{r.segment}</td><td>{r.company}</td><td>{r.direction}</td><td>{r.nature}</td><td>{r.class}</td><td>{r.code}</td><td>{r.resource}</td><td>{r.unit}</td>
      <td>{r.previousQty ? fmt(r.previousQty) : ""}</td>{r.periods.map((v:number,j:number)=><td key={j}>{v?fmt(v):""}</td>)}
      <td><b>{fmt(r.totalQty)}</b></td><td>{r.unitPrice ? money(r.unitPrice) : ""}</td><td><b>{r.totalValue ? money(r.totalValue) : ""}</b></td><td>{r.days.join(", ")}</td>
    </tr>)}</tbody></table>{!rows.length && <div className="alert">Nenhum recurso executado encontrado para os filtros atuais / Lote {lot}.</div>}</div>
  </>;
}
