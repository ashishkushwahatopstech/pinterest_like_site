-- Enable Row Level Security and standard extensions
create extension if not exists "uuid-ossp";

-- -------------------------------------------------------------
-- TABLES
-- -------------------------------------------------------------

-- Users Table (Tracks user profile and status)
create table public.users (
  id text primary key, -- Firebase UID
  display_name text,
  email text unique,
  avatar_url text,
  is_admin boolean default false,
  is_suspended boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- User Credentials (Stores encrypted Google OAuth refresh tokens)
-- Locked down: only accessible via service_role (Cloudflare Worker)
create table public.user_credentials (
  user_id text primary key references public.users(id) on delete cascade,
  encrypted_refresh_token text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Boards Table (Pinterest boards mapping 1:1 to Google Drive folders)
create table public.boards (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  name text not null,
  drive_folder_id text not null,
  is_public boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, name)
);

-- Images Table (Tracks uploaded image metadata)
create table public.images (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  board_id uuid references public.boards(id) on delete cascade,
  title text not null,
  description text,
  drive_file_id text not null,
  drive_view_link text not null,
  drive_download_link text not null,
  supabase_storage_path text, -- Backup copy if enabled
  is_public boolean default false,
  likes_count integer default 0 not null,
  views_count integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Likes Table
create table public.likes (
  user_id text not null references public.users(id) on delete cascade,
  image_id uuid not null references public.images(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, image_id)
);

-- Site Settings Table (Key-Value configuration store)
create table public.site_settings (
  key text primary key,
  value jsonb not null
);

-- -------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- -------------------------------------------------------------
alter table public.users enable row level security;
alter table public.user_credentials enable row level security;
alter table public.boards enable row level security;
alter table public.images enable row level security;
alter table public.likes enable row level security;
alter table public.site_settings enable row level security;

-- -------------------------------------------------------------
-- HELPER FUNCTIONS & TRIGGERS
-- -------------------------------------------------------------

-- Helper function to check if the current user is an admin
create or replace function public.check_is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.users
    where id = auth.jwt() ->> 'sub'
      and is_admin = true
      and is_suspended = false
  );
end;
$$ language plpgsql security definer;

-- Helper function to check if the current user is active (not suspended)
create or replace function public.check_is_active()
returns boolean as $$
begin
  -- If we're checking a token and the user row exists, make sure they aren't suspended
  return exists (
    select 1 from public.users
    where id = auth.jwt() ->> 'sub'
      and is_suspended = false
  );
end;
$$ language plpgsql security definer;

-- Trigger to check if new signup is allowed and assign first user as admin
create or replace function public.handle_new_signup()
returns trigger as $$
begin
  -- First user registered automatically becomes admin
  if not exists (select 1 from public.users) then
    new.is_admin := true;
    return new;
  end if;

  -- Verify signups are allowed in site_settings
  if exists (
    select 1 from public.site_settings
    where key = 'allow_signups' and value::jsonb = 'false'::jsonb
  ) then
    raise exception 'Signups are currently disabled by the site administrator.';
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger tr_check_new_signup
  before insert on public.users
  for each row
  execute function public.handle_new_signup();

-- Trigger to protect administrative columns in user updates
create or replace function public.check_user_update()
returns trigger as $$
begin
  -- If the requester is an admin, let them change whatever they want
  if public.check_is_admin() then
    return new;
  end if;
  
  -- Normal users cannot change their is_admin or is_suspended properties
  if (new.is_admin <> old.is_admin) or (new.is_suspended <> old.is_suspended) then
    raise exception 'Only administrators can modify administrative fields.';
  end if;
  
  -- Normal users can only update their own profile details
  if (auth.jwt() ->> 'sub' <> old.id) then
    raise exception 'You can only update your own profile.';
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

create trigger tr_check_user_update
  before update on public.users
  for each row
  execute function public.check_user_update();

-- Increment likes count atomically
create or replace function public.increment_likes(image_uuid uuid)
returns jsonb as $$
declare
  result record;
begin
  update public.images
  set likes_count = likes_count + 1
  where id = image_uuid
  returning id, likes_count into result;
  return row_to_json(result)::jsonb;
end;
$$ language plpgsql security definer;

-- Decrement likes count atomically
create or replace function public.decrement_likes(image_uuid uuid)
returns jsonb as $$
declare
  result record;
begin
  update public.images
  set likes_count = greatest(0, likes_count - 1)
  where id = image_uuid
  returning id, likes_count into result;
  return row_to_json(result)::jsonb;
end;
$$ language plpgsql security definer;

-- Increment views count atomically
create or replace function public.increment_views(image_uuid uuid)
returns jsonb as $$
declare
  result record;
begin
  update public.images
  set views_count = views_count + 1
  where id = image_uuid
  returning id, views_count into result;
  return row_to_json(result)::jsonb;
end;
$$ language plpgsql security definer;


-- -------------------------------------------------------------
-- POLICIES
-- -------------------------------------------------------------

-- Users Policies
create policy "Allow public read users" on public.users
  for select using (true);

create policy "Allow users to insert themselves" on public.users
  for insert with check (auth.jwt() ->> 'sub' = id);

create policy "Allow users or admins to update users" on public.users
  for update using (auth.jwt() ->> 'sub' = id or public.check_is_admin());

-- User Credentials Policies (NONE - locked down to service_role only)

-- Boards Policies
create policy "Read boards" on public.boards
  for select using (is_public = true or auth.jwt() ->> 'sub' = user_id);

create policy "Insert boards" on public.boards
  for insert with check (auth.jwt() ->> 'sub' = user_id and public.check_is_active());

create policy "Update boards" on public.boards
  for update using (auth.jwt() ->> 'sub' = user_id and public.check_is_active());

create policy "Delete boards" on public.boards
  for delete using ((auth.jwt() ->> 'sub' = user_id and public.check_is_active()) or public.check_is_admin());

-- Images Policies
create policy "Read images" on public.images
  for select using (
    is_public = true 
    or user_id = auth.jwt() ->> 'sub'
    or exists (
      select 1 from public.boards 
      where id = board_id and is_public = true
    )
  );

create policy "Insert images" on public.images
  for insert with check (auth.jwt() ->> 'sub' = user_id and public.check_is_active());

create policy "Update images" on public.images
  for update using (auth.jwt() ->> 'sub' = user_id and public.check_is_active());

create policy "Delete images" on public.images
  for delete using ((auth.jwt() ->> 'sub' = user_id and public.check_is_active()) or public.check_is_admin());

-- Likes Policies
create policy "Read likes" on public.likes
  for select using (true);

create policy "Insert likes" on public.likes
  for insert with check (auth.jwt() ->> 'sub' = user_id and public.check_is_active());

create policy "Delete likes" on public.likes
  for delete using (auth.jwt() ->> 'sub' = user_id and public.check_is_active());

-- Site Settings Policies
create policy "Read site settings" on public.site_settings
  for select using (true);

create policy "Admin manage site settings" on public.site_settings
  for all using (public.check_is_admin());
