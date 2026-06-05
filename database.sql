-- Supabase SQL Editor 中执行本文件
-- 作用：创建后台管理系统所需数据表、权限和 RLS 策略

create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  email text not null,
  status text not null default 'active' check (status in ('active', 'pause')),
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner text not null,
  status text not null default '待开始' check (status in ('待开始', '进行中', '已完成')),
  budget numeric not null default 0,
  deadline date not null,
  created_at timestamptz not null default now()
);

alter table public.app_users enable row level security;
alter table public.projects enable row level security;

-- 让 authenticated 角色可以通过 Data API 访问这两张表。
-- 真正能不能看/改数据，还要看下面的 RLS policy。
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.app_users to authenticated;
grant select, insert, update, delete on public.projects to authenticated;

-- 为了重复执行 SQL 时不报“策略已存在”，先删除旧策略。
drop policy if exists "authenticated can read app_users" on public.app_users;
drop policy if exists "authenticated can insert app_users" on public.app_users;
drop policy if exists "authenticated can update app_users" on public.app_users;
drop policy if exists "authenticated can delete app_users" on public.app_users;

drop policy if exists "authenticated can read projects" on public.projects;
drop policy if exists "authenticated can insert projects" on public.projects;
drop policy if exists "authenticated can update projects" on public.projects;
drop policy if exists "authenticated can delete projects" on public.projects;

-- 课程作业 / 演示版策略：只要登录，就可以管理全部数据。
-- 如果后期要做严格权限，需要增加 user_id 字段并改成 auth.uid() 级别的策略。
create policy "authenticated can read app_users"
on public.app_users
for select
to authenticated
using (true);

create policy "authenticated can insert app_users"
on public.app_users
for insert
to authenticated
with check (true);

create policy "authenticated can update app_users"
on public.app_users
for update
to authenticated
using (true)
with check (true);

create policy "authenticated can delete app_users"
on public.app_users
for delete
to authenticated
using (true);

create policy "authenticated can read projects"
on public.projects
for select
to authenticated
using (true);

create policy "authenticated can insert projects"
on public.projects
for insert
to authenticated
with check (true);

create policy "authenticated can update projects"
on public.projects
for update
to authenticated
using (true)
with check (true);

create policy "authenticated can delete projects"
on public.projects
for delete
to authenticated
using (true);

-- 可选：初始化演示数据。也可以登录系统后在“系统设置”里点击“初始化演示数据”。
insert into public.app_users (name, role, email, status) values
('张三', '管理员', 'admin@example.com', 'active'),
('李四', '运营', 'operation@example.com', 'active'),
('王五', '访客', 'guest@example.com', 'pause')
on conflict do nothing;

insert into public.projects (name, owner, status, budget, deadline) values
('官网改版', '张三', '进行中', 8000, '2026-07-10'),
('数据看板', '李四', '待开始', 5200, '2026-07-25'),
('移动端适配', '王五', '已完成', 3600, '2026-06-20')
on conflict do nothing;
