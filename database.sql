-- 学校官网 + 多身份权限后台 Supabase 数据库脚本
-- 使用方法：
-- 1. Supabase SQL Editor 中执行本文件。
-- 2. 到 Authentication -> Users 创建用户账号。
-- 3. 创建用户后，profiles 会自动生成，默认身份为 student。
-- 4. 管理员账号创建后，执行：
--    update public.profiles set role = 'admin', full_name = '学校管理员' where email = '你的管理员邮箱';
-- 5. 教师账号创建后，执行：
--    update public.profiles set role = 'teacher', full_name = '教师姓名' where email = '教师邮箱';

create extension if not exists "pgcrypto";

do $$ begin
  create type public.user_role as enum ('admin', 'teacher', 'student');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.account_status as enum ('active', 'disabled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.publish_status as enum ('draft', 'published');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.review_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role public.user_role not null default 'student',
  status public.account_status not null default 'active',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  major_count integer not null default 0,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text default '学校要闻',
  summary text,
  content text,
  cover_url text,
  status public.publish_status not null default 'draft',
  publish_at date default current_date,
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  status public.publish_status not null default 'draft',
  publish_at date default current_date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  term text,
  credit numeric(4, 1) default 0,
  status public.account_status not null default 'active',
  teacher_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  status public.review_status not null default 'pending',
  reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_departments_updated_at on public.departments;
create trigger trg_departments_updated_at before update on public.departments
for each row execute function public.set_updated_at();

drop trigger if exists trg_news_updated_at on public.news;
create trigger trg_news_updated_at before update on public.news
for each row execute function public.set_updated_at();

drop trigger if exists trg_notices_updated_at on public.notices;
create trigger trg_notices_updated_at before update on public.notices
for each row execute function public.set_updated_at();

drop trigger if exists trg_courses_updated_at on public.courses;
create trigger trg_courses_updated_at before update on public.courses
for each row execute function public.set_updated_at();

drop trigger if exists trg_applications_updated_at on public.student_applications;
create trigger trg_applications_updated_at before update on public.student_applications
for each row execute function public.set_updated_at();

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text
  from public.profiles
  where id = auth.uid() and status = 'active'
  limit 1;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text;
  safe_role public.user_role;
begin
  meta_role := new.raw_user_meta_data ->> 'role';

  if meta_role in ('admin', 'teacher', 'student') then
    safe_role := meta_role::public.user_role;
  else
    safe_role := 'student'::public.user_role;
  end if;

  insert into public.profiles (id, email, full_name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    safe_role,
    'active'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.news enable row level security;
alter table public.notices enable row level security;
alter table public.courses enable row level security;
alter table public.student_applications enable row level security;
alter table public.site_settings enable row level security;

-- 清理旧策略，避免重复执行报错
drop policy if exists "profiles_select_policy" on public.profiles;
drop policy if exists "profiles_admin_update_policy" on public.profiles;
drop policy if exists "departments_select_policy" on public.departments;
drop policy if exists "departments_admin_write_policy" on public.departments;
drop policy if exists "news_select_policy" on public.news;
drop policy if exists "news_insert_policy" on public.news;
drop policy if exists "news_update_policy" on public.news;
drop policy if exists "news_delete_policy" on public.news;
drop policy if exists "notices_select_policy" on public.notices;
drop policy if exists "notices_insert_policy" on public.notices;
drop policy if exists "notices_update_policy" on public.notices;
drop policy if exists "notices_delete_policy" on public.notices;
drop policy if exists "courses_select_policy" on public.courses;
drop policy if exists "courses_insert_policy" on public.courses;
drop policy if exists "courses_update_policy" on public.courses;
drop policy if exists "courses_delete_policy" on public.courses;
drop policy if exists "applications_select_policy" on public.student_applications;
drop policy if exists "applications_insert_policy" on public.student_applications;
drop policy if exists "applications_update_policy" on public.student_applications;
drop policy if exists "applications_delete_policy" on public.student_applications;
drop policy if exists "settings_select_policy" on public.site_settings;
drop policy if exists "settings_admin_write_policy" on public.site_settings;

-- profiles：本人可看自己；教师可看用户列表；管理员可看全部并修改权限
create policy "profiles_select_policy"
on public.profiles for select
using (
  id = auth.uid()
  or public.current_user_role() in ('admin', 'teacher')
);

create policy "profiles_admin_update_policy"
on public.profiles for update
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

-- departments：前台公开可读；仅管理员可写
create policy "departments_select_policy"
on public.departments for select
using (true);

create policy "departments_admin_write_policy"
on public.departments for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

-- news：公开只能看已发布；管理员/教师可看后台内容。教师只能改自己发布的内容，管理员可管理全部。
create policy "news_select_policy"
on public.news for select
using (
  status = 'published'
  or public.current_user_role() in ('admin', 'teacher')
);

create policy "news_insert_policy"
on public.news for insert
with check (
  public.current_user_role() in ('admin', 'teacher')
  and author_id = auth.uid()
);

create policy "news_update_policy"
on public.news for update
using (
  public.current_user_role() = 'admin'
  or (public.current_user_role() = 'teacher' and author_id = auth.uid())
)
with check (
  public.current_user_role() = 'admin'
  or (public.current_user_role() = 'teacher' and author_id = auth.uid())
);

create policy "news_delete_policy"
on public.news for delete
using (
  public.current_user_role() = 'admin'
  or (public.current_user_role() = 'teacher' and author_id = auth.uid())
);

-- notices：公开只能看已发布；管理员/教师可维护。教师只能维护自己创建的通知。
create policy "notices_select_policy"
on public.notices for select
using (
  status = 'published'
  or public.current_user_role() in ('admin', 'teacher')
);

create policy "notices_insert_policy"
on public.notices for insert
with check (
  public.current_user_role() in ('admin', 'teacher')
  and created_by = auth.uid()
);

create policy "notices_update_policy"
on public.notices for update
using (
  public.current_user_role() = 'admin'
  or (public.current_user_role() = 'teacher' and created_by = auth.uid())
)
with check (
  public.current_user_role() = 'admin'
  or (public.current_user_role() = 'teacher' and created_by = auth.uid())
);

create policy "notices_delete_policy"
on public.notices for delete
using (
  public.current_user_role() = 'admin'
  or (public.current_user_role() = 'teacher' and created_by = auth.uid())
);

-- courses：管理员可全部管理；教师可管理自己的课程；学生可读启用课程
create policy "courses_select_policy"
on public.courses for select
using (
  public.current_user_role() = 'admin'
  or teacher_id = auth.uid()
  or (public.current_user_role() = 'student' and status = 'active')
);

create policy "courses_insert_policy"
on public.courses for insert
with check (
  public.current_user_role() in ('admin', 'teacher')
  and teacher_id = auth.uid()
);

create policy "courses_update_policy"
on public.courses for update
using (
  public.current_user_role() = 'admin'
  or (public.current_user_role() = 'teacher' and teacher_id = auth.uid())
)
with check (
  public.current_user_role() = 'admin'
  or (public.current_user_role() = 'teacher' and teacher_id = auth.uid())
);

create policy "courses_delete_policy"
on public.courses for delete
using (
  public.current_user_role() = 'admin'
  or (public.current_user_role() = 'teacher' and teacher_id = auth.uid())
);

-- student_applications：学生只管自己的申请；管理员审核全部
create policy "applications_select_policy"
on public.student_applications for select
using (
  public.current_user_role() = 'admin'
  or applicant_id = auth.uid()
);

create policy "applications_insert_policy"
on public.student_applications for insert
with check (
  public.current_user_role() = 'student'
  and applicant_id = auth.uid()
  and status = 'pending'
  and reply is null
);

create policy "applications_update_policy"
on public.student_applications for update
using (
  public.current_user_role() = 'admin'
  or (public.current_user_role() = 'student' and applicant_id = auth.uid() and status = 'pending')
)
with check (
  public.current_user_role() = 'admin'
  or (
    public.current_user_role() = 'student'
    and applicant_id = auth.uid()
    and status = 'pending'
    and reply is null
  )
);

create policy "applications_delete_policy"
on public.student_applications for delete
using (
  public.current_user_role() = 'admin'
  or (public.current_user_role() = 'student' and applicant_id = auth.uid() and status = 'pending')
);

-- settings：公开可读，管理员可写
create policy "settings_select_policy"
on public.site_settings for select
using (true);

create policy "settings_admin_write_policy"
on public.site_settings for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

grant usage on schema public to anon, authenticated;
grant select on public.departments, public.news, public.notices, public.site_settings to anon;
grant select, insert, update, delete on public.departments, public.news, public.notices, public.courses, public.student_applications, public.site_settings to authenticated;
grant select, update on public.profiles to authenticated;
grant execute on function public.current_user_role() to authenticated, anon;

-- 演示数据：可重复执行
insert into public.departments (name, description, major_count, display_order) values
('智能制造学院', '面向智能制造、自动化控制、工业机器人等领域培养应用型人才。', 8, 1),
('电子信息学院', '覆盖电子信息工程、物联网、软件技术、大数据技术等专业方向。', 10, 2),
('经济管理学院', '建设现代物流、电子商务、财务管理、市场营销等专业群。', 7, 3)
on conflict do nothing;

insert into public.news (title, category, summary, content, status, publish_at) values
('学校召开数字校园建设推进会', '学校要闻', '会议围绕智慧教学、数据治理、校园服务一体化等工作进行部署。', '学校将持续推进数字校园建设，提升教学、管理和服务质量。', 'published', current_date),
('我校学生在创新创业大赛中获奖', '校园动态', '参赛团队围绕绿色校园、智能硬件、数字服务等方向展示项目成果。', '学校将进一步支持学生创新创业实践。', 'published', current_date - interval '3 day'),
('校企合作实训基地正式启用', '产教融合', '基地将为学生提供真实项目训练和岗位能力提升平台。', '校企双方将共同开发课程、开展实训和就业服务。', 'published', current_date - interval '8 day')
on conflict do nothing;

insert into public.notices (title, content, status, publish_at) values
('关于开展期末教学检查的通知', '请各二级学院按要求完成课程材料归档与课堂质量检查。', 'published', current_date),
('2026 年暑期社会实践报名通知', '学生可登录学生入口提交报名申请，学院审核后统一发布结果。', 'published', current_date - interval '1 day')
on conflict do nothing;

insert into public.site_settings (key, value) values
('school_name', '明德职业技术学院'),
('school_slogan', '建设高水平应用型学校，培养面向未来的高素质技术技能人才。')
on conflict (key) do update set value = excluded.value, updated_at = now();
