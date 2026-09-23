import locationsData from "@/data/locations.json";
import catalogData from "@/data/activity-catalog.json";
import aliasData from "@/data/activity-aliases.json";
import type { ActivityAlias, ActivityCatalogItem, Direction, Execution, Location } from "./types";

export const LOCATIONS = locationsData as Location[];
export const CATALOG = catalogData as ActivityCatalogItem[];
export const ALIASES = aliasData as ActivityAlias[];

const catalogById = new Map(CATALOG.map(x => [x.id, x]));

export function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[ªº]/g, "")
    .replace(/[³²·]/g, " ")
    .replace(/\(\s*\*\s*\)/g, "")
    .replace(/\s*\((?:m3|m2|m³|m²|m3\s*[x·]\s*km|m³\s*[x·]\s*km|kg|un|vb|dm3|dm³|m)\)\s*$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeActivityKey(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\(\s*\*\s*\)/g, " STAR ")
    .replace(/[ªº]/g, "")
    .replace(/[³²·]/g, " ")
    .replace(/\s*\((?:m3|m2|m³|m²|m3\s*[x·]\s*km|m³\s*[x·]\s*km|kg|un|vb|dm3|dm³|m)\)\s*$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const aliasByExact = new Map<string, string>();
const looseBuckets = new Map<string, Set<string>>();
function registerActivityName(name: string, id: string) {
  aliasByExact.set(normalizeActivityKey(name), id);
  const loose = normalizeText(name);
  if (!looseBuckets.has(loose)) looseBuckets.set(loose, new Set());
  looseBuckets.get(loose)!.add(id);
}
for (const a of ALIASES) registerActivityName(a.alias, a.activity_id);
for (const x of CATALOG) registerActivityName(x.name, x.id);

export function parseKm(input: unknown): number | null {
  if (input === null || input === undefined || input === "") return null;
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    if (input >= 1000) return Math.round(input);
    const whole = Math.trunc(input);
    const dec = Math.abs(input - whole);
    return whole * 1000 + Math.round(dec * 1000);
  }
  const raw = String(input).trim().replace(/\s/g, "");
  const p = raw.match(/^(\d{1,3})\+(\d{1,3})$/);
  if (p) return Number(p[1]) * 1000 + Number(p[2].padStart(3, "0"));
  const s = raw.replace(",", ".");
  if (/^\d+(?:\.\d+)?$/.test(s)) {
    const [a, b = ""] = s.split(".");
    if (Number(a) >= 1000 && !b) return Number(a);
    return Number(a) * 1000 + (b ? Number(b.padEnd(3, "0").slice(0, 3)) : 0);
  }
  return null;
}

export function formatKm(m: number | null | undefined) {
  if (m == null || !Number.isFinite(m)) return "";
  const k = Math.floor(m / 1000);
  const mm = Math.round(m - k * 1000);
  return `${String(k).padStart(3, "0")}+${String(mm).padStart(3, "0")}`;
}

export function executionCompany(ex: Pick<Execution, "team" | "company">) {
  const team = normalizeText(ex.team);
  if (team === normalizeText("EQUIPE 1 TRANENGE - E")) return "Tranenge";
  // Regra da obra: toda equipe diferente da Equipe 1 TRANENGE - E é Val Rocha.
  // Para lançamento manual sem equipe, respeita apenas empresa explícita simples.
  if (!team && normalizeText(ex.company) === "tranenge") return "Tranenge";
  return "Val Rocha";
}

export function normalizeDirection(input: unknown): Direction {
  const s = normalizeText(input);
  if (!s) return null;
  if (s === "ambos" || s === "ambas" || s.includes("ambos sentidos")) return "AMBOS";
  if (s === "pn" || s === "n" || s.includes("norte")) return "PN";
  if (s === "ps" || s === "s" || s.includes("sul")) return "PS";
  return null;
}

export function measurementForDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.getDate(), y = d.getFullYear(), m = d.getMonth() + 1;
  const sm = day >= 11 ? m : (m === 1 ? 12 : m - 1);
  const sy = day >= 11 ? y : (m === 1 ? y - 1 : y);
  const med = 5 + ((sy * 12 + sm) - (2026 * 12 + 8));
  return `MED ${String(med).padStart(2, "0")}`;
}


export function measurementNumber(med: string) {
  return Number(String(med || "").match(/\d+/)?.[0] || 0);
}

export function measurementStatus(med: string, today = new Date()) {
  const p = measurementPeriod(med);
  if (!p) return "SEM PERÍODO";
  const iso = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  if (iso < p.start) return "FUTURA";
  if (iso > p.end) return "FECHADA";
  return "EM ANDAMENTO";
}

