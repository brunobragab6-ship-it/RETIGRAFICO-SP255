"use client";
import { useMemo, useState } from "react";
import { useExecutions } from "@/components/ExecutionProvider";
import MultiFilter from "@/components/MultiFilter";
import { LOCATIONS, executionCompany, formatKm, measurementForDate, normalizeExecution } from "@/lib/domain";
import { executionUnitPrice, executionValue } from "@/lib/finance";
import { activityRows, displayResource, makeBuckets, overlaps } from "@/lib/retigraph";

function fmt(n: unknown) {
  return typeof n === "number" ? n.toLocaleString("pt-BR", { maximumFractionDigits: 3 }) : String(n ?? "");
}
function money(n: number | null | undefined) {
  return typeof n === "number" && Number.isFinite(n) ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "-";
}
const accepted = (s?: string | null) => ["Executado", "Aprovado", ""].includes(s || "");

export default function Retigrafico() {
  const { executions, add } = useExecutions();
  const [local, setLocal] = useState("C");
  const [med, setMed] = useState("");
  const [dir, setDir] = useState("");
  const [companies, setCompanies] = useState<string[]>([]);
  const [natures, setNatures] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualMsg, setManualMsg] = useState("");
  const [manual, setManual] = useState({ date: new Date().toISOString().slice(0, 10), local: "C", nature: "Terraplenagem", className: "", resource: "", kmStart: "", kmEnd: "", direction: "PN", quantity: "", unit: "m³", unitPrice: "", company: "Val Rocha", notes: "" });
  const loc = LOCATIONS.find(x => x.code === local)!;

  const measurements = useMemo(() => Array.from(new Set(executions.map(x => x.measurement).filter(Boolean))).sort(), [executions]);
  const companyOptions = ["Val Rocha", "Tranenge"];
  const natureOptions = useMemo(() => Array.from(new Set(executions.map(x => String(x.nature || "").trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b,"pt-BR")), [executions]);
  const classOptions = useMemo(() => {
    const base = natures.length ? executions.filter(x => natures.includes(String(x.nature || ""))) : executions;
    return Array.from(new Set(base.map(x => String(x.class || "").trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b,"pt-BR"));
  }, [executions, natures]);

  const filtered = useMemo(() => executions.filter(x =>
    x.location_code === local &&
    (!med || x.measurement === med) &&
    (!dateStart || x.date >= dateStart) &&
    (!dateEnd || x.date <= dateEnd) &&
    (!dir || x.direction === dir || x.direction === "AMBOS") &&
    (!companies.length || companies.includes(executionCompany(x))) &&
    (!natures.length || natures.includes(String(x.nature || ""))) &&
    (!classes.length || classes.includes(String(x.class || ""))) &&
    accepted(x.status)
  ), [executions, local, med, dateStart, dateEnd, dir, companies, natures, classes]);

  const isFront = loc?.type === "FRENTE";
  const buckets = isFront ? makeBuckets(loc.km_start!, loc.km_end!, 100) : [];
  const acts = activityRows(filtered);
  const unrepresented = isFront ? filtered.filter(x => x.km_min_m == null || x.km_max_m == null) : [];

  function saveManual() {
    if (!manual.date || !manual.resource) { setManualMsg("Informe pelo menos Data e Atividade/Recurso."); return; }
    const chosen = LOCATIONS.find(x => x.code === manual.local);
    const ex = normalizeExecution({
      id: `manual-${Date.now()}`,
      date: manual.date,
      measurement: measurementForDate(manual.date),
      activity_raw: manual.resource,
      resource_raw: manual.resource,
      km_start_raw: manual.kmStart || chosen?.km_anchor || null,
      km_end_raw: manual.kmEnd || manual.kmStart || chosen?.km_anchor || null,
      nature: manual.nature,
      class: manual.className,
      direction: manual.direction,
      quantity: manual.quantity ? Number(String(manual.quantity).replace(",", ".")) : null,
      unit: manual.unit,
      unit_price: manual.unitPrice ? Number(String(manual.unitPrice).replace(",", ".")) : null,
      company: manual.company,
      source: "lançamento manual",
      status: "Executado",
      notes: manual.notes,
      front: chosen?.type === "FRENTE" ? chosen.code : null,
      location_type: chosen?.type || null,
      location_code: chosen?.code || null
    });
    add([ex]);
    setManualMsg(`Lançamento manual salvo em ${chosen?.name || manual.local}.`);
    setManual(v => ({ ...v, resource: "", quantity: "", notes: "" }));
  }

  return <>
    <div className="page-title"><div><h1>Retigráfico</h1><p>Recursos do Kartado por KM, com filtros múltiplos, valores financeiros e lançamento manual.</p></div></div>
    <div className="toolbar filter-line">
      <select value={local} onChange={e => setLocal(e.target.value)}>{LOCATIONS.map(x => <option key={x.code} value={x.code}>{x.type === "FRENTE" ? `Frente ${x.code}` : x.name}</option>)}</select>
      <select value={med} onChange={e => setMed(e.target.value)}><option value="">Acumulado</option>{measurements.map(m => <option key={m}>{m}</option>)}</select>
      <label className="filter-label">De <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} /></label>
      <label className="filter-label">Até <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} /></label>
      <select value={dir} onChange={e => setDir(e.target.value)}><option value="">Todos sentidos</option><option value="PN">PN</option><option value="PS">PS</option><option value="AMBOS">Ambos</option></select>
      <MultiFilter label="Empresas" options={companyOptions} selected={companies} onChange={setCompanies} />
      <MultiFilter label="Naturezas" options={natureOptions} selected={natures} onChange={v => { setNatures(v); setClasses([]); }} />
      <MultiFilter label="Classes" options={classOptions} selected={classes} onChange={setClasses} />
      <button className="btn secondary" onClick={() => window.print()}>IMPRIMIR / PDF</button>
      <button className="btn" onClick={() => setManualOpen(v => !v)}>{manualOpen ? "FECHAR MANUAL" : "MODO MANUAL"}</button>
      <span className="tiny muted">{filtered.length} recursos executados</span>
    </div>

    {manualOpen && <div className="manual-panel">
      <b>LANÇAMENTO MANUAL DO RETIGRÁFICO</b>
      <div className="subtle-note">Use quando precisar registrar um avanço que ainda não veio no Kartado. O lançamento fica salvo junto à base local e pode ser filtrado normalmente.</div>
      <div className="manual-grid" style={{ marginTop: 10 }}>
        <label>Data<input className="input" type="date" value={manual.date} onChange={e => setManual({ ...manual, date: e.target.value })} /></label>
        <label>Frente / Estrutura<select value={manual.local} onChange={e => setManual({ ...manual, local: e.target.value })}>{LOCATIONS.map(x => <option key={x.code} value={x.code}>{x.type === "FRENTE" ? `Frente ${x.code}` : x.name}</option>)}</select></label>
        <label>Natureza<input className="input" value={manual.nature} onChange={e => setManual({ ...manual, nature: e.target.value })} /></label>
        <label>Classe<input className="input" value={manual.className} onChange={e => setManual({ ...manual, className: e.target.value })} /></label>
        <label className="wide">Atividade / Recurso<input className="input" value={manual.resource} onChange={e => setManual({ ...manual, resource: e.target.value })} placeholder="Ex.: Compactação de aterro a 95% do proctor normal" /></label>
        <label>KM inicial<input className="input" value={manual.kmStart} onChange={e => setManual({ ...manual, kmStart: e.target.value })} placeholder="108+500" /></label>
        <label>KM final<input className="input" value={manual.kmEnd} onChange={e => setManual({ ...manual, kmEnd: e.target.value })} placeholder="109+000" /></label>
        <label>Sentido<select value={manual.direction} onChange={e => setManual({ ...manual, direction: e.target.value })}><option>PN</option><option>PS</option><option>AMBOS</option></select></label>
        <label>Empresa<select value={manual.company} onChange={e => setManual({ ...manual, company: e.target.value })}><option>Val Rocha</option><option>Tranenge</option></select></label>
        <label>Quantidade<input className="input" value={manual.quantity} onChange={e => setManual({ ...manual, quantity: e.target.value })} /></label>
        <label>Unidade<input className="input" value={manual.unit} onChange={e => setManual({ ...manual, unit: e.target.value })} /></label>
        <label>R$ unitário<input className="input" value={manual.unitPrice} onChange={e => setManual({ ...manual, unitPrice: e.target.value })} /></label>
        <label className="wide">Observações<input className="input" value={manual.notes} onChange={e => setManual({ ...manual, notes: e.target.value })} /></label>
      </div>
      <div className="toolbar"><button className="btn" onClick={saveManual}>SALVAR NO RETIGRÁFICO</button>{manualMsg && <span className="tiny">{manualMsg}</span>}</div>
    </div>}

    {isFront ? <>
      <div className="alert">Frente {loc.code}: {formatKm(loc.km_start)} → {formatKm(loc.km_end)}. Uma célula fica marcada quando qualquer parte do trecho executado cruza o intervalo de 100 m.</div>
      {unrepresented.length > 0 && <div className="alert"><b>{unrepresented.length} recurso(s) sem KM linear.</b> Eles aparecem na lista “Execuções não lineares” abaixo, inclusive compactações de Ramo/Dispositivo quando não houver trecho linear.</div>}
      <div className="ret-wrap"><table className="ret"><thead><tr><th>RECURSO / ITEM</th><th className="qty-col">QTD.</th><th className="money-col">R$ UNIT.</th><th className="money-col">R$ EXEC.</th>{buckets.map(b => <th key={b.start}>{b.label}</th>)}</tr></thead><tbody>{acts.map(a => {
        const xs = filtered.filter(x => displayResource(x) === a);
        const qty = xs.reduce((s, x) => s + (typeof x.quantity === "number" ? x.quantity : 0), 0);
        const totalValue = xs.reduce((s, x) => s + executionValue(x), 0);
        const unitPrice = qty ? totalValue / qty : executionUnitPrice(xs[0]);
        return <tr key={a}><td>{a}</td><td className="qty-col">{fmt(qty)} {xs[0]?.unit || ""}</td><td className="money-col">{money(unitPrice)}</td><td className="money-col"><b>{money(totalValue)}</b></td>{buckets.map(b => {
          const hits = xs.filter(x => overlaps(x, b));
          const title = hits.map(x => `${x.date} · ${executionCompany(x)} · ${fmt(x.quantity)} ${x.unit || ""} · ${money(executionValue(x))} · ${formatKm(x.km_start_m)}→${formatKm(x.km_end_m)} · ${x.serial_kartado || "MANUAL"}`).join("\n");
          return <td key={b.start} className={hits.length ? "hit" : ""} title={title}>{hits.length ? "X" : ""}</td>;
        })}</tr>;
      })}</tbody></table>{acts.length === 0 && <div style={{ padding: 20 }} className="muted">Nenhum recurso representado com os filtros atuais.</div>}</div>

      {unrepresented.length > 0 && <div className="panel"><h2>EXECUÇÕES NÃO LINEARES / SEM KM REPRESENTÁVEL</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>DATA</th><th>RECURSO</th><th>NATUREZA</th><th>CLASSE</th><th>LOCAL/PROGRAMAÇÃO</th><th>QTD.</th><th>R$ UNIT.</th><th>R$ EXEC.</th><th>EMPRESA</th></tr></thead><tbody>{unrepresented.map(x => <tr key={x.id}><td>{x.date}</td><td>{displayResource(x)}</td><td>{x.nature}</td><td>{x.class}</td><td>{x.ramo_local || x.programming || x.location_code}</td><td>{fmt(x.quantity)} {x.unit}</td><td>{money(executionUnitPrice(x))}</td><td>{money(executionValue(x))}</td><td>{executionCompany(x)}</td></tr>)}</tbody></table></div></div>}

      {filtered.length > 0 && <div className="panel"><h2>RESUMO DOS RECURSOS — {loc.name}</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>RECURSO</th><th>NATUREZA</th><th>CLASSE</th><th>QTD.</th><th>UN.</th><th>R$ UNIT. MÉDIO</th><th>R$ EXECUTADO</th><th>DIAS</th><th>KM MENOR</th><th>KM MAIOR</th></tr></thead><tbody>{acts.map(a => {
        const xs = filtered.filter(x => displayResource(x) === a);
        const qty = xs.reduce((s, x) => s + (typeof x.quantity === "number" ? x.quantity : 0), 0);
        const value = xs.reduce((s, x) => s + executionValue(x), 0);
        const days = Array.from(new Set(xs.map(x => x.date))).sort();
        const mins = xs.map(x => x.km_min_m).filter((x): x is number => x != null);
        const maxs = xs.map(x => x.km_max_m).filter((x): x is number => x != null);
        return <tr key={a}><td>{a}</td><td>{xs[0]?.nature || ""}</td><td>{xs[0]?.class || ""}</td><td>{fmt(qty)}</td><td>{xs[0]?.unit || ""}</td><td>{money(qty ? value / qty : executionUnitPrice(xs[0]))}</td><td><b>{money(value)}</b></td><td>{days.length}</td><td>{mins.length ? formatKm(Math.min(...mins)) : "-"}</td><td>{maxs.length ? formatKm(Math.max(...maxs)) : "-"}</td></tr>;
      })}</tbody></table></div></div>}
    </> : <div className="device-list">{filtered.map(x => <div className="device-row" key={x.id}><b>{displayResource(x)}</b><div>{x.date} · {fmt(x.quantity)} {x.unit} · {x.direction} · <b>{money(executionValue(x))}</b></div><div className="tiny muted">R$ unit.: {money(executionUnitPrice(x))} · Empresa: {executionCompany(x)} · KM ref.: {formatKm(x.km_min_m)} · Serial: {x.serial_kartado || "MANUAL"} · Programação: {x.programming || "-"}</div></div>)}{filtered.length === 0 && <div className="alert">Nenhum recurso para esta estrutura com os filtros atuais.</div>}</div>}
  </>;
}
