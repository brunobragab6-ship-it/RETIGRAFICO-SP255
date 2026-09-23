"use client";
import { useMemo, useState } from "react";
import { useExecutions } from "@/components/ExecutionProvider";
import { LOCATIONS, measurementNumber, measurementPeriod } from "@/lib/domain";
import { displayResource } from "@/lib/retigraph";
import { currentMeasurement, measurementFinancialSummary, quickAccumulated } from "@/lib/measurement-history";

function fmt(n:number){return n.toLocaleString("pt-BR",{maximumFractionDigits:3});}
function money(n:number){return n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
function br(iso:string){if(!iso)return "-";const [y,m,d]=iso.split("-");return `${d}/${m}/${y}`;}

export default function ConsultaRapida(){
  const {executions}=useExecutions();
  const current=currentMeasurement(executions);
  const maxMed=Math.max(6,measurementNumber(current));
  const measurements=Array.from({length:maxMed},(_,i)=>`MED ${String(i+1).padStart(2,"0")}`);
  const [measurement,setMeasurement]=useState("MED 05");
  const [resource,setResource]=useState("");
  const [location,setLocation]=useState("");
  const [company,setCompany]=useState("");
  const [direction,setDirection]=useState("");

  const resources=useMemo(()=>Array.from(new Set<string>(executions.map(x=>displayResource(x)).filter((x):x is string=>Boolean(x)))).sort((a,b)=>a.localeCompare(b,"pt-BR")),[executions]);
  const baseFilter={measurement,location:location||undefined,company:company||undefined,direction:direction||undefined};
  const data=useMemo(()=>quickAccumulated(executions,{...baseFilter,resource:resource||undefined}),[executions,measurement,resource,location,company,direction]);
  const allResourceRows=useMemo(()=>resources.map(r=>({resource:r,...quickAccumulated(executions,{...baseFilter,resource:r})})).filter(r=>r.selectedQty||r.previousQty).sort((a,b)=>a.resource.localeCompare(b.resource,"pt-BR")),[resources,executions,measurement,location,company,direction]);
  const financial=useMemo(()=>measurementFinancialSummary(executions,1,maxMed),[executions,maxMed]);
  const period=measurementPeriod(measurement);

  return <>
    <div className="page-title"><div><h1>Consulta Rápida de Acumulados</h1><p>Selecione a medição e o recurso para responder em segundos quanto entrou, quanto vinha acumulado e quais KMs formam o volume.</p></div><span className="badge ok">CONSULTA</span></div>

    <div className="panel"><h2>BUSCA RÁPIDA</h2><div style={{padding:14}}><div className="quick-filter-grid">
      <label><span>Medição</span><select value={measurement} onChange={e=>setMeasurement(e.target.value)}>{measurements.map(m=><option key={m}>{m}</option>)}</select></label>
      <label className="wide"><span>Recurso / atividade</span><select value={resource} onChange={e=>setResource(e.target.value)}><option value="">TODOS OS RECURSOS</option>{resources.map(r=><option key={r} value={r}>{r}</option>)}</select></label>
      <label><span>Frente / dispositivo</span><select value={location} onChange={e=>setLocation(e.target.value)}><option value="">TODOS</option>{LOCATIONS.map(l=><option key={`${l.type}-${l.code}`} value={l.code}>{l.code} — {l.name}</option>)}</select></label>
      <label><span>Empresa</span><select value={company} onChange={e=>setCompany(e.target.value)}><option value="">TODAS</option><option>Val Rocha</option><option>Tranenge</option></select></label>
      <label><span>Sentido</span><select value={direction} onChange={e=>setDirection(e.target.value)}><option value="">TODOS</option><option>PN</option><option>PS</option><option>AMBOS</option></select></label>
    </div></div></div>

    <div className="alert"><b>{measurement}</b>{period?` · ${br(period.start)} a ${br(period.end)}`:""} · Base da medição: <b>{data.approvedTarget?"APROVADA / MEDIDA":"APONTADA / EM ANDAMENTO"}</b>{resource?` · ${resource}`:""}{location?` · ${location}`:""}</div>

    {resource ? <div className="cards quick-cards" style={{gridTemplateColumns:"repeat(5,minmax(160px,1fr))"}}>
      <div className="card key-card"><div className="k">ACUM. ATÉ MED ANTERIOR</div><div className="v">{fmt(data.previousQty)}</div><div className="tiny muted">{data.unit}</div></div>
      <div className="card key-card"><div className="k">MEDIDO / APONTADO NA {measurement}</div><div className="v">{fmt(data.selectedQty)}</div><div className="tiny muted">{data.unit}</div></div>
      <div className="card key-card"><div className="k">ACUM. ATÉ {measurement}</div><div className="v">{fmt(data.accumulatedQty)}</div><div className="tiny muted">{data.unit}</div></div>
      <div className="card"><div className="k">R$ DA {measurement}</div><div className="v money-v">{money(data.selectedValue)}</div></div>
      <div className="card"><div className="k">R$ ACUMULADO</div><div className="v money-v">{money(data.accumulatedValue)}</div></div>
    </div> : <div className="panel"><h2>RECURSOS — CLIQUE EM UM PARA CONSULTA DETALHADA</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>RECURSO / ATIVIDADE</th><th>UN.</th><th>ACUM. ANTERIOR</th><th>{measurement}</th><th>ACUM. ATÉ {measurement}</th><th>R$ {measurement}</th></tr></thead><tbody>{allResourceRows.map(r=><tr key={r.resource} onClick={()=>setResource(r.resource)} style={{cursor:"pointer"}}><td><b>{r.resource}</b></td><td>{r.unit}</td><td>{fmt(r.previousQty)}</td><td><b>{fmt(r.selectedQty)}</b></td><td><b>{fmt(r.accumulatedQty)}</b></td><td>{money(r.selectedValue)}</td></tr>)}</tbody></table>{!allResourceRows.length&&<div className="subtle-note" style={{padding:12}}>Nenhum recurso encontrado com os filtros atuais.</div>}</div></div>}

    {resource && <div className="panel"><h2>EVOLUÇÃO DO RECURSO POR MEDIÇÃO</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>MEDIÇÃO</th><th>BASE</th><th>QUANTIDADE</th><th>UN.</th><th>R$</th><th>ACUM. QTD.</th></tr></thead><tbody>{(()=>{let acc=0;return data.evolution.map(r=>{acc+=r.quantity;return <tr key={r.measurement} className={r.measurement===measurement?"selected-row":""}><td><b>{r.measurement}</b></td><td>{r.state}</td><td><b>{fmt(r.quantity)}</b></td><td>{data.unit}</td><td>{money(r.value)}</td><td><b>{fmt(acc)}</b></td></tr>})})()}</tbody></table></div></div>}

    {resource && <div className="panel"><h2>TRECHOS / KMs QUE FORMAM O VOLUME DA {measurement}</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>KM INICIAL</th><th>KM FINAL</th><th>SENTIDO</th><th>QUANTIDADE</th><th>UN.</th><th>DIAS</th><th>APONTAMENTOS</th></tr></thead><tbody>{data.segments.map((r,i)=><tr key={`${r.kmStart}-${r.kmEnd}-${i}`}><td>{r.kmStart||"-"}</td><td>{r.kmEnd||"-"}</td><td>{r.direction||"-"}</td><td><b>{fmt(r.quantity)}</b></td><td>{r.unit}</td><td>{Array.from(r.dates).sort().map(br).join(", ")}</td><td>{r.serials.size}</td></tr>)}</tbody></table>{!data.segments.length&&<div className="subtle-note" style={{padding:12}}>Nenhum trecho encontrado com os filtros atuais.</div>}</div></div>}

    <div className="panel"><h2>POSIÇÃO FINANCEIRA DAS MEDIÇÕES</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>MEDIÇÃO</th><th>SITUAÇÃO DA BASE</th><th>RECURSOS</th><th>APONTAMENTOS</th><th>TOTAL R$</th></tr></thead><tbody>{financial.map(r=><tr key={r.measurement}><td><b>{r.measurement}</b></td><td><span className={`badge ${r.state.includes("APROVADO")?"ok":r.state.includes("ANDAMENTO")?"warn":""}`}>{r.state}</span></td><td>{r.resources}</td><td>{r.serials}</td><td><b>{money(r.value)}</b></td></tr>)}</tbody></table></div></div>
  </>;
}
