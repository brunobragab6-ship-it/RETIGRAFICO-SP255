import type { Execution } from "./types";
import { executionValue } from "./finance";
import { executionCompany, formatKm, measurementNumber } from "./domain";
import { displayResource } from "./retigraph";

function num(v: unknown) {
  return typeof v === "number" && Number.isFinite(v) ? v : Number(v || 0) || 0;
}

export function isApprovedHistory(x: Execution) {
  return x.data_kind === "APPROVED_HISTORY";
}
export function isCurrentPointed(x: Execution) {
  return x.data_kind === "CURRENT_POINTED" || x.data_kind === "MANUAL";
}

export function approvedMeasurements(executions: Execution[]) {
  return Array.from(new Set(executions.filter(isApprovedHistory).map(x => x.measurement).filter(Boolean)))
    .sort((a,b)=>measurementNumber(a)-measurementNumber(b));
}

export function pointedMeasurements(executions: Execution[]) {
  const approved = new Set(approvedMeasurements(executions));
  return Array.from(new Set(executions.filter(x => isCurrentPointed(x) && !approved.has(x.measurement)).map(x => x.measurement).filter(Boolean)))
    .sort((a,b)=>measurementNumber(a)-measurementNumber(b));
}

export function currentMeasurement(executions: Execution[]) {
  const pointed = pointedMeasurements(executions);
  if (pointed.length) return pointed.at(-1)!;
  const approved = approvedMeasurements(executions);
  const next = approved.length ? measurementNumber(approved.at(-1)!) + 1 : 1;
  return `MED ${String(next).padStart(2,"0")}`;
}

export function measurementFinancialSummary(executions: Execution[], from = 1, through?: number) {
  const current = currentMeasurement(executions);
  const max = through ?? Math.max(6, measurementNumber(current));
  return Array.from({length: Math.max(0,max-from+1)},(_,i)=>{
    const measurement = `MED ${String(from+i).padStart(2,"0")}`;
    const approved = executions.filter(x => x.measurement === measurement && isApprovedHistory(x));
    const currentRows = executions.filter(x => x.measurement === measurement && isCurrentPointed(x));
    const isApproved = approved.length > 0;
    const rows = isApproved ? approved : currentRows;
    return {
      measurement,
      state: isApproved ? "MEDIDO / APROVADO" : measurement === current ? "APONTADO / EM ANDAMENTO" : "SEM BASE",
      value: rows.reduce((s,x)=>s+executionValue(x),0),
      resources: rows.length,
      serials: new Set(rows.map(x=>x.serial_kartado || x.rdo || x.id)).size,
      kind: isApproved ? "APPROVED_HISTORY" as const : "CURRENT_POINTED" as const
    };
  });
}

export type QuickAccumulatedFilters = {
  measurement: string;
  resource?: string;
  location?: string;
  company?: string;
  direction?: string;
};

export function quickAccumulated(executions: Execution[], f: QuickAccumulatedFilters) {
  const targetN = measurementNumber(f.measurement);
  const approvedTargetExists = executions.some(x=>x.measurement===f.measurement && isApprovedHistory(x));
  const relevant = (x: Execution) => {
    if (f.resource && displayResource(x) !== f.resource) return false;
    if (f.location && String(x.location_code || x.front || "") !== f.location) return false;
    if (f.company && executionCompany(x) !== f.company) return false;
    if (f.direction && String(x.direction || "") !== f.direction) return false;
    return true;
  };
  const previous = executions.filter(x=>isApprovedHistory(x) && measurementNumber(x.measurement)<targetN && relevant(x));
  const selected = executions.filter(x=>x.measurement===f.measurement && relevant(x) && (approvedTargetExists ? isApprovedHistory(x) : isCurrentPointed(x)));
  const accumulated = [...previous, ...selected];
  const qty = (xs: Execution[]) => xs.reduce((s,x)=>s+num(x.quantity),0);
  const value = (xs: Execution[]) => xs.reduce((s,x)=>s+executionValue(x),0);
  const units = Array.from(new Set(accumulated.map(x=>String(x.unit||"")).filter(Boolean)));
  const unit = units.length===1 ? units[0] : units.length ? "MÚLTIPLAS UN." : "";
  const evolution = Array.from({length: Math.max(targetN,1)},(_,i)=>{
    const m=`MED ${String(i+1).padStart(2,"0")}`;
    const approved = executions.some(x=>x.measurement===m && isApprovedHistory(x));
    const rows = executions.filter(x=>x.measurement===m && relevant(x) && (approved ? isApprovedHistory(x) : isCurrentPointed(x)));
    return { measurement:m, quantity:qty(rows), value:value(rows), state: approved ? "APROVADO" : rows.length ? "APONTADO" : "-" };
  });
  const segmentMap = new Map<string,{kmStart:string;kmEnd:string;direction:string;quantity:number;unit:string;dates:Set<string>;serials:Set<string>}>();
  for (const x of selected) {
    const kmStart=formatKm(x.km_start_m), kmEnd=formatKm(x.km_end_m);
    const key=[kmStart,kmEnd,x.direction||"",x.unit||""].join("|");
    const row=segmentMap.get(key)||{kmStart,kmEnd,direction:String(x.direction||""),quantity:0,unit:String(x.unit||""),dates:new Set<string>(),serials:new Set<string>()};
    row.quantity += num(x.quantity); if(x.date) row.dates.add(x.date); row.serials.add(String(x.serial_kartado||x.rdo||x.id)); segmentMap.set(key,row);
  }
  return {
    approvedTarget: approvedTargetExists,
    previousQty:qty(previous), selectedQty:qty(selected), accumulatedQty:qty(accumulated),
    previousValue:value(previous), selectedValue:value(selected), accumulatedValue:value(accumulated), unit,
    selected, previous, evolution,
    segments:Array.from(segmentMap.values()).sort((a,b)=>a.kmStart.localeCompare(b.kmStart)||a.kmEnd.localeCompare(b.kmEnd))
  };
}
