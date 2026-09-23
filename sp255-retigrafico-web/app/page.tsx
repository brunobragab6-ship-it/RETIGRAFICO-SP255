"use client";
import { useExecutions } from "@/components/ExecutionProvider";
import Link from "next/link";
import { LOCATIONS, formatKm } from "@/lib/domain";
import { currentMeasurement, measurementFinancialSummary } from "@/lib/measurement-history";

function money(n:number){return n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}

export default function Dashboard(){
  const {executions}=useExecutions();
  const pending=executions.filter(x=>x.mapping_status==="PENDING").length;
  const conf=executions.filter(x=>x.classification_status&&x.classification_status!=="OK").length;
  const dates=executions.map(x=>x.date).filter(Boolean).sort(); const latest=dates.at(-1)||"-";
  const current=currentMeasurement(executions);
  const serials=new Set(executions.map(x=>x.serial_kartado).filter(Boolean)).size;
  const resources=new Set(executions.map(x=>x.resource_raw||x.activity_raw)).size;
  const fin=measurementFinancialSummary(executions,1,Math.max(6,Number(current.match(/\d+/)?.[0]||6)));
  return <>
    <div className="page-title"><div><h1>SP-255 | Acompanhamento das Frentes de Serviço</h1><p>Histórico aprovado separado da medição corrente. <b>Versão v0.3.5.2</b></p></div><div style={{display:"flex",gap:8,alignItems:"center"}}><span className="badge ok">v0.3.5.2</span><span className="badge warn">CORRENTE: {current}</span></div></div>
    <div className="cards"><div className="card"><div className="k">Apontamentos Kartado</div><div className="v">{serials}</div></div><div className="card"><div className="k">Recursos importados</div><div className="v">{executions.length}</div></div><div className="card"><div className="k">Recursos distintos</div><div className="v">{resources}</div></div><div className="card"><div className="k">Sem vínculo</div><div className="v">{pending}</div></div><div className="card"><div className="k">Conflitos/local</div><div className="v">{conf}</div></div></div>
    <div className="panel"><h2>POSIÇÃO FINANCEIRA DAS MEDIÇÕES</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>MEDIÇÃO</th><th>BASE</th><th>RECURSOS</th><th>TOTAL</th></tr></thead><tbody>{fin.map(r=><tr key={r.measurement}><td><b>{r.measurement}</b></td><td><span className={`badge ${r.state.includes("APROVADO")?"ok":r.state.includes("ANDAMENTO")?"warn":""}`}>{r.state}</span></td><td>{r.resources}</td><td><b>{money(r.value)}</b></td></tr>)}</tbody></table></div><div style={{padding:12}}><Link className="btn" href="/consulta">ABRIR CONSULTA RÁPIDA DE ACUMULADOS</Link></div></div>
    <div className="cards" style={{marginTop:12,gridTemplateColumns:"repeat(2,minmax(180px,1fr))"}}><div className="card"><div className="k">Última execução</div><div className="v" style={{fontSize:18}}>{latest}</div></div><div className="card"><div className="k">Medição corrente</div><div className="v" style={{fontSize:18}}>{current}</div></div></div>
    <div className="panel"><h2>Frentes de tronco</h2><div className="front-grid" style={{padding:14}}>{LOCATIONS.filter(x=>x.type==="FRENTE").map(f=>{const n=executions.filter(x=>x.location_type==="FRENTE"&&x.location_code===f.code).length;return <div className="front-card" key={f.code}><b>Frente {f.code}</b><div className="tiny muted">{formatKm(f.km_start)} → {formatKm(f.km_end)}</div><div style={{marginTop:8}}>{n} recursos</div></div>})}</div></div>
  </>;
}
