-- lif.os Supabase schema (run in Supabase SQL Editor)
-- Variable health data (metrics, meals, workouts, todos) syncs to the cloud.
-- Blood test values and medical reports stay on the device only.

-- ── 1. Row Level Security ────────────────────────────────────────────────
-- Policies use auth.uid() so only the signed-in user can read/write their rows.
-- WARNING: run the DO block below FIRST to drop auto-generated anon policies,
-- otherwise anonymous users can write to your tables.

do $$
declare
  p record;
  t text;
begin
  foreach t in array array['daily_metrics','workouts','meals','todos','profiles']
  loop
    for p in select policyname from pg_policies where schemaname='public' and tablename=t
    loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
  end loop;
end $$;

alter table public.daily_metrics enable row level security;
alter table public.workouts enable row level security;
alter table public.meals enable row level security;
alter table public.todos enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "user owns daily_metrics" on public.daily_metrics;
create policy "user owns daily_metrics"
  on public.daily_metrics for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user owns workouts" on public.workouts;
create policy "user owns workouts"
  on public.workouts for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user owns meals" on public.meals;
create policy "user owns meals"
  on public.meals for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user owns todos" on public.todos;
create policy "user owns todos"
  on public.todos for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- profiles: id is the auth user id
drop policy if exists "user owns profiles" on public.profiles;
create policy "user owns profiles"
  on public.profiles for all
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── 2. Upsert conflict targets ───────────────────────────────────────────
-- daily_metrics upserts on (user_id, metric_date).
alter table public.daily_metrics drop constraint if exists daily_metrics_user_date_unique;
alter table public.daily_metrics
  add constraint daily_metrics_user_date_unique unique (user_id, metric_date);
