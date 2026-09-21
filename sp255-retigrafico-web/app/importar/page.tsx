"use client";
import { useState } from "react";
import { useExecutions } from "@/components/ExecutionProvider";
import { parseKartadoWorkbook } from "@/lib/import-kartado";
import type { ImportPreview } from "@/lib/types";
import { displayResource } from "@/lib/retigraph";
import { executionCompany, formatKm } from "@/lib/domain";

function fmt(n: unknown) {
  return typeof n === "number" ? n.toLocaleString("pt-BR", { maximumFractionDigits: 3 }) : String(n ?? "");
}

export default function Importar() {
  const { executions, add, reset } = useExecutions();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function handle(file: File) {
    setError("");
    setMsg("Lendo Apontamentos (simplificado)...");
    try {
      if (!file.name.toLowerCase().endsWith(".xlsx")) throw new Error("Envie somente o Excel Apontamentos (simplificado) exportado do Kartado.");
      const p = parseKartadoWorkbook(await file.arrayBuffer(), file.name, executions);
      setPreview(p);
      setMsg(`Prévia pronta: ${p.executions.length} recursos lidos em ${p.sourceRows || 0} apontamentos. ${p.resourceColumns || 0} colunas Recurso_N detectadas.`);
    } catch (e: any) {
      setPreview(null);
      setError(e?.message || "Falha na leitura do Excel.");
      setMsg("");
    }
  }

  return <>
    <div className="page-title"><div><h1>Importar Apontamentos</h1><p>Fonte única: <b>Apontamentos (simplificado).xlsx</b> exportado do Kartado.</p></div></div>

    <div className="drop">
      <b>Selecione a planilha Apontamentos (simplificado)</b>
      <div className="muted tiny">O sistema lê automaticamente Recurso_1, Recurso_2, Recurso_3... sem limite fixo.</div>
      <input type="file" accept=".xlsx" onChange={e => e.target.files?.[0] && handle(e.target.files[0])} />
    </div>

    <div className="toolbar">
      <button className="btn secondary" onClick={() => {
        if (confirm("Limpar todos os dados importados neste navegador?")) { reset(); setPreview(null); setMsg("Base local limpa. Importe novamente o Apontamentos (simplificado)."); }
      }}>LIMPAR BASE / REIMPORTAR</button>
      <span className="tiny muted">{executions.length} recursos atualmente carregados</span>
    </div>

    {msg && <div className="alert success">{msg}</div>}
    {error && <div className="alert bad">{error}</div>}

    {preview && <div className="panel">
      <h2>CONFERÊNCIA DA IMPORTAÇÃO — {preview.sourceName}</h2>
      <div style={{ padding: 12 }}>
        <div className="cards" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
          <div className="card"><div className="k">Recursos lidos</div><div className="v">{preview.executions.length}</div></div>
          <div className="card"><div className="k">Pendente de vínculo</div><div className="v">{preview.pendingMappings.length}</div></div>
          <div className="card"><div className="k">Conflitos/local</div><div className="v">{preview.conflicts.length}</div></div>
          <div className="card"><div className="k">Já existentes / atualizar</div><div className="v">{preview.duplicates.length}</div></div>
        </div>

        <div className="toolbar">
          <button className="btn" onClick={() => {
            add(preview.executions);
            setMsg(`${preview.executions.length} recursos confirmados. Retigráfico, Caderno e Prévia de Medição atualizados.`);
            setPreview(null);
          }}>CONFIRMAR IMPORTAÇÃO</button>
          <button className="btn secondary" onClick={() => setPreview(null)}>CANCELAR</button>
        </div>

        <div className="table-wrap"><table className="data-table"><thead><tr>
          <th>DATA</th><th>RECURSO DO KARTADO</th><th>EMPRESA</th><th>EQUIPE</th><th>LOCAL</th><th>KM</th><th>QTD.</th><th>R$ UNIT.</th><th>R$ RECURSO</th><th>MAPEAMENTO</th><th>CLASSIF.</th>
        </tr></thead><tbody>{preview.executions.map(x => <tr key={x.id}>
          <td>{x.date}</td><td>{displayResource(x)}</td><td>{executionCompany(x)}</td><td>{x.team || "-"}</td><td>{x.location_code || "-"}</td>
          <td>{formatKm(x.km_start_m) || "-"} → {formatKm(x.km_end_m) || "-"}</td>
          <td>{fmt(x.quantity)} {x.unit}</td><td>{x.unit_price != null ? `R$ ${fmt(x.unit_price)}` : "-"}</td><td>{x.resource_value != null ? `R$ ${fmt(x.resource_value)}` : "-"}</td>
          <td><span className={`badge ${x.mapping_status === "MAPPED" ? "ok" : "warn"}`}>{x.mapping_status}</span></td>
          <td title={x.classification_reason || ""}><span className={`badge ${x.classification_status === "OK" ? "ok" : "warn"}`}>{x.classification_status}</span></td>
        </tr>)}</tbody></table></div>
      </div>
    </div>}
  </>;
}
