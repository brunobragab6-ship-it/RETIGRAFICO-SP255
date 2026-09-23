"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Execution, KartadoImportMode } from "@/lib/types";
import { clearExecutions, loadExecutions, saveExecutions, syncKartadoSnapshot } from "@/lib/local-store";

type Ctx = {
  executions: Execution[];
  setExecutions: (x: Execution[]) => void;
  add: (x: Execution[]) => void;
  syncKartado: (x: Execution[], sourceName?: string, scopeMeasurements?: string[], mode?: KartadoImportMode) => void;
  reset: () => void;
};

const C = createContext<Ctx | null>(null);

export function ExecutionProvider({ children }: { children: React.ReactNode }) {
  const [executions, setState] = useState<Execution[]>([]);
  useEffect(() => setState(loadExecutions()), []);

  const setExecutions = (x: Execution[]) => {
    setState(x);
    saveExecutions(x);
  };

  // Usado para lançamento manual: acrescenta sem interferir na fotografia Kartado.
  const add = (inc: Execution[]) => {
    setState(cur => {
      const m = new Map(cur.map(x => [x.id, x]));
      inc.forEach(x => m.set(x.id, x));
      const out = [...m.values()];
      saveExecutions(out);
      return out;
    });
  };

  // Usado exclusivamente no importador Kartado: o novo Excel substitui a fotografia anterior.
  const syncKartado = (snapshot: Execution[], sourceName?: string, scopeMeasurements?: string[], mode: KartadoImportMode = "CURRENT_POINTED") => {
    setState(cur => syncKartadoSnapshot(cur, snapshot, sourceName, scopeMeasurements, mode));
  };

  const reset = () => {
    clearExecutions();
    setState([]);
  };

  const value = useMemo(() => ({ executions, setExecutions, add, syncKartado, reset }), [executions]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useExecutions() {
  const x = useContext(C);
  if (!x) throw new Error("ExecutionProvider ausente");
  return x;
}
