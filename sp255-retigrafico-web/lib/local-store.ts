"use client";
import type { Execution, KartadoImportMode } from "./types";
import { normalizeExecution } from "./domain";

const KEY = "sp255_executions_v4";
const LEGACY_KEYS = ["sp255_executions_v3","sp255_executions_v2","sp255_executions_v1"];
const META_KEY = "sp255_last_kartado_sync_v3";

function kartadoSyncKey(ex: Pick<Execution,"serial_kartado"|"resource_index">) {
  const serial=String(ex.serial_kartado??"").trim().toLowerCase(), resource=Number(ex.resource_index??0);
  return serial&&resource>0?`${serial}|r${resource}`:"";
}
function isManualExecution(ex: Execution){return ex.data_kind==="MANUAL"||String(ex.id||"").toLowerCase().startsWith("manual-");}

export type KartadoSyncMeta={sourceName:string;syncedAt:string;kartadoResources:number;manualPreserved:number;scopeMeasurements:string[];mode:KartadoImportMode};

export function loadExecutions(){
  if(typeof window==="undefined") return [] as Execution[];
  let raw=localStorage.getItem(KEY); if(!raw){for(const k of LEGACY_KEYS){raw=localStorage.getItem(k);if(raw)break;}}
  if(!raw)return [] as Execution[];
  try{const out=(JSON.parse(raw) as Execution[]).map(normalizeExecution);localStorage.setItem(KEY,JSON.stringify(out));return out;}catch{return [] as Execution[];}
}
export function saveExecutions(v:Execution[]){localStorage.setItem(KEY,JSON.stringify(v));}
export function mergeExecutions(cur:Execution[],inc:Execution[]){const m=new Map(cur.map(x=>[x.id,x]));for(const x of inc)m.set(x.id,x);const out=[...m.values()];saveExecutions(out);return out;}

export function syncKartadoSnapshot(cur:Execution[],snapshot:Execution[],sourceName="Apontamentos (simplificado).xlsx",scopeMeasurements?:string[],mode:KartadoImportMode="CURRENT_POINTED"){
  const normalized=snapshot.map(x=>normalizeExecution({...x,data_kind:mode}));
  const scope=scopeMeasurements?.length?Array.from(new Set(scopeMeasurements)):Array.from(new Set(normalized.map(x=>x.measurement).filter(Boolean)));
  const scopeSet=new Set(scope),incomingKeys=new Set(normalized.map(kartadoSyncKey).filter(Boolean));
  const preserved=cur.filter(x=>{
    if(isManualExecution(x)) return true;
    if(mode==="CURRENT_POINTED" && x.data_kind==="APPROVED_HISTORY") return true;
    const k=kartadoSyncKey(x);
    if(k&&incomingKeys.has(k)) return false;
    return !scopeSet.has(x.measurement);
  });
  const byId=new Map<string,Execution>(); for(const x of [...preserved,...normalized])byId.set(x.id,x);
  const out=[...byId.values()];saveExecutions(out);
  if(typeof window!=="undefined")localStorage.setItem(META_KEY,JSON.stringify({sourceName,syncedAt:new Date().toISOString(),kartadoResources:normalized.length,manualPreserved:preserved.filter(isManualExecution).length,scopeMeasurements:scope,mode} satisfies KartadoSyncMeta));
  return out;
}
export function loadLastKartadoSync(){if(typeof window==="undefined")return null as KartadoSyncMeta|null;try{const raw=localStorage.getItem(META_KEY);return raw?JSON.parse(raw) as KartadoSyncMeta:null;}catch{return null;}}
export function clearExecutions(){localStorage.removeItem(KEY);for(const k of LEGACY_KEYS)localStorage.removeItem(k);localStorage.removeItem(META_KEY);}
