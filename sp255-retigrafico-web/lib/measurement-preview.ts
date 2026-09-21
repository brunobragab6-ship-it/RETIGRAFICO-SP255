"use client";
import * as XLSX from "xlsx";
import type { Execution } from "./types";
import { CATALOG, LOCATIONS, executionCompany, formatKm, measurementPeriod } from "./domain";
import { activityCode, executionUnitPrice, executionValue } from "./finance";
import { displayResource } from "./retigraph";

function num(v: unknown) { return typeof v === "number" && Number.isFinite(v) ? v : 0; }
function accepted(x: Execution) { return ["Executado", "Aprovado", ""].includes(x.status || ""); }

export type PreviewFilters = {
  measurement?: string;
  startDate?: string;
  endDate?: string;
  directions?: string[];
  companies?: string[];
  natures?: string[];
  classes?: string[];
};

type Period = { label: string; start: string; end: string };

function normalizeFilters(input?: string | PreviewFilters): PreviewFilters {
  if (typeof input === "string") {
    const p = measurementPeriod(input);
    return { measurement: input, startDate: p?.start || "", endDate: p?.end || "" };
  }
  return input || {};
}

function iso(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function br(isoDate: string) {
  const [y,m,d] = isoDate.split("-");
  return y && m && d ? `${d}/${m}` : isoDate;
}

export function previewPeriods(filtersInput?: string | PreviewFilters): Period[] {
  const f = normalizeFilters(filtersInput);
  let start = f.startDate, end = f.endDate;
  if ((!start || !end) && f.measurement) {
    const p = measurementPeriod(f.measurement);
    start ||= p?.start || ""; end ||= p?.end || "";
  }
  if (!start || !end) return [];
  const out: Period[] = [];
  let cur = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  while (cur <= last) {
    const a = new Date(cur);
    const b = new Date(cur); b.setDate(b.getDate() + 6);
    if (b > last) b.setTime(last.getTime());
    const sa = iso(a), sb = iso(b);
    out.push({ label: `${br(sa)}-${br(sb)}`, start: sa, end: sb });
    cur = new Date(b); cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function periodIndex(date: string, periods: Period[]) { return periods.findIndex(w => date >= w.start && date <= w.end); }
function segment(x: Execution) {
  if (x.km_start_m != null || x.km_end_m != null) {
    const a = formatKm(x.km_start_m), b = formatKm(x.km_end_m);
    return a && b ? `${a} → ${b}` : (a || b);
  }
  return x.ramo_local || x.programming || x.location_code || "SEM KM";
}
function eapSegment(x: Execution) {
  if (x.location_type !== "FRENTE" || !x.location_code || x.km_min_m == null) return segment(x);
  const front = LOCATIONS.find(l => l.type === "FRENTE" && l.code === x.location_code);
  if (!front?.km_start || !front.km_end) return segment(x);
  const km = x.km_min_m;
  if (front.code === "C") {
    if (km < 97500) return "096+500 → 097+500";
    if (km < 98600) return "097+500 → 098+600";
    return "098+600 → 100+500";
  }
  if (front.code === "F") return "111+500 → 117+220";
  const size = 1000;
  const idx = Math.max(0, Math.floor((km - front.km_start) / size));
  const a = Math.min(front.km_start + idx * size, front.km_end);
  const b = Math.min(a + size, front.km_end);
  return `${formatKm(a)} → ${formatKm(b)}`;
}
function localLabel(x: Execution) { return x.location_type === "FRENTE" ? `FRENTE ${x.location_code || x.front || "-"}` : (x.location_code || "SEM LOCAL"); }
function catalogInfo(x: Execution) {
  const c = x.activity_id ? CATALOG.find(a => a.id === x.activity_id) : undefined;
  return { code: c?.code || activityCode(x), group: c?.group || x.nature || "", subgroup: c?.subgroup || x.class || "", canonical: c?.name || x.activity_name || x.activity_raw };
}
function passes(x: Execution, f: PreviewFilters, ignoreDate = false) {
  if (!accepted(x)) return false;
  if (f.measurement && x.measurement !== f.measurement) return false;
  if (!ignoreDate && f.startDate && x.date < f.startDate) return false;
  if (!ignoreDate && f.endDate && x.date > f.endDate) return false;
  if (f.directions?.length && !f.directions.includes(String(x.direction || "")) && x.direction !== "AMBOS") return false;
  if (f.companies?.length && !f.companies.includes(executionCompany(x))) return false;
  if (f.natures?.length && !f.natures.includes(String(x.nature || ""))) return false;
  if (f.classes?.length && !f.classes.includes(String(x.class || ""))) return false;
  return true;
}
function groupKey(x: Execution) {
  return [x.lot || "", localLabel(x), eapSegment(x), x.nature || "", x.class || "", displayResource(x), x.unit || "", executionCompany(x), x.direction || ""].join("||");
}

export function buildMeasurementRows(executions: Execution[], input?: string | PreviewFilters) {
  const filters = normalizeFilters(input);
  const periods = previewPeriods(filters);
  const xs = executions.filter(x => passes(x, filters));
  const groups = new Map<string, any>();

  for (const x of xs) {
    const c = catalogInfo(x);
    const key = groupKey(x);
    if (!groups.has(key)) groups.set(key, {
      key, lot: x.lot || "", local: localLabel(x), locationCode: x.location_code || x.front || "", segment: eapSegment(x), executedSegments: new Set<string>(),
      nature: x.nature || c.group, class: x.class || c.subgroup, group: c.group, subgroup: c.subgroup, code: c.code,
      resource: displayResource(x), canonical: c.canonical, unit: x.unit || "", company: executionCompany(x), direction: x.direction || "",
      periods: periods.map(() => 0), totalQty: 0, totalValue: 0, unitPrices: [] as number[], dates: new Set<string>(), serials: new Set<string>(), previousQty: 0, previousValue: 0
    });
    const g = groups.get(key)!;
    const q = num(x.quantity), pi = periodIndex(x.date, periods);
    if (pi >= 0) g.periods[pi] += q;
    g.totalQty += q; g.totalValue += executionValue(x, c.code);
    const up = executionUnitPrice(x, c.code); if (typeof up === "number") g.unitPrices.push(up);
    g.executedSegments.add(segment(x)); if (x.date) g.dates.add(x.date); if (x.serial_kartado) g.serials.add(x.serial_kartado);
  }

  if (filters.startDate) {
    for (const x of executions) {
      if (!accepted(x) || x.date >= filters.startDate) continue;
      const fNoDate = { ...filters, measurement: undefined, startDate: undefined, endDate: undefined };
      if (!passes(x, fNoDate, true)) continue;
      const g = groups.get(groupKey(x));
      if (g) { g.previousQty += num(x.quantity); g.previousValue += executionValue(x, catalogInfo(x).code); }
    }
  }

  return Array.from(groups.values()).map(g => ({
    ...g,
    unitPrice: g.unitPrices.length ? g.unitPrices[g.unitPrices.length - 1] : (g.totalQty ? g.totalValue / g.totalQty : 0),
    days: Array.from(g.dates).sort(), serialCount: g.serials.size, executedSegments: Array.from(g.executedSegments).sort()
  })).sort((a, b) => `${a.lot}|${a.local}|${a.segment}|${a.nature}|${a.class}|${a.resource}`.localeCompare(`${b.lot}|${b.local}|${b.segment}|${b.nature}|${b.class}|${b.resource}`, "pt-BR"));
}

const navy = "0B3E68", dark = "082C4D", grey = "D9DDE0", light = "EAF1F7", white = "FFFFFF";
function styleCell(cell: any, fill?: string, bold = false, color = "000000", align: "left"|"center" = "left") {
  if (!cell) return;
  cell.s = { fill: fill ? { fgColor: { rgb: fill } } : undefined, font: { bold, color: { rgb: color }, sz: 9 }, alignment: { horizontal: align, vertical: "center", wrapText: true }, border: { top:{style:"thin",color:{rgb:"808080"}}, bottom:{style:"thin",color:{rgb:"808080"}}, left:{style:"thin",color:{rgb:"808080"}}, right:{style:"thin",color:{rgb:"808080"}} } };
}
function setNumber(ws:any, addr:string, fmt:string){ if(ws[addr]) ws[addr].z=fmt; }

function makeModelLikeSheet(rows: ReturnType<typeof buildMeasurementRows>, filters: PreviewFilters, lot: string) {
  const periods = previewPeriods(filters);
  const headers = ["SEGMENTO","COD.","Estrutura","Código","Responsabilidade","Sentido","Descrição","Unid","Quant. Previsto","R$ Unit","R$ PLANILHA","ACUMULADO","R$ ACUMULADO","ANTERIOR",...periods.map(p=>p.label),"QUANT. EXECUTADO","R$ EXECUTADO","QTD PROJETO","R$ PROJETO","SALDO (PROJETO-EXECUTADO)","R$ SALDO","TOTAL PACOTE","R$ TOTAL CURVA S","R$ DIFERENÇA / SALDO","DIAS","SERIAIS"];
  const body:any[][]=[];
  const lotRows=rows.filter(r=>r.lot===lot);
  let lastSegment="", lastNature="", lastClass="";
  for(const r of lotRows){
    const segKey=`${r.local}|${r.segment}`;
    if(segKey!==lastSegment){ body.push([r.segment,"","III. SUBTRECHO","",r.company,r.direction,`${r.local} · ${r.segment}`]); lastSegment=segKey; lastNature=""; lastClass=""; }
    if(r.nature!==lastNature){ body.push([r.segment,"","IV. GRUPO DE ATIVIDADE","",r.company,r.direction,r.nature]); lastNature=r.nature; lastClass=""; }
    if(r.class!==lastClass){ body.push([r.segment,"","V. ATIVIDADE","",r.company,r.direction,r.class]); lastClass=r.class; }
    body.push([r.segment,"","VI. SERVIÇO ARTERIS",r.code,r.company,r.direction,r.resource,r.unit,"",r.unitPrice,"",r.previousQty,r.previousValue,r.previousQty,...r.periods,r.totalQty,r.totalValue,"","","","","","","",r.days.join(", "),r.serialCount]);
  }
  const start=filters.startDate||"", end=filters.endDate||"";
  const aoa:any[][]=[[`PREVISÃO DE MEDIÇÃO SP-255 · LOTE ${lot}`],[`PERÍODO: ${start || "INÍCIO"} A ${end || "FIM"} · EMPRESA: ${filters.companies?.join(" / ") || "TODAS"} · SENTIDO: ${filters.directions?.join(" / ") || "TODOS"}`],headers,...body];
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  const lastCol=XLSX.utils.encode_col(headers.length-1), lastRow=Math.max(3,aoa.length);
  ws["!merges"]=[XLSX.utils.decode_range(`A1:${lastCol}1`),XLSX.utils.decode_range(`A2:${lastCol}2`)];
  ws["!autofilter"]={ref:`A3:${lastCol}${lastRow}`};
  ws["!freeze"]={xSplit:7,ySplit:3,topLeftCell:"H4",activePane:"bottomRight",state:"frozen"};
  ws["!cols"]=[{wch:19},{wch:5},{wch:24},{wch:19},{wch:16},{wch:10},{wch:52},{wch:10},{wch:14},{wch:13},{wch:15},{wch:13},{wch:15},{wch:13},...periods.map(()=>({wch:13})),{wch:16},{wch:16},{wch:14},{wch:15},{wch:21},{wch:15},{wch:15},{wch:18},{wch:20},{wch:28},{wch:10}];
  ws["!rows"]=[{hpt:24},{hpt:20},{hpt:30}];
  for(let c=0;c<headers.length;c++){ styleCell(ws[XLSX.utils.encode_cell({r:2,c})],dark,true,white,"center"); }
  styleCell(ws.A1,dark,true,white,"left"); styleCell(ws.A2,light,true,"173C61","left");
  for(let r=3;r<aoa.length;r++){
    const typ=String(aoa[r]?.[2]||"");
    const fill=typ.startsWith("III.")?navy:typ.startsWith("IV.")?"9FA8AF":typ.startsWith("V.")?grey:undefined;
    const color=typ.startsWith("III.")?white:"000000";
    for(let c=0;c<headers.length;c++) styleCell(ws[XLSX.utils.encode_cell({r,c})],fill,typ!=="VI. SERVIÇO ARTERIS",color,c>=8?"center":"left");
  }
  for(let r=4;r<=lastRow;r++){
    ["J","K","M"].forEach(c=>setNumber(ws,`${c}${r}`,'R$ #,##0.00'));
    // dynamic R$ EXECUTADO column = 15 + periods.length (0-based); convert
    const moneyCols=[14+periods.length+1,14+periods.length+3,14+periods.length+5,14+periods.length+7,14+periods.length+8];
    moneyCols.forEach(ci=>setNumber(ws,`${XLSX.utils.encode_col(ci)}${r}`,'R$ #,##0.00'));
  }
  return ws;
}

function makeDailySheet(executions: Execution[], filters: PreviewFilters) {
  const xs=executions.filter(x=>passes(x,filters)).sort((a,b)=>`${a.date}|${a.location_code}|${displayResource(a)}`.localeCompare(`${b.date}|${b.location_code}|${displayResource(b)}`,"pt-BR"));
  const rows=xs.map(x=>{const c=catalogInfo(x);return {DATA:x.date,MEDICAO:x.measurement,LOTE:x.lot||"",EMPRESA:executionCompany(x),EQUIPE:x.team||"",LOCAL:localLabel(x),SEGMENTO_KM:segment(x),NATUREZA:x.nature||c.group,CLASSE:x.class||c.subgroup,CODIGO:c.code,RECURSO_KARTADO:displayResource(x),QTD:x.quantity,UN:x.unit,VALOR_UNITARIO:executionUnitPrice(x,c.code),VALOR_RECURSO:executionValue(x,c.code),SENTIDO:x.direction,STATUS:x.status,SERIAL_KARTADO:x.serial_kartado,PROGRAMACAO:x.programming,OBSERVACOES:x.notes,LINHA_ORIGEM:x.source_row};});
  const ws=XLSX.utils.json_to_sheet(rows.length?rows:[{STATUS:"SEM DADOS NO FILTRO"}]); ws["!autofilter"]={ref:ws["!ref"]||"A1:U1"}; ws["!cols"]=[12,10,8,14,30,16,24,18,20,17,58,13,10,14,15,10,12,25,35,55,12].map(wch=>({wch})); return ws;
}
function makePendingSheet(executions: Execution[], filters: PreviewFilters) {
  const rows=executions.filter(x=>passes(x,filters)&&(x.mapping_status==="PENDING"||x.classification_status!=="OK")).map(x=>({DATA:x.date,EMPRESA:executionCompany(x),LOCAL:x.location_code||x.front||"",KM_INICIAL:formatKm(x.km_start_m),KM_FINAL:formatKm(x.km_end_m),RECURSO:displayResource(x),MAPEAMENTO:x.mapping_status,CLASSIFICACAO:x.classification_status,MOTIVO:x.mapping_reason||x.classification_reason,SERIAL:x.serial_kartado,PROGRAMACAO:x.programming,OBSERVACOES:x.notes}));
  const ws=XLSX.utils.json_to_sheet(rows.length?rows:[{STATUS:"SEM PENDÊNCIAS"}]); ws["!cols"]=[12,14,12,14,14,60,15,16,55,25,40,55].map(wch=>({wch})); return ws;
}

export function exportMeasurementPreview(executions: Execution[], input?: string | PreviewFilters) {
  const filters=normalizeFilters(input), rows=buildMeasurementRows(executions,filters), wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,makeModelLikeSheet(rows,filters,"2A"),"PREVIA 2A");
  XLSX.utils.book_append_sheet(wb,makeModelLikeSheet(rows,filters,"2B"),"PREVIA 2B");
  XLSX.utils.book_append_sheet(wb,makeDailySheet(executions,filters),"MEMORIA DIARIA");
  XLSX.utils.book_append_sheet(wb,makePendingSheet(executions,filters),"PENDENCIAS");
  const tag=filters.measurement?.replace(/\s+/g,"_")||`${filters.startDate||"INICIO"}_${filters.endDate||"FIM"}`;
  XLSX.writeFile(wb,`SP255_PREVIA_2A_2B_${tag}.xlsx`,{cellStyles:true});
}
