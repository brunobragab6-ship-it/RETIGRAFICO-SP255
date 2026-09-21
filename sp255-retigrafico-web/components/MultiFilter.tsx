"use client";
import { useMemo } from "react";

type Props = {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
};

export default function MultiFilter({ label, options, selected, onChange }: Props) {
  const set = useMemo(() => new Set(selected), [selected]);
  const text = selected.length ? `${label} (${selected.length})` : `${label}: Todas`;
  return <details className="multi-filter">
    <summary>{text}</summary>
    <div className="multi-pop">
      <div className="multi-actions">
        <button type="button" onClick={() => onChange(options)}>Selecionar todas</button>
        <button type="button" onClick={() => onChange([])}>Limpar</button>
      </div>
      {options.map(o => <label key={o} className="multi-option">
        <input type="checkbox" checked={set.has(o)} onChange={e => {
          if (e.target.checked) onChange([...selected, o]);
          else onChange(selected.filter(x => x !== o));
        }} />
        <span>{o || "(Sem informação)"}</span>
      </label>)}
      {!options.length && <div className="tiny muted" style={{ padding: 8 }}>Sem opções.</div>}
    </div>
  </details>;
}
