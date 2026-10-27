"use client";

import { useId, useState } from "react";
import * as XLSX from "xlsx";

export type MeasurementImportMode = "em_andamento" | "aprovadas";

export type MeasurementImportRequest = {
  mode: MeasurementImportMode;
  file: File;
};

type Props = {
  onImport: (request: MeasurementImportRequest) => Promise<void>;
};

type Option = {
  mode: MeasurementImportMode;
  title: string;
  description: string;
  example: string;
  button: string;
};

const options: Option[] = [
  {
    mode: "em_andamento",
    title: "MED em andamento",
    description: "Apontamentos da medição atual, ainda em conferência. Esta opção não representa aprovação dos lançamentos.",
    example: "Apontamentos (simplificado) - 2026-10-27T135636.144.xlsx",
    button: "Importar MED em andamento",
  },
  {
    mode: "aprovadas",
    title: "Acumulado das medições aprovadas",
    description: "Histórico das medições que já foram aprovadas. A planilha pode reunir várias medições anteriores.",
    example: "Apontamentos (simplificado) - 2026-10-20T172323.452.xlsx",
    button: "Importar medições aprovadas",
  },
];

function normalizeHeader(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

async function validateSpreadsheet(file: File): Promise<number> {
  if (!/\.xlsx$/i.test(file.name)) {
    throw new Error("Selecione uma planilha .xlsx de Apontamentos (simplificado).");
  }
  if (!file.size) throw new Error("O arquivo selecionado está vazio.");

  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  let count = 0;
  let found = false;

  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      blankrows: false,
      defval: "",
    });
    const headerIndex = rows.findIndex(row => {
      const headers = row.map(normalizeHeader);
      return headers.includes("serial") && headers.some(header => /^recurso_\d+$/.test(header));
    });
    if (headerIndex < 0) continue;
    found = true;
    const serialIndex = rows[headerIndex].map(normalizeHeader).indexOf("serial");
    count += rows.slice(headerIndex + 1).filter(row => String(row[serialIndex] ?? "").trim() !== "").length;
  }

  if (!found) throw new Error("Não foram encontradas as colunas Serial e Recurso_N. Selecione a exportação Apontamentos (simplificado).");
  if (!count) throw new Error("A planilha não contém linhas de apontamentos com Serial.");
  return count;
}

function ImportOption({ option, busy, runImport }: {
  option: Option;
  busy: boolean;
  runImport: Props["onImport"];
}) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  async function submit() {
    if (!file || busy || processing) return;
    setProcessing(true);
    setError("");
    setMessage("Validando a planilha…");
    try {
      const count = await validateSpreadsheet(file);
      setMessage(`${count.toLocaleString("pt-BR")} apontamentos identificados. Importando…`);
      await runImport({ mode: option.mode, file });
      setMessage(`Importação concluída: ${option.title}.`);
    } catch (cause) {
      setMessage("");
      setError(cause instanceof Error ? cause.message : "Não foi possível importar a planilha. Tente novamente.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <section className="card flex flex-col gap-4 rounded-xl border border-border bg-background p-6 text-foreground" aria-labelledby={`${inputId}-title`}>
      <div className="space-y-2">
        <h3 id={`${inputId}-title`} className="text-xl font-semibold">{option.title}</h3>
        <p className="text-sm text-muted-foreground">{option.description}</p>
      </div>
      <p className="rounded-lg border border-border bg-muted p-3 text-sm break-words">
        <span className="font-medium">Arquivo indicado: </span>{option.example}
      </p>
      <div className="space-y-2">
        <label htmlFor={inputId} className="block text-sm font-medium">Planilha de apontamentos (.xlsx)</label>
        <input
          id={inputId}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          disabled={busy || processing}
          className="block w-full rounded-md border border-border bg-background p-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-foreground disabled:opacity-50"
          onChange={event => {
            setFile(event.target.files?.[0] ?? null);
            setMessage("");
            setError("");
          }}
        />
      </div>
      <button
        type="button"
        disabled={!file || busy || processing}
        onClick={submit}
        className="mt-auto inline-flex items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {processing ? "Processando…" : option.button}
      </button>
      {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
      {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    </section>
  );
}

export default function MeasurementImportOptions({ onImport }: Props) {
  const [busy, setBusy] = useState(false);

  async function runImport(request: MeasurementImportRequest) {
    setBusy(true);
    try {
      await onImport(request);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 bg-background text-foreground">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Importar apontamentos</h2>
        <p className="text-sm text-muted-foreground">Escolha o destino antes de importar. A data no nome do arquivo não determina se uma medição está aprovada.</p>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {options.map(option => <ImportOption key={option.mode} option={option} busy={busy} runImport={runImport} />)}
      </div>
    </div>
  );
}
