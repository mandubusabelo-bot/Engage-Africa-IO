-- Runtime settings table
create table if not exists app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Flow run history table
create table if not exists flow_runs (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references flows(id) on delete cascade,
  status text not null default 'running',
  trigger_type text,
  context jsonb,
  summary jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_flow_runs_flow_id_started_at on flow_runs(flow_id, started_at desc);

-- Per-step execution logs
create table if not exists flow_run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references flow_runs(id) on delete cascade,
  step_id text not null,
  step_name text,
  step_type text,
  status text not null,
  result jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_flow_run_steps_run_id on flow_run_steps(run_id);
