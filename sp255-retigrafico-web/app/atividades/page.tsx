"use client";
import { useMemo, useState } from "react";
import { ALIASES, CATALOG } from "@/lib/domain";
import { contractUnitPrice } from "@/lib/finance";

function money(n: number | null | undefined) {
  return typeof n === "number" && Number.isFinite(n)
    ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "-";
}

export default function Atividades() {
  const [q, setQ] = useState("");
  const rows = useMemo(() => CATALOG.filter(x => !q || JSON.stringify(x).toLowerCase().includes(q.toLowerCase())), [q]);
  return <>
    <div className="page-title"><div><h1>Catálogo de Atividades</h1><p>Catálogo contratual canônico com código, unidade, empresa e valor unitário por lote.</p></div><span className="badge ok">{CATALOG.length} itens</span></div>
    <div className="toolbar"><input className="input" placeholder="Pesquisar atividade, código..." value={q} onChange={e => setQ(e.target.value)} /><span className="tiny muted">{ALIASES.length} aliases iniciais do Kartado</span></div>
    <div className="panel table-wrap"><table className="data-table"><thead><tr><th>ID</th><th>GRUPO</th><th>SUBGRUPO</th><th>CÓDIGO</th><th>ATIVIDADE CANÔNICA</th><th>UN.</th><th>EMPRESA</th><th>R$ UNIT. 2A</th><th>R$ UNIT. 2B</th></tr></thead><tbody>{rows.slice(0,500).map(x => <tr key={x.id}><td>{x.id}</td><td>{x.group}</td><td>{x.subgroup}</td><td>{x.code}</td><td>{x.name}</td><td>{x.unit}</td><td>{x.companies.join(", ")}</td><td><b>{money(contractUnitPrice("2A", x.code))}</b></td><td><b>{money(contractUnitPrice("2B", x.code))}</b></td></tr>)}</tbody></table></div>
  </>;
}
