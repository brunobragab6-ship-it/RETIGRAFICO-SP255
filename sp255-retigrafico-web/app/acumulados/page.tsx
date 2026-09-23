"use client";
import { useMemo, useState } from "react";
import { useExecutions } from "@/components/ExecutionProvider";
import MultiFilter from "@/components/MultiFilter";
import { buildAccumulated, exportAccumulatedExcel, type AccumulatedFilters } from "@/lib/accumulated";
import { availableMeasurements, executionCompany, LOCATIONS, measurementNumber, measurementPeriod, measurementStatus } from "@/lib/domain";
import { displayResource } from "@/lib/retigraph";

function fmt(n: number) { return n.toLocaleString("pt-BR", { maximumFractionDigits: 3 }); }
function money(n: number) { return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function brDate(iso?: string) { if (!iso) return "-"; const [y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; }

export default function AcumuladosPage() {
  const { executions } = useExecutions();
  const maxMed = useMemo(() => Math.max(6, ...executions.map(x => measurementNumber(x.measurement))), [executions]);
  const measurements = useMemo(() => availableMeasurements(1, maxMed), [maxMed]);
  const [measurement, setMeasurement] = useState("MED 06");
  const [localCode, setLocalCode] = useState("");
  const [companies, setCompanies] = useState<string[]>([]);
  const [directions, setDirections] = useState<string[]>([]);
  const [natures, setNatures] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [resources, setResources] = useState<string[]>([]);

  const throughSelected = useMemo(() => executions.filter(x => measurementNumber(x.measurement) > 0 && measurementNumber(x.measurement) <= measurementNumber(measurement)), [executions, measurement]);
  const localBase = useMemo(() => localCode ? throughSelected.filter(x => String(x.location_code || x.front || "") === localCode) : throughSelected, [throughSelected, localCode]);
  const natureOptions = useMemo(() => Array.from(new Set(localBase.map(x=>String(x.nature||"").trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b,"pt-BR")), [localBase]);
  const classBase = natures.length ? localBase.filter(x=>natures.includes(String(x.nature||""))) : localBase;
  const classOptions = useMemo(() => Array.from(new Set(classBase.map(x=>String(x.class||"").trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b,"pt-BR")), [classBase]);
  const resourceBase = classBase.filter(x => !classes.length || classes.includes(String(x.class||"")));
  const resourceOptions = useMemo(() => Array.from(new Set(resourceBase.map(displayResource).filter(Boolean))).sort((a,b)=>a.localeCompare(b,"pt-BR")), [resourceBase]);
  const statusOptions = useMemo(() => Array.from(new Set(localBase.map(x=>String(x.status||"").trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b,"pt-BR")), [localBase]);
  const companyOptions = useMemo(() => ["Val Rocha","Tranenge"].filter(c=>throughSelected.some(x=>executionCompany(x)===c)), [throughSelected]);

  const filters: AccumulatedFilters = useMemo(() => ({
    measurement,
    locationCodes: localCode ? [localCode] : [],
    companies,
    directions,
    natures,
    classes,
    statuses,
    resources
  }), [measurement, localCode, companies, directions, natures, classes, statuses, resources]);

  const data = useMemo(() => buildAccumulated(executions, filters), [executions, filters]);
  const period = measurementPeriod(measurement);
  const state = measurementStatus(measurement);
  const medNums = measurements.filter(m=>measurementNumber(m)<=measurementNumber(measurement));

  const selectedQtyByUnit = useMemo(() => {
    const m = new Map<string, number>();
    data.rows.forEach(r => m.set(r.unit || "(sem un.)", (m.get(r.unit || "(sem un.)") || 0) + r.measurementQty));
    return Array.from(m.entries()).filter(([,v])=>v!==0);
  }, [data.rows]);
  const cumQtyByUnit = useMemo(() => {
    const m = new Map<string, number>();
    data.rows.forEach(r => m.set(r.unit || "(sem un.)", (m.get(r.unit || "(sem un.)") || 0) + r.accumulatedQty));
    return Array.from(m.entries()).filter(([,v])=>v!==0);
  }, [data.rows]);

  const segmentSummary = useMemo(() => {
    const m = new Map<string, {resource:string; kmStart:string; kmEnd:string; direction:string; unit:string; qty:number; days:Set<string>; serials:Set<string>}>();
    for (const d of data.details) {
      const key = [d.resource,d.kmStart,d.kmEnd,d.direction,d.unit].join("||");
      const cur = m.get(key) || {resource:d.resource,kmStart:d.kmStart,kmEnd:d.kmEnd,direction:d.direction,unit:d.unit,qty:0,days:new Set<string>(),serials:new Set<string>()};
      cur.qty += d.quantity; cur.days.add(d.date); cur.serials.add(d.serial); m.set(key,cur);
    }
    return Array.from(m.values()).sort((a,b)=>a.resource.localeCompare(b.resource,"pt-BR") || a.kmStart.localeCompare(b.kmStart));
  }, [data.details]);

  return <>
    <div className="page-title"><div><h1>Acumulados por Atividade / Frente</h1><p>Consulta rápida do aprovado por medição, acumulado anterior, acumulado total e trechos/KMs que formam o volume.</p></div><span className={`badge ${state === "EM ANDAMENTO" ? "warn" : "ok"}`}>{measurement} · {state}</span></div>

    <div className="toolbar filter-line">
      <select value={measurement} onChange={e=>setMeasurement(e.target.value)}>{measurements.map(m=><option key={m}>{m}</option>)}</select>
      <select value={localCode} onChange={e=>setLocalCode(e.target.value)}><option value="">TODAS AS FRENTES / ESTRUTURAS</option>{LOCATIONS.map(l=><option key={`${l.type}-${l.code}`} value={l.code}>{l.code} — {l.name}</option>)}</select>
      <MultiFilter label="Empresas" options={companyOptions.length?companyOptions:["Val Rocha","Tranenge"]} selected={companies} onChange={setCompanies}/>
      <MultiFilter label="Sentidos" options={["PN","PS","AMBOS"]} selected={directions} onChange={setDirections}/>
      <MultiFilter label="Naturezas" options={natureOptions} selected={natures} onChange={v=>{setNatures(v);setClasses([]);setResources([]);}}/>
      <MultiFilter label="Classes" options={classOptions} selected={classes} onChange={v=>{setClasses(v);setResources([]);}}/>
      <MultiFilter label="Recursos" options={resourceOptions} selected={resources} onChange={setResources}/>
      <MultiFilter label="Status" options={statusOptions} selected={statuses} onChange={setStatuses}/>
      <button className="btn" onClick={()=>exportAccumulatedExcel(executions, filters)}>BAIXAR EXCEL</button>
    </div>

    <div className="alert"><b>{measurement}</b>: {period ? `${brDate(period.start)} a ${brDate(period.end)}` : "período não identificado"}. <b>Regra:</b> até {period ? brDate(period.end) : "-"} os apontamentos pertencem a {measurement}; a partir do dia seguinte entram automaticamente na próxima medição. Assim, a MED 06 encerra em <b>10/10/2026</b> e 11/10/2026 já inicia a MED 07.</div>

    <div className="cards" style={{gridTemplateColumns:"repeat(5,minmax(150px,1fr))"}}>
      <div className="card"><div className="k">Recursos filtrados</div><div className="v">{data.rows.length}</div></div>
      <div className="card"><div className="k">Execuções na {measurement}</div><div className="v">{data.selected.length}</div></div>
      <div className="card"><div className="k">Qtd. da medição</div><div style={{marginTop:8,fontWeight:800}}>{selectedQtyByUnit.length ? selectedQtyByUnit.map(([u,v])=><div key={u}>{fmt(v)} {u}</div>) : "0"}</div></div>
      <div className="card"><div className="k">Qtd. acumulada até {measurement}</div><div style={{marginTop:8,fontWeight:800}}>{cumQtyByUnit.length ? cumQtyByUnit.map(([u,v])=><div key={u}>{fmt(v)} {u}</div>) : "0"}</div></div>
      <div className="card"><div className="k">R$ acumulado filtrado</div><div className="v" style={{fontSize:18}}>{money(data.rows.reduce((s,r)=>s+r.accumulatedValue,0))}</div></div>
    </div>

    <div className="panel"><h2>RESUMO ACUMULADO — ANTERIOR + MEDIÇÃO SELECIONADA</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>RECURSO / ATIVIDADE</th><th>NATUREZA</th><th>CLASSE</th><th>UN.</th><th>ACUM. ANTERIOR</th><th>{measurement}</th><th>ACUM. ATÉ {measurement}</th><th>R$ UNIT.</th><th>R$ {measurement}</th><th>R$ ACUM.</th><th>TRECHOS APROVADOS NA {measurement}</th></tr></thead><tbody>{data.rows.map(r=><tr key={`${r.resource}-${r.unit}`}><td><b>{r.resource}</b></td><td>{r.nature}</td><td>{r.class}</td><td>{r.unit}</td><td>{fmt(r.previousQty)}</td><td><b>{fmt(r.measurementQty)}</b></td><td><b>{fmt(r.accumulatedQty)}</b></td><td>{money(r.unitPrice)}</td><td>{money(r.measurementValue)}</td><td>{money(r.accumulatedValue)}</td><td>{r.selectedSegments.join(" | ") || "-"}</td></tr>)}</tbody></table>{!data.rows.length&&<div className="alert">Nenhum recurso encontrado com os filtros atuais.</div>}</div></div>

    <div className="panel"><h2>EVOLUÇÃO POR MEDIÇÃO — QUANTIDADE APROVADA</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>RECURSO / ATIVIDADE</th><th>UN.</th>{medNums.map(m=><th key={m}>{m}</th>)}<th>ACUM.</th></tr></thead><tbody>{data.rows.map(r=><tr key={`evo-${r.resource}-${r.unit}`}><td>{r.resource}</td><td>{r.unit}</td>{medNums.map(m=><td key={m}>{r.measurements[m] ? fmt(r.measurements[m]) : ""}</td>)}<td><b>{fmt(r.accumulatedQty)}</b></td></tr>)}</tbody></table></div></div>

    <div className="panel"><h2>TRECHOS / KMs QUE FORMAM O VOLUME DA {measurement}</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>RECURSO</th><th>KM INICIAL</th><th>KM FINAL</th><th>SENTIDO</th><th>QTD. NO TRECHO</th><th>UN.</th><th>DIAS</th><th>APONTAMENTOS</th></tr></thead><tbody>{segmentSummary.map((r,i)=><tr key={`${r.resource}-${r.kmStart}-${r.kmEnd}-${i}`}><td>{r.resource}</td><td>{r.kmStart||"-"}</td><td>{r.kmEnd||"-"}</td><td>{r.direction||"-"}</td><td><b>{fmt(r.qty)}</b></td><td>{r.unit}</td><td>{Array.from(r.days).sort().map(brDate).join(", ")}</td><td>{r.serials.size}</td></tr>)}</tbody></table>{!segmentSummary.length&&<div className="alert">Nenhum trecho na medição selecionada com os filtros atuais.</div>}</div></div>

    <div className="panel"><h2>MEMÓRIA DETALHADA DA {measurement}</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>DATA</th><th>LOCAL</th><th>RECURSO</th><th>KM INICIAL</th><th>KM FINAL</th><th>SENTIDO</th><th>QTD.</th><th>UN.</th><th>STATUS</th><th>SERIAL/RDO</th><th>EMPRESA</th></tr></thead><tbody>{data.details.map((d,i)=><tr key={`${d.serial}-${i}`}><td>{brDate(d.date)}</td><td>{d.local}</td><td>{d.resource}</td><td>{d.kmStart||"-"}</td><td>{d.kmEnd||"-"}</td><td>{d.direction||"-"}</td><td>{fmt(d.quantity)}</td><td>{d.unit}</td><td>{d.status}</td><td>{d.serial}</td><td>{d.company}</td></tr>)}</tbody></table></div></div>
  </>;
}
