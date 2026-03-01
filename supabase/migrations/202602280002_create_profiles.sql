-- Profiles
-- 기준 문서: supabase-sql-v0.1.md
-- account_status: active / restricted / suspended / banned (rls-policy-spec 기준)
-- gender_benefit_type: standard / female_starter

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique,
  gender text not null check (gender in ('male', 'female', 'other')),
  age_group text not null,
  region text not null,
  role text not null,
  bio text not null,
  points integer not null default 0 check (points >= 0),
  gender_benefit_type text not null default 'standard'
    check (gender_benefit_type in ('standard', 'female_starter')),
  is_adult_checked boolean not null default false,
  adult_checked_at timestamptz,
  account_status text not null default 'active'
    check (account_status in ('active', 'restricted', 'suspended', 'banned')),
  reported_count integer not null default 0 check (reported_count >= 0),
  blocked_count integer not null default 0 check (blocked_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();
