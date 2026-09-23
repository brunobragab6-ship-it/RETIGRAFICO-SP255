import * as XLSX from "xlsx";
import type { Execution, ImportChange, ImportPreview, KartadoImportMode } from "./types";
import { measurementForDate, normalizeExecution } from "./domain";

function dateIso(v: unknown) {
  if (typeof v === "number" && Number.isFinite(v)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}
function n(v: unknown) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v ?? "").trim();
  if (!s) return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const x = Number(normalized);
  return Number.isFinite(x) ? x : null;
}
function unit(resource: string) {
  const m = resource.match(/\(([^()]*)\)\s*$/);
  return m ? m[1].replace(/\s*x\s*/i, "·").replace(/m3/gi, "m³").replace(/m2/gi, "m²").trim() : null;
}
function stripFinalUnit(resource: string) { return resource.replace(/\s*\([^()]*\)\s*$/, "").trim(); }

export function kartadoSyncKey(ex: Pick<Execution, "serial_kartado" | "resource_index">) {
  const serial = String(ex.serial_kartado ?? "").trim().toLowerCase();
  const resource = Number(ex.resource_index ?? 0);
  return serial && resource > 0 ? `${serial}|r${resource}` : "";
}
export function isKartadoExecution(ex: Execution) { return Boolean(kartadoSyncKey(ex)) || String(ex.id || "").startsWith("kartado-"); }
export function isManualExecution(ex: Execution) { return ex.data_kind === "MANUAL" || String(ex.id||"").toLowerCase().startsWith("manual-"); }
function stableKartadoId(serial: string, resourceIndex: number) { return `kartado-${serial.trim()}-r${resourceIndex}`; }
function resourceIndexes(rows: Record<string, unknown>[]) {
  const keys = new Set<string>();
  for (const row of rows) Object.keys(row).forEach(k => keys.add(k));
  return Array.from(keys).map(k => k.match(/^Recurso_(\d+)$/)?.[1]).filter(Boolean).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
}
function comparable(ex: Execution) {
  return {
    data_kind: ex.data_kind || null, date: ex.date || "", measurement: ex.measurement || "", resource_raw: ex.resource_raw || "", activity_raw: ex.activity_raw || "", activity_id: ex.activity_id || null,
    km_start_m: ex.km_start_m ?? null, km_end_m: ex.km_end_m ?? null, direction: ex.direction || null, quantity: ex.quantity ?? null, unit: ex.unit || null,
    unit_price: ex.unit_price ?? null, resource_value: ex.resource_value ?? null, row_total_value: ex.row_total_value ?? null, notes: ex.notes || "", programming: ex.programming || "", lot: ex.lot || "",
    status: ex.status || "", nature: ex.nature || "", class: ex.class || "", company: ex.company || "", team: ex.team || "", inventory_serial: ex.inventory_serial || "",
    created_at_source: ex.created_at_source || "", found_at_source: ex.found_at_source || "", updated_at_source: ex.updated_at_source || "", executed_at_source: ex.executed_at_source || "",
    location_type: ex.location_type || null, location_code: ex.location_code || null, classification_status: ex.classification_status || null, mapping_status: ex.mapping_status || null
  };
}
const FIELD_LABELS: Record<string,string> = {
  data_kind:"tipo de base",date:"data",measurement:"medição",resource_raw:"recurso",activity_raw:"atividade",activity_id:"vínculo contratual",km_start_m:"KM inicial",km_end_m:"KM final",direction:"sentido",quantity:"quantidade",unit:"unidade",unit_price:"valor unitário",resource_value:"valor do recurso",row_total_value:"valor total do apontamento",notes:"observações",programming:"programação",lot:"lote",status:"status",nature:"natureza",class:"classe",company:"empresa",team:"equipe",inventory_serial:"serial de inventário",created_at_source:"criado em",found_at_source:"encontrado em",updated_at_source:"atualizado em",executed_at_source:"executado em",location_type:"tipo de local",location_code:"frente/estrutura",classification_status:"classificação",mapping_status:"mapeamento"
};
function changedFields(before: Execution, after: Execution) {
  const a=comparable(before) as Record<string,unknown>, b=comparable(after) as Record<string,unknown>;
  return Object.keys(b).filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k])).map(k=>FIELD_LABELS[k]||k);
}

