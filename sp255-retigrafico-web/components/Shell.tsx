"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Upload, Table2, Map, Link2, ClipboardCheck, FileSpreadsheet, Layers3, SearchCheck } from "lucide-react";
import clsx from "clsx";

const nav = [
  ["/", "Dashboard", BarChart3],
  ["/importar", "Importar Apontamentos", Upload],
  ["/conferencia", "Conferência", ClipboardCheck],
  ["/retigrafico", "Retigráfico", Map],
  ["/consulta", "Consulta Rápida", SearchCheck],
  ["/acumulados", "Acumulados Detalhados", Layers3],
  ["/caderno", "Caderno Diário", Table2],
  ["/previsao", "Prévia Medição", FileSpreadsheet],
  ["/atividades", "Atividades", Link2]
] as const;

export default function Shell({ children }: { children: React.ReactNode }) {
  const p = usePathname();
  return <div className="app"><aside>
    <div className="brand"><div className="vr">VR</div><div><b>VAL ROCHA</b><span>SP-255 Engenharia</span></div></div>
    <nav>{nav.map(([href, label, I]) => <Link key={href} href={href} className={clsx(p === href && "active")}><I size={18} />{label}</Link>)}</nav>
    <div className="sidefoot">Araraquara - Bocaina<br />Kartado → Retigráfico → Medição<br /><b>v0.3.5.1 · Consulta Rápida + Acumulados + Histórico</b></div>
  </aside><main>{children}</main></div>;
}
