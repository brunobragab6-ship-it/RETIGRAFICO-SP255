"use client";
import { useExecutions } from "@/components/ExecutionProvider";
import { displayResource } from "@/lib/retigraph";
import { formatKm } from "@/lib/domain";

export default function Conferencia() {
  const { executions } = useExecutions();
  const pend = executions.filter(x => x.mapping_status === "PENDING");
  const conf = executions.filter(x => x.classification_status && x.classification_status !== "OK");
  return <>
    <div className="page-title"><div><h1>Conferência</h1><p>Nenhum Recurso_N é descartado: o que não puder ser vinculado/classificado fica visível aqui.</p></div></div>
    <div className="grid2">
      <div className="panel"><h2>RECURSOS PENDENTES DE VINCULAÇÃO ({pend.length})</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>DATA</th><th>RECURSO RECEBIDO</th><th>QTD.</th><th>LOCAL</th><th>SERIAL</th></tr></thead><tbody>{pend.map(x => <tr key={x.id}><td>{x.date}</td><td>{displayResource(x)}</td><td>{String(x.quantity ?? "")} {x.unit}</td><td>{x.location_code || "-"}</td><td>{x.serial_kartado || "-"}</td></tr>)}</tbody></table>{pend.length === 0 && <div className="alert success">Todos os recursos importados possuem vínculo no catálogo.</div>}</div></div>
      <div className="panel"><h2>CONFLITOS / REVISÃO DE LOCAL ({conf.length})</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>DATA</th><th>RECURSO</th><th>KM</th><th>LOCAL</th><th>STATUS</th><th>MOTIVO</th></tr></thead><tbody>{conf.map(x => <tr key={x.id}><td>{x.date}</td><td>{displayResource(x)}</td><td>{formatKm(x.km_start_m)}→{formatKm(x.km_end_m)}</td><td>{x.location_code || x.front || "-"}</td><td><span className="badge warn">{x.classification_status}</span></td><td>{x.classification_reason}</td></tr>)}</tbody></table>{conf.length === 0 && <div className="alert success">Nenhum conflito de Frente/Local.</div>}</div></div>
    </div>
  </>;
}
