"use client";
import { useMemo, useState } from "react";
import { useExecutions } from "@/components/ExecutionProvider";
import { LOCATIONS, formatKm } from "@/lib/domain";
import { activityRows, displayResource, makeBuckets, overlaps } from "@/lib/retigraph";

function fmt(n: unknown) {
  return typeof n === "number" ? n.toLocaleString("pt-BR", { maximumFractionDigits: 3 }) : String(n ?? "");
}

export default function Retigrafico() {
  const { executions } = useExecutions();
  const [local, setLocal] = useState("C");
  const [med, setMed] = useState("");
  const [dir, setDir] = useState("");
  const [company, setCompany] = useState("");
  const loc = LOCATIONS.find(x => x.code === local)!;

  const measurements = useMemo(() => Array.from(new Set(executions.map(x => x.measurement).filter(Boolean))).sort(), [executions]);
  const companies = useMemo(() => Array.from(new Set(executions.map(x => x.company).filter(Boolean) as string[])).sort(), [executions]);

  const filtered = useMemo(() => executions.filter(x =>
    x.location_code === local &&
    (!med || x.measurement === med) &&
    (!dir || x.direction === dir || x.direction === "AMBOS") &&
    (!company || x.company === company) &&
    ["Executado", "Aprovado", ""].includes(x.status || "")
  ), [executions, local, med, dir, company]);

  const isFront = loc?.type === "FRENTE";
  const buckets = isFront ? makeBuckets(loc.km_start!, loc.km_end!, 100) : [];
  const acts = activityRows(filtered);
  const unrepresented = isFront ? filtered.filter(x => x.km_min_m == null || x.km_max_m == null) : [];

  return <>
    <div className="page-title"><div><h1>Retigráfico</h1><p>Os Recursos do Kartado viram as linhas do retigráfico. Grade oficial de 100 m.</p></div></div>
    <div className="toolbar">
      <select value={local} onChange={e => setLocal(e.target.value)}>{LOCATIONS.map(x => <option key={x.code} value={x.code}>{x.type === "FRENTE" ? `Frente ${x.code}` : x.name}</option>)}</select>
      <select value={med} onChange={e => setMed(e.target.value)}><option value="">Acumulado</option>{measurements.map(m => <option key={m}>{m}</option>)}</select>
      <select value={dir} onChange={e => setDir(e.target.value)}><option value="">Todos sentidos</option><option value="PN">PN</option><option value="PS">PS</option><option value="AMBOS">Ambos</option></select>
      <select value={company} onChange={e => setCompany(e.target.value)}><option value="">Todas empresas</option>{companies.map(c => <option key={c}>{c}</option>)}</select>
      <button className="btn secondary" onClick={() => window.print()}>IMPRIMIR / PDF</button>
      <span className="tiny muted">{filtered.length} recursos executados</span>
    </div>

    {isFront ? <>
      <div className="alert">Frente {loc.code}: {formatKm(loc.km_start)} → {formatKm(loc.km_end)}. Cada linha é um <b>Recurso_N</b> importado da planilha de Apontamentos.</div>
      {unrepresented.length > 0 && <div className="alert"><b>{unrepresented.length} recurso(s) classificados na frente, mas sem KM representável.</b> Eles continuam no Caderno/Conferência e não somem.</div>}
      <div className="ret-wrap"><table className="ret"><thead><tr><th>RECURSO / ITEM</th>{buckets.map(b => <th key={b.start}>{b.label}</th>)}</tr></thead><tbody>{acts.map(a => <tr key={a}><td>{a}</td>{buckets.map(b => {
        const hits = filtered.filter(x => displayResource(x) === a && overlaps(x, b));
        const title = hits.map(x => `${x.date} · ${fmt(x.quantity)} ${x.unit || ""} · ${formatKm(x.km_start_m)}→${formatKm(x.km_end_m)} · ${x.serial_kartado || ""}`).join("\n");
        return <td key={b.start} className={hits.length ? "hit" : ""} title={title}>{hits.length ? "X" : ""}</td>;
      })}</tr>)}</tbody></table>{acts.length === 0 && <div style={{ padding: 20 }} className="muted">Nenhum recurso representado com os filtros atuais.</div>}</div>

      {filtered.length > 0 && <div className="panel"><h2>RESUMO DOS RECURSOS — {loc.name}</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>RECURSO</th><th>QTD.</th><th>UN.</th><th>DIAS</th><th>KM MENOR</th><th>KM MAIOR</th></tr></thead><tbody>{acts.map(a => {
        const xs = filtered.filter(x => displayResource(x) === a);
        const qty = xs.reduce((s, x) => s + (typeof x.quantity === "number" ? x.quantity : 0), 0);
        const days = Array.from(new Set(xs.map(x => x.date))).sort();
        const mins = xs.map(x => x.km_min_m).filter((x): x is number => x != null);
        const maxs = xs.map(x => x.km_max_m).filter((x): x is number => x != null);
        return <tr key={a}><td>{a}</td><td>{fmt(qty)}</td><td>{xs[0]?.unit || ""}</td><td>{days.length}</td><td>{mins.length ? formatKm(Math.min(...mins)) : "-"}</td><td>{maxs.length ? formatKm(Math.max(...maxs)) : "-"}</td></tr>;
      })}</tbody></table></div></div>}
    </> : <div className="device-list">{filtered.map(x => <div className="device-row" key={x.id}><b>{displayResource(x)}</b><div>{x.date} · {fmt(x.quantity)} {x.unit} · {x.direction}</div><div className="tiny muted">KM ref.: {formatKm(x.km_min_m)} · Serial: {x.serial_kartado || "-"} · Programação: {x.programming || "-"}</div></div>)}{filtered.length === 0 && <div className="alert">Nenhum recurso para esta estrutura.</div>}</div>}
  </>;
}