export function availableMeasurements(from = 1, to = 12) {
  return Array.from({length: Math.max(0, to-from+1)}, (_,i)=>`MED ${String(from+i).padStart(2,"0")}`);
}

export function measurementPeriod(med: string) {
  const n = Number(String(med).match(/\d+/)?.[0] ?? 0);
  if (!n) return null;
  const offset = n - 5;
  const start = new Date(2026, 7 + offset, 11, 12, 0, 0);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 10, 12, 0, 0);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start: iso(start), end: iso(end) };
}

export function measurementWeeks(med: string) {
  const p = measurementPeriod(med);
  if (!p) return [] as { label: string; start: string; end: string }[];
  const s = new Date(`${p.start}T12:00:00`);
  const mk = (startDay: number, startMonthOffset: number, endDay: number, endMonthOffset: number) => {
    const a = new Date(s.getFullYear(), s.getMonth() + startMonthOffset, startDay, 12);
    const b = new Date(s.getFullYear(), s.getMonth() + endMonthOffset, endDay, 12);
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const br = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { label: `${br(a)}-${br(b)}`, start: iso(a), end: iso(b) };
  };
  return [mk(11, 0, 21, 0), mk(22, 0, 28, 0), mk(29, 0, 4, 1), mk(5, 1, 10, 1)];
}

export function mapActivity(raw: string) {
  // Primeiro respeita o texto exato normalizado, inclusive o marcador contratual (*).
  const exactId = aliasByExact.get(normalizeActivityKey(raw));
  if (exactId) {
    const x = catalogById.get(exactId);
    return { activity_id: exactId, activity_name: x?.name ?? raw, status: "MAPPED" as const };
  }

  // Fallback só é automático quando o texto simplificado aponta para UM único item.
  const ids = looseBuckets.get(normalizeText(raw));
  if (ids && ids.size === 1) {
    const id = Array.from(ids)[0];
    const x = catalogById.get(id);
    return { activity_id: id, activity_name: x?.name ?? raw, status: "MAPPED" as const };
  }
  return {
    activity_id: null,
    activity_name: null,
    status: "PENDING" as const,
    reason: ids && ids.size > 1 ? "ATIVIDADE AMBÍGUA: exige vínculo manual" : "ATIVIDADE PENDENTE DE VINCULAÇÃO"
  };
}

function kmTokens(text: string) {
  const out: number[] = [];
  const rx = /\b(\d{2,3})\s*[+.,]\s*(\d{1,3})\b/g;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(text))) out.push(Number(m[1]) * 1000 + Number(m[2].padEnd(3, "0").slice(0, 3)));
  return out;
}

function explicitFront(text: string) {
  const m = text.match(/FRENTE\s*[-:]?\s*([A-J])\b/i);
  if (m) return m[1].toUpperCase();
  for (const f of LOCATIONS.filter(x => x.type === "FRENTE" && x.km_start != null && x.km_end != null)) {
    const a = formatKm(f.km_start), b = formatKm(f.km_end);
    if (text.includes(a) && text.includes(b)) return f.code;
  }
  return null;
}

function locationByCode(code: string) {
  return LOCATIONS.find(x => x.code.toUpperCase() === code.toUpperCase()) ?? null;
}

function explicitStructure(textRaw: string, direction: Direction) {
  const text = String(textRaw || "");
  const norm = normalizeText(text);
  if (!norm) return null;

  // Código explícito sempre vence: D5, R4 etc.
  const codeMatch = text.match(/\b(D[1-7]|R[1-5])\b/i);
  if (codeMatch) {
    const found = locationByCode(codeMatch[1].toUpperCase());
    if (found) return found;
  }

  const kms = kmTokens(text);
  const wantsDevice = /\bdispositivo\b/i.test(text) || /\bdisp\.?\b/i.test(text);
  const wantsRemodel = /remodela[cç][aã]o/i.test(text);
  const wantsOae = /\boae\b/i.test(text) || /obra\s+de\s+arte\s+especial/i.test(norm);
  if (!wantsDevice && !wantsRemodel && !wantsOae) return null;

  let candidates = LOCATIONS.filter(x => x.type !== "FRENTE" && x.km_anchor != null);
  // "Remodelação do Dispositivo" contém a palavra dispositivo, mas é uma REMODELAÇÃO.
  if (wantsRemodel) candidates = candidates.filter(x => x.type === "REMODELACAO");
  else if (wantsOae) candidates = candidates.filter(x => x.type === "OAE");
  else if (wantsDevice) candidates = candidates.filter(x => x.type === "DISPOSITIVO");

  for (const km of kms) {
    const exact = candidates.filter(x => x.km_anchor === km);
    if (exact.length === 1) return exact[0];
    if (exact.length > 1 && direction) {
      const byDir = exact.find(x => !x.direction || x.direction === direction);
      if (byDir) return byDir;
    }
  }
  return null;
}

