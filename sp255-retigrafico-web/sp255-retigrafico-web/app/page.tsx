"use client";
import { useExecutions } from "@/components/ExecutionProvider";
import { LOCATIONS, formatKm } from "@/lib/domain";

export default function Dashboard() {
  const { executions } = useExecutions();
  const pending = executions.filter(x => x.mapping_status === "PENDING").length;
  const conf = executions.filter(x => x.classification_status && x.classification_status !== "OK").length;
  const dates = executions.map(x => x.date).filter(Boolean).sort();
  const latest = dates.at(-1) || "-";
  const med = executions.filter(x => x.date === latest).at(0)?.measurement || "-";
  const serials = new Set(executions.map(x => x.serial_kartado).filter(Boolean)).size;
  const resources = new Set(executions.map(x => x.resource_raw || x.activity_raw)).size;

  return <>
    <div className="page-title"><div><h1>SP-255 | Acompanhamento das Frentes de Serviço</h1><p>Fonte única: Apontamentos (simplificado) do Kartado.</p></div><span className="badge ok">{med}</span></div>
    <div className="cards">
      <div className="card"><div className="k">Apontamentos Kartado</div><div className="v">{serials}</div></div>
      <div className="card"><div className="k">Recursos importados</div><div className="v">{executions.length}</div></div>
      <div className="card"><div className="k">Recursos distintos</div><div className="v">{resources}</div></div>
      <div className="card"><div className="k">Atividades sem vínculo</div><div className="v">{pending}</div></div>
      <div className="card"><div className="k">Conflitos/local</div><div className="v">{conf}</div></div>
    </div>
    <div className="cards" style={{ marginTop: 12, gridTemplateColumns: "repeat(2,minmax(180px,1fr))" }}>
      <div className="card"><div className="k">Última execução</div><div className="v" style={{ fontSize: 18 }}>{latest}</div></div>
      <div className="card"><div className="k">Medição atual</div><div className="v" style={{ fontSize: 18 }}>{med}</div></div>
    </div>
    <div className="panel"><h2>Frentes de tronco</h2><div className="front-grid" style={{ padding: 14 }}>{LOCATIONS.filter(x => x.type === "FRENTE").map(f => {
      const n = executions.filter(x => x.location_type === "FRENTE" && x.location_code === f.code).length;
      return <div className="front-card" key={f.code}><b>Frente {f.code}</b><div className="tiny muted">{formatKm(f.km_start)} → {formatKm(f.km_end)}</div><div style={{ marginTop: 8 }}>{n} recursos</div></div>;
    })}</div></div>
    <div className="panel"><h2>Estruturas</h2><div className="front-grid" style={{ padding: 14 }}>{LOCATIONS.filter(x => x.type !== "FRENTE").map(f => {
      const n = executions.filter(x => x.location_code === f.code).length;
      return <div className="front-card" key={f.code}><b>{f.code}</b><div className="tiny muted">{f.name}</div><div style={{ marginTop: 8 }}>{n} recursos</div></div>;
    })}</div></div>
  </>;
}
