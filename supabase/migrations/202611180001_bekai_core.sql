-- BEK AI managed backend additions.
-- Safe to apply to an existing Supabase project: does not drop or rewrite profiles/ai_usage.

create extension if not exists pgcrypto;

create table if not exists public.bekai_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Yeni sohbet',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bekai_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.bekai_chats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists bekai_chats_user_updated_idx on public.bekai_chats(user_id, updated_at desc);
create index if not exists bekai_messages_chat_created_idx on public.bekai_messages(chat_id, created_at);

create table if not exists public.bekai_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('website','app','code')),
  files jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bekai_projects_user_updated_idx on public.bekai_projects(user_id, updated_at desc);

create table if not exists public.bekai_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_day date not null default (now() at time zone 'utc')::date,
  message_count integer not null default 0 check (message_count >= 0),
  updated_at timestamptz not null default now(),
  primary key(user_id, usage_day)
);

alter table public.bekai_chats enable row level security;
alter table public.bekai_messages enable row level security;
alter table public.bekai_projects enable row level security;
alter table public.bekai_usage_daily enable row level security;

drop policy if exists "Users manage own chats" on public.bekai_chats;
create policy "Users manage own chats" on public.bekai_chats
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own messages" on public.bekai_messages;
create policy "Users manage own messages" on public.bekai_messages
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own projects" on public.bekai_projects;
create policy "Users manage own projects" on public.bekai_projects
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users read own daily usage" on public.bekai_usage_daily;
create policy "Users read own daily usage" on public.bekai_usage_daily
for select to authenticated using (auth.uid() = user_id);

-- Atomic daily quota reservation. Service-role only; never expose the service key in the browser.
create or replace function public.bekai_reserve_daily_message(p_user_id uuid, p_limit integer default 20)
returns table(allowed boolean, used integer, quota integer)
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  insert into public.bekai_usage_daily(user_id, usage_day, message_count)
  values (p_user_id, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, usage_day)
  do update set message_count = public.bekai_usage_daily.message_count + 1,
                updated_at = now()
  where public.bekai_usage_daily.message_count < greatest(p_limit, 1)
  returning message_count into v_count;

  if v_count is null then
    select d.message_count into v_count
    from public.bekai_usage_daily d
    where d.user_id = p_user_id and d.usage_day = (now() at time zone 'utc')::date;
    return query select false, coalesce(v_count, 0), greatest(p_limit, 1);
  else
    return query select true, v_count, greatest(p_limit, 1);
  end if;
end;
$$;

revoke all on function public.bekai_reserve_daily_message(uuid, integer) from public, anon, authenticated;
grant execute on function public.bekai_reserve_daily_message(uuid, integer) to service_role;

-- Private bucket for reference images and generated project assets.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('bekai-private', 'bekai-private', false, 10485760,
        array['image/png','image/jpeg','image/webp','text/plain','application/zip'])
on conflict (id) do nothing;

drop policy if exists "Users access own BEK AI objects" on storage.objects;
create policy "Users access own BEK AI objects" on storage.objects
for all to authenticated
using (bucket_id = 'bekai-private' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'bekai-private' and (storage.foldername(name))[1] = auth.uid()::text);