function frontForKm(km: number) {
  const fs = LOCATIONS.filter(x => x.type === "FRENTE" && x.km_start != null && x.km_end != null);
  for (const f of fs) if (km >= f.km_start! && km < f.km_end!) return f;
  const last = fs[fs.length - 1];
  return last && km === last.km_end ? last : null;
}

export function classifyLocation(ex: Execution): Execution {
  const a = parseKm(ex.km_start_raw), b = parseKm(ex.km_end_raw);
  const min = a != null && b != null ? Math.min(a, b) : (a ?? b);
  const max = a != null && b != null ? Math.max(a, b) : (a ?? b);
  const orientation = a == null || b == null || a === b ? "POINT" : a < b ? "ASC" : "DESC";
  const dir = normalizeDirection(ex.direction);

  // Programação do Kartado é evidência de localização e deve ter prioridade.
  const evidence = [ex.programming, ex.notes, ex.ramo_local].filter(Boolean).join(" | ");
  const structure = explicitStructure(evidence, dir);
  const explicit = ex.front?.toUpperCase() || explicitFront(evidence);
  const calc = min != null ? frontForKm(min) : null;

  let lt = ex.location_type ?? null;
  let lc = ex.location_code ?? null;
  let status: Execution["classification_status"] = "OK";
  let reason: string | null = null;

  if (ex.location_type && ex.location_code) {
    lt = ex.location_type;
    lc = ex.location_code;
    reason = `Local informado explicitamente no lançamento: ${ex.location_code}`;
  } else if (structure) {
    lt = structure.type;
    lc = structure.code;
    reason = `Local explícito reconhecido em Programação/Observações: ${structure.name}`;
  } else if (explicit) {
    lt = "FRENTE";
    lc = explicit;
    if (calc && calc.code !== explicit) {
      status = "CONFLICT";
      reason = `Frente informada ${explicit} diferente da calculada pelo KM (${calc.code})`;
    } else reason = `Frente explícita reconhecida: ${explicit}`;
  } else if (calc) {
    lt = "FRENTE";
    lc = calc.code;
    reason = `Frente calculada pelo KM: ${calc.code}`;
  } else {
    status = min != null ? "NO_FRONT" : "REVIEW";
    reason = min != null ? "KM fora das frentes de tronco cadastradas" : "Sem KM/Frente suficiente para classificação";
  }

  const loc = lc ? LOCATIONS.find(x => x.code === lc) : null;
  const inferredLot = loc?.lot ?? (loc?.km_anchor != null ? (loc.km_anchor < 117380 ? "2A" : "2B") : ex.lot ?? null);

  return {
    ...ex,
    direction: dir,
    km_start_m: a,
    km_end_m: b,
    km_min_m: min,
    km_max_m: max,
    original_orientation: orientation,
    front: lt === "FRENTE" ? lc : null,
    location_type: lt,
    location_code: lc,
    classification_status: status,
    classification_reason: reason,
    lot: inferredLot
  };
}


export function inferDataKind(ex: Pick<Execution, "id" | "source" | "measurement" | "data_kind">): Execution["data_kind"] {
  if (ex.data_kind) return ex.data_kind;
  const id = String(ex.id || "").toLowerCase();
  const source = String(ex.source || "").toLowerCase();
  if (id.startsWith("manual-") || source.includes("lançamento manual") || source.includes("lancamento manual")) return "MANUAL";
  // Migração automática das versões antigas: MED 01–05 já encerradas entram como histórico;
  // medições posteriores entram como fotografia corrente até serem reimportadas como aprovadas.
  return measurementNumber(ex.measurement) > 0 && measurementNumber(ex.measurement) <= 5 ? "APPROVED_HISTORY" : "CURRENT_POINTED";
}

export function normalizeExecution(ex: Execution): Execution {
  const m = mapActivity(ex.activity_raw);
  return classifyLocation({
    ...ex,
    company: executionCompany(ex),
    measurement: ex.measurement || measurementForDate(ex.date),
    data_kind: inferDataKind({ ...ex, measurement: ex.measurement || measurementForDate(ex.date) }),
    activity_id: ex.activity_id ?? m.activity_id,
    activity_name: ex.activity_name ?? m.activity_name,
    mapping_status: ex.activity_id ? "MAPPED" : m.status,
    mapping_reason: m.reason ?? null
  });
}
