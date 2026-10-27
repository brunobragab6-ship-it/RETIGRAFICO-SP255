"use client";
import { useMemo, useState } from "react";
import MeasurementImportOptions from "@/components/MeasurementImportOptions";
import { useExecutions } from "@/components/ExecutionProvider";
import { parseKartadoWorkbook } from "@/lib/import-kartado";
import type { Execution, ImportPreview, KartadoImportMode } from "@/lib/types";
import { displayResource } from "@/lib/retigraph";
import { executionCompany, formatKm, measurementNumber, measurementPeriod } from "@/lib/domain";
import { approvedMeasurements, currentMeasurement, measurementFinancialSummary, pointedMeasurements } from "@/lib/measurement-history";

function fmt(n: unknown) { return typeof n === "number" ? n.toLocaleString("pt-BR",{maximumFractionDigits:3}) : String(n??""); }
function money(n:number){return n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
function identity(x?:Execution){return x?`${x.serial_kartado||"-"} · R${x.resource_index||"-"} · ${displayResource(x)}`:"-";}

type Slot = { preview: ImportPreview|null; msg:string; error:string };
const EMPTY:Slot={preview:null,msg:"",error:""};

export default function Importar(){
  const {executions,syncKartado,reset}=useExecutions();
  const [history,setHistory]=useState<Slot>(EMPTY), [current,setCurrent]=useState<Slot>(EMPTY);

  async function handle(file:File,mode:KartadoImportMode){
    const set=mode==="APPROVED_HISTORY"?setHistory:setCurrent;
    set({preview:null,msg:"Lendo e comparando o arquivo...",error:""});
    try{
      if(!file.name.toLowerCase().endsWith(".xlsx"))throw new Error("Envie somente o Apontamentos (simplificado).xlsx exportado do Kartado.");
      const p=parseKartadoWorkbook(await file.arrayBuffer(),file.name,executions,mode);
      const s=p.syncStats;
      set({preview:p,error:"",msg:s?`Comparação: ${s.added} novo(s), ${s.updated} alterado(s), ${s.removed} removido(s), ${s.unchanged} sem alteração.`:`${p.executions.length} recursos lidos.`});
    }catch(e:unknown){
      const error=e instanceof Error?e:new Error("Falha na leitura do Excel.");
      set({preview:null,msg:"",error:error.message});
      throw error;
    }
  }
  function confirmImport(slot:Slot,mode:KartadoImportMode){
    const p=slot.preview;if(!p)return;
    if(p.syncStats?.removed){const ok=window.confirm(`Serão removidos ${p.syncStats.removed} recurso(s) da fotografia deste escopo. Deseja continuar?`);if(!ok)return;}
    syncKartado(p.executions,p.sourceName,p.scopeMeasurements,mode);
    const text=mode==="APPROVED_HISTORY"
      ? `Histórico aprovado salvo para ${p.scopeMeasurements?.join(", ")}. Essas medições agora entram como MEDIDO/APROVADO e substituem qualquer fotografia corrente do mesmo período.`
      : `Medição corrente sincronizada para ${p.scopeMeasurements?.join(", ")}. Você pode importar novamente amanhã: quantidade, KM, status, valor, inclusões e exclusões serão atualizados.`;
    (mode==="APPROVED_HISTORY"?setHistory:setCurrent)({preview:null,msg:text,error:""});
  }

  const approved=approvedMeasurements(executions), pointed=pointedMeasurements(executions), currentMed=currentMeasurement(executions);
  const financial=useMemo(()=>measurementFinancialSummary(executions,1,Math.max(6,measurementNumber(currentMed))),[executions,currentMed]);

  function Preview({slot,mode}:{slot:Slot;mode:KartadoImportMode}){
    const p=slot.preview; if(!p)return null; const changes=(p.changes||[]).filter(x=>x.kind!=="UNCHANGED");
    return <div className="panel"><h2>CONFERÊNCIA — {mode==="APPROVED_HISTORY"?"HISTÓRICO APROVADO":"MEDIÇÃO CORRENTE"}</h2><div style={{padding:12}}>
      <div className="subtle-note"><b>Escopo:</b> {p.scopeMeasurements?.join(", ")||"-"} · {p.executions.length} recursos</div>
      <div className="cards" style={{gridTemplateColumns:"repeat(5,1fr)",marginTop:10}}><div className="card"><div className="k">NOVOS</div><div className="v">{p.syncStats?.added||0}</div></div><div className="card"><div className="k">ALTERADOS</div><div className="v">{p.syncStats?.updated||0}</div></div><div className="card"><div className="k">EXCLUÍDOS</div><div className="v">{p.syncStats?.removed||0}</div></div><div className="card"><div className="k">SEM ALTERAÇÃO</div><div className="v">{p.syncStats?.unchanged||0}</div></div><div className="card"><div className="k">BASE APÓS</div><div className="v">{p.syncStats?.totalAfter||0}</div></div></div>
      {p.syncWarnings?.map((w,i)=><div className="alert" key={i}><b>CONFERIR:</b> {w}</div>)}
      <div className="toolbar"><button className="btn" onClick={()=>confirmImport(slot,mode)}>CONFIRMAR {mode==="APPROVED_HISTORY"?"HISTÓRICO APROVADO":"SINCRONIZAÇÃO CORRENTE"}</button></div>
      {changes.length>0&&<div className="table-wrap"><table className="data-table"><thead><tr><th>AÇÃO</th><th>SERIAL / RECURSO</th><th>CAMPOS</th><th>ANTES</th><th>DEPOIS</th></tr></thead><tbody>{changes.slice(0,200).map((c,i)=><tr key={`${c.key}-${i}`}><td>{c.kind}</td><td>{identity(c.after||c.before)}</td><td>{c.fields.join(", ")}</td><td>{c.before?`${c.before.date} · ${formatKm(c.before.km_start_m)}→${formatKm(c.before.km_end_m)} · ${fmt(c.before.quantity)} ${c.before.unit||""}`:"-"}</td><td>{c.after?`${c.after.date} · ${formatKm(c.after.km_start_m)}→${formatKm(c.after.km_end_m)} · ${fmt(c.after.quantity)} ${c.after.unit||""}`:"-"}</td></tr>)}</tbody></table></div>}
    </div></div>;
  }

  return <>
    <div className="page-title"><div><h1>Importar Apontamentos</h1><p>Duas bases separadas: histórico aprovado das medições fechadas e fotografia corrente da medição em andamento.</p></div><span className="badge warn">CORRENTE: {currentMed}</span></div>

    <section className="panel space-y-4 rounded-xl bg-background p-4 text-foreground" style={{padding:14}}>
      <MeasurementImportOptions onImport={async ({file,mode})=>{
        await handle(file,mode==="aprovadas"?"APPROVED_HISTORY":"CURRENT_POINTED");
      }}/>
      <div className="subtle-note mt-4 text-sm">A seleção do arquivo prepara a conferência; nada é salvo antes da confirmação abaixo. A medição em andamento deve conter uma única medição. O acumulado aprovado pode reunir várias medições e substitui a base corrente dos mesmos períodos.</div>
    </section>

    <section className="space-y-3 bg-background text-foreground" aria-label="Conferência da MED em andamento">
      {current.msg&&<div className="alert" role="status">{current.msg}</div>}
      {current.error&&<div className="alert bad" role="alert">{current.error}</div>}
      <Preview slot={current} mode="CURRENT_POINTED"/>
    </section>
    <section className="space-y-3 bg-background text-foreground" aria-label="Conferência das medições aprovadas">
      {history.msg&&<div className="alert" role="status">{history.msg}</div>}
      {history.error&&<div className="alert bad" role="alert">{history.error}</div>}
      <Preview slot={history} mode="APPROVED_HISTORY"/>
    </section>

    <div className="panel"><h2>CONTROLE DAS MEDIÇÕES</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>MEDIÇÃO</th><th>PERÍODO</th><th>BASE</th><th>RECURSOS</th><th>TOTAL R$</th></tr></thead><tbody>{financial.map(r=>{const p=measurementPeriod(r.measurement);return <tr key={r.measurement}><td><b>{r.measurement}</b></td><td>{p?`${p.start} → ${p.end}`:"-"}</td><td><span className={`badge ${r.state.includes("APROVADO")?"ok":r.state.includes("ANDAMENTO")?"warn":""}`}>{r.state}</span></td><td>{r.resources}</td><td><b>{money(r.value)}</b></td></tr>})}</tbody></table></div><div className="subtle-note" style={{padding:10}}>Aprovadas na base: {approved.join(", ")||"nenhuma"}. Fotografias correntes: {pointed.join(", ")||"nenhuma"}.</div></div>

    <div className="toolbar"><button className="btn secondary" onClick={()=>{if(window.confirm("Limpar toda a base deste navegador?")){reset();setHistory(EMPTY);setCurrent(EMPTY);}}}>LIMPAR BASE LOCAL</button><span className="tiny muted">{executions.length} recursos salvos neste navegador</span></div>
  </>;
}
