create extension if not exists pgcrypto;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null, created_at timestamptz not null default now()
);
create table if not exists locations (
  id uuid primary key default gen_random_uuid(), project_id uuid references projects(id) on delete cascade,
  type text not null check (type in ('FRENTE','DISPOSITIVO','REMODELACAO','OAE')), code text not null,
  name text not null, km_start integer, km_end integer, km_anchor integer, lot text, section text, direction text,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), unique(project_id,code)
);
create table if not exists activity_groups (id uuid primary key default gen_random_uuid(), name text not null unique);
create table if not exists activity_catalog (
  id uuid primary key default gen_random_uuid(), external_id text unique, group_name text, subgroup_name text, nature text, class text,
  contract_code text, contract_name text not null, retigraph_name text not null, unit text, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists activity_aliases (
  id uuid primary key default gen_random_uuid(), activity_id uuid not null references activity_catalog(id) on delete cascade,
  alias text not null, normalized_alias text not null, source text, confidence numeric(5,4), created_at timestamptz not null default now(), unique(normalized_alias,source)
);
create table if not exists measurement_periods (
  id uuid primary key default gen_random_uuid(), code text not null unique, start_date date not null, end_date date not null, active boolean not null default true
);
create table if not exists imports (
  id uuid primary key default gen_random_uuid(), project_id uuid references projects(id), source_type text not null, filename text,
  imported_at timestamptz not null default now(), status text not null default 'PREVIEW', stats jsonb not null default '{}'::jsonb, reverted_at timestamptz
);
create table if not exists source_documents (
  id uuid primary key default gen_random_uuid(), import_id uuid references imports(id) on delete set null, filename text not null, mime_type text,
  storage_path text, sha256 text, created_at timestamptz not null default now()
);
create table if not exists executions (
  id uuid primary key default gen_random_uuid(), project_id uuid references projects(id), import_id uuid references imports(id), source_document_id uuid references source_documents(id),
  data_execucao date not null, medicao_id uuid references measurement_periods(id), activity_id uuid references activity_catalog(id), activity_raw text not null,
  location_id uuid references locations(id), location_raw text, km_inicial integer, km_final integer, km_menor integer, km_maior integer,
  km_inicial_raw text, km_final_raw text, original_orientation text, ramo text, estaca text, local text, sentido text,
  quantidade numeric(20,6), unidade text, comprimento numeric(20,6), largura numeric(20,6), espessura numeric(20,6), area numeric(20,6), volume numeric(20,6),
  origem text, destino text, viagens numeric(20,6), capacidade numeric(20,6), distancia numeric(20,6), serial_kartado text, rdo_numero text,
  natureza text, classe text, empresa text, equipe text, observacao text, status text, confidence numeric(5,4), review_status text default 'OK',
  source_payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists mapping_reviews (
  id uuid primary key default gen_random_uuid(), activity_raw text not null, normalized_raw text not null, suggested_activity_id uuid references activity_catalog(id),
  resolved_activity_id uuid references activity_catalog(id), status text not null default 'PENDING', source text, occurrence_count integer not null default 1,
  created_at timestamptz not null default now(), resolved_at timestamptz
);
create table if not exists validation_alerts (
  id uuid primary key default gen_random_uuid(), execution_id uuid references executions(id) on delete cascade, type text not null, message text not null,
  severity text not null default 'WARNING', resolved boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(), entity_type text not null, entity_id uuid, action text not null, old_value jsonb, new_value jsonb,
  created_at timestamptz not null default now(), actor text
);

create index if not exists idx_exec_date on executions(data_execucao);
create index if not exists idx_exec_location on executions(location_id);
create index if not exists idx_exec_activity on executions(activity_id);
create index if not exists idx_exec_km on executions(km_menor,km_maior);
create index if not exists idx_exec_serial on executions(serial_kartado);
create index if not exists idx_exec_med on executions(medicao_id);
create index if not exists idx_exec_status on executions(status);
create unique index if not exists uq_kartado_resource on executions(serial_kartado,activity_raw,data_execucao,km_inicial,km_final) where serial_kartado is not null;

insert into projects(code,name) values ('SP255','Duplicação SP-255 - Araraquara a Bocaina') on conflict(code) do nothing;
insert into measurement_periods(code,start_date,end_date) values
 ('MED 05','2026-08-11','2026-09-10'),('MED 06','2026-09-11','2026-10-10') on conflict(code) do nothing;