export function parseKartadoWorkbook(buffer: ArrayBuffer, sourceName: string, existing: Execution[] = [], importMode: KartadoImportMode = "CURRENT_POINTED"): ImportPreview {
  const wb=XLSX.read(buffer,{type:"array",cellDates:false});
  const sheetName=wb.SheetNames.find(nm=>/apontamentos/i.test(nm))||wb.SheetNames[0];
  const ws=wb.Sheets[sheetName]; if(!ws) throw new Error("A planilha não possui uma aba de apontamentos válida.");
  const rows=XLSX.utils.sheet_to_json<Record<string,unknown>>(ws,{defval:""});
  const indexes=resourceIndexes(rows);
  if(!indexes.length) throw new Error("Não encontrei colunas Recurso_1, Recurso_2... no arquivo.");
  if(!rows.some(row=>String(row["Serial"]??"").trim())) throw new Error("Não encontrei a coluna Serial preenchida. Exporte o Apontamentos (simplificado) do Kartado.");

  const snapshotByKey=new Map<string,Execution>(); let repeatedInsideFile=0;
  rows.forEach((row,rowIndex)=>{
    const serial=String(row["Serial"]??"").trim(); if(!serial) return;
    const date=dateIso(row["Executado em"]||row["Encontrado em"]||row["Criado em"]);
    for(const j of indexes){
      const resource=String(row[`Recurso_${j}`]??"").trim(); if(!resource) continue;
      const ex=normalizeExecution({
        id:stableKartadoId(serial,j), date, measurement:measurementForDate(date), data_kind:importMode,
        resource_raw:resource, resource_index:j, activity_raw:stripFinalUnit(resource), km_start_raw:row["km inicial"] as string|number, km_end_raw:row["km final"] as string|number,
        direction:String(row["Sentido"]??""), quantity:n(row[`Quantidade_${j}`]), unit:unit(resource), unit_price:n(row[`Valor Unitário_${j}`]), resource_value:n(row[`Valor_${j}`]), row_total_value:n(row["Valor total"]),
        notes:String(row["Observações"]??"").trim(), programming:String(row["Programação"]??"").trim(), lot:String(row["Lote"]??"").trim(), serial_kartado:serial,
        inventory_serial:String(row["Serial Inventário Vinculado"]??"").trim(), source:sourceName, source_row:rowIndex+2, status:String(row["Status"]??"").trim(), nature:String(row["Natureza"]??"").trim(), class:String(row["Classe"]??"").trim(), company:String(row["Empresa"]??"").trim(), team:String(row["Equipe"]??"").trim(),
        created_at_source:dateIso(row["Criado em"]), found_at_source:dateIso(row["Encontrado em"]), updated_at_source:dateIso(row["Atualizado em"]), executed_at_source:dateIso(row["Executado em"])
      });
      const k=kartadoSyncKey(ex); if(!k) continue; if(snapshotByKey.has(k)) repeatedInsideFile+=1; snapshotByKey.set(k,ex);
    }
  });
  const executions=Array.from(snapshotByKey.values());
  const scopeMeasurements=Array.from(new Set(executions.map(x=>x.measurement).filter(Boolean))).sort((a,b)=>Number(a.match(/\d+/)?.[0]||0)-Number(b.match(/\d+/)?.[0]||0));
  if(!scopeMeasurements.length) throw new Error("Não consegui identificar a medição. Verifique a coluna Executado em.");
  if(importMode==="CURRENT_POINTED" && scopeMeasurements.length!==1) throw new Error(`A importação CORRENTE deve conter somente uma medição. O arquivo possui: ${scopeMeasurements.join(", ")}. Use o quadro HISTÓRICO APROVADO para arquivos com várias medições.`);
  if(importMode==="CURRENT_POINTED") {
    const closed=scopeMeasurements.filter(m=>existing.some(x=>x.measurement===m && x.data_kind==="APPROVED_HISTORY"));
    if(closed.length) throw new Error(`${closed.join(", ")} já possui histórico APROVADO/FECHADO. Para substituir pelo fechamento oficial, use a importação HISTÓRICO APROVADO.`);
  }

  const scopeSet=new Set(scopeMeasurements), snapshotKeys=new Set(executions.map(kartadoSyncKey).filter(Boolean));
  const relevantExisting=existing.filter(x=>!isManualExecution(x) && (importMode==="APPROVED_HISTORY" ? scopeSet.has(x.measurement) : scopeSet.has(x.measurement) && x.data_kind!=="APPROVED_HISTORY"));
  const existingByKey=new Map<string,Execution>(); for(const old of relevantExisting){const k=kartadoSyncKey(old); if(k) existingByKey.set(k,old);}
  const changes:ImportChange[]=[]; let added=0,updated=0,unchanged=0;
  for(const ex of executions){const k=kartadoSyncKey(ex),old=existingByKey.get(k); if(!old){added++;changes.push({kind:"ADDED",key:k,after:ex,fields:["novo recurso"]});continue;} const fields=changedFields(old,ex); if(fields.length){updated++;changes.push({kind:"UPDATED",key:k,before:old,after:ex,fields});}else unchanged++;}
  const removedExecutions:Execution[]=[];
  for(const old of relevantExisting){const k=kartadoSyncKey(old); if(!k || !snapshotKeys.has(k)){removedExecutions.push(old);changes.push({kind:"REMOVED",key:k||old.id,before:old,fields:[`removido da fotografia ${old.measurement}`]});}}

  const syncWarnings:string[]=[];
  if(relevantExisting.length && executions.length<Math.floor(relevantExisting.length*0.6)) syncWarnings.push(`O arquivo possui ${executions.length} recursos para ${scopeMeasurements.join(", ")}, bem menos que os ${relevantExisting.length} atualmente salvos nesse escopo. Confirme que é a fotografia completa antes de sincronizar.`);
  if(repeatedInsideFile) syncWarnings.push(`${repeatedInsideFile} repetição(ões) de Serial + Recurso_N foram encontradas; a última ocorrência será considerada.`);
  if(importMode==="APPROVED_HISTORY") syncWarnings.push(`Esta importação será gravada como HISTÓRICO APROVADO/FECHADO para ${scopeMeasurements.join(", ")}. Se existir fotografia corrente nessas medições, ela será substituída pelo aprovado.`);

  const outsidePreserved=existing.filter(x=>{
    if(isManualExecution(x)) return true;
    if(importMode==="CURRENT_POINTED" && x.data_kind==="APPROVED_HISTORY") return true;
    const k=kartadoSyncKey(x); if(k&&snapshotKeys.has(k)) return false;
    return !scopeSet.has(x.measurement);
  }).length;

  return { importMode, executions, pendingMappings:executions.filter(x=>x.mapping_status==="PENDING"), conflicts:executions.filter(x=>x.classification_status!=="OK"), duplicates:changes.filter(x=>x.kind==="UPDATED").map(x=>x.after!).filter(Boolean), sourceName, scopeMeasurements, sourceRows:rows.length, resourceColumns:indexes.length, removedExecutions, changes,
    syncStats:{added,updated,removed:removedExecutions.length,unchanged,totalAfter:outsidePreserved+executions.length,manualPreserved:existing.filter(isManualExecution).length}, syncWarnings };
}
