-- =====================================================================
-- Khu vườn trên mây – KHTN 6 · Cơ sở dữ liệu Supabase
-- Chạy toàn bộ file này một lần trong Supabase → SQL Editor → Run.
-- Chạy lại cũng an toàn (các lệnh đều kiểm tra "if not exists").
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Mã lớp 6 kí tự, bỏ các chữ dễ nhầm (O/0, I/1) ----------
create or replace function public.gen_class_code() returns text
language plpgsql security definer set search_path = public as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text;
begin
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from public.classes where code = c);
  end loop;
  return c;
end $$;

-- ---------- Bảng ----------
create table if not exists public.classes (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  code        text not null unique,
  settings    jsonb not null default '{"open":["bai-09"],"mute":false,"growSeconds":60,"aiMode":"approved"}'::jsonb,
  created_at  timestamptz not null default now()
);
alter table public.classes alter column code set default public.gen_class_code();

create table if not exists public.students (
  id            uuid primary key default gen_random_uuid(),
  class_id      uuid not null references public.classes(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 40),
  pics          text[] not null check (array_length(pics, 1) = 3),
  state         jsonb not null default '{}'::jsonb,
  last_seen     timestamptz,
  fails         int not null default 0,
  locked_until  timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists students_class_idx on public.students(class_id);

create table if not exists public.student_sessions (
  token       uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.students(id) on delete cascade,
  expires_at  timestamptz not null
);

create table if not exists public.answers (
  id            bigserial primary key,
  student_id    uuid not null references public.students(id) on delete cascade,
  class_id      uuid not null references public.classes(id) on delete cascade,
  lesson        text not null,
  seed          text,
  question_id   text not null,
  kind          text not null default 'seed',   -- seed | weed
  correct       boolean not null,
  first_try     boolean not null default false,
  misconception text,
  created_at    timestamptz not null default now()
);
create index if not exists answers_class_time_idx on public.answers(class_id, created_at desc);

-- ---------- Bảo mật theo dòng (RLS) ----------
alter table public.classes          enable row level security;
alter table public.students         enable row level security;
alter table public.student_sessions enable row level security;  -- không có policy: chỉ đi qua hàm
alter table public.answers          enable row level security;

drop policy if exists "gv quan ly lop" on public.classes;
create policy "gv quan ly lop" on public.classes
  for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

drop policy if exists "gv quan ly hoc sinh" on public.students;
create policy "gv quan ly hoc sinh" on public.students
  for all to authenticated
  using (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid()))
  with check (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid()));

drop policy if exists "gv xem cau tra loi" on public.answers;
create policy "gv xem cau tra loi" on public.answers
  for select to authenticated
  using (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid()));

-- =====================================================================
-- Hàm cho học sinh (không có tài khoản email, đăng nhập bằng mã lớp + 3 hình)
-- =====================================================================

-- Danh sách tên trong lớp để học sinh bấm chọn
create or replace function public.class_roster(p_code text)
returns table(id uuid, name text, class_name text)
language sql security definer set search_path = public stable as $$
  select s.id, s.name, c.name
  from classes c join students s on s.class_id = c.id
  where c.code = upper(trim(p_code))
  order by s.name;
$$;

-- Đăng nhập: đúng 3 hình theo thứ tự. Sai 5 lần thì khóa 1 phút.
create or replace function public.student_login(p_code text, p_student uuid, p_pics text[])
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s students%rowtype;
  t uuid;
begin
  select s2.* into s from students s2 join classes c on c.id = s2.class_id
   where s2.id = p_student and c.code = upper(trim(p_code));
  if not found then raise exception 'khong_tim_thay'; end if;
  if s.locked_until is not null and s.locked_until > now() then
    raise exception 'tam_khoa';
  end if;
  if s.pics <> p_pics then
    -- trả lỗi bằng giá trị (không raise) để bộ đếm sai được lưu lại
    update students set fails = fails + 1,
      locked_until = case when fails + 1 >= 5 then now() + interval '1 minute' else null end
    where id = s.id;
    return jsonb_build_object('error', 'sai_hinh');
  end if;
  update students set fails = 0, locked_until = null, last_seen = now() where id = s.id;
  delete from student_sessions where expires_at < now();
  insert into student_sessions(student_id, expires_at)
    values (s.id, now() + interval '20 minutes') returning token into t;
  return jsonb_build_object('token', t);
end $$;

-- Kiểm tra phiên, gia hạn thêm 20 phút mỗi lần dùng
create or replace function public._student_from_token(p_token uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  update student_sessions set expires_at = now() + interval '20 minutes'
   where token = p_token and expires_at > now()
   returning student_id into sid;
  if sid is null then raise exception 'het_phien'; end if;
  return sid;
end $$;
revoke all on function public._student_from_token(uuid) from public, anon, authenticated;

create or replace function public.student_load(p_token uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare sid uuid; r jsonb;
begin
  sid := _student_from_token(p_token);
  update students set last_seen = now() where id = sid;
  select jsonb_build_object('id', s.id, 'name', s.name, 'state', s.state,
           'className', c.name, 'settings', c.settings, 'classId', c.id)
    into r from students s join classes c on c.id = s.class_id where s.id = sid;
  return r;
end $$;

create or replace function public.student_save(p_token uuid, p_state jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  sid := _student_from_token(p_token);
  if pg_column_size(p_state) > 200000 then raise exception 'qua_lon'; end if;
  update students set state = p_state, last_seen = now() where id = sid;
end $$;

-- Ghi nhật kí trả lời (nhiều dòng một lần)
create or replace function public.student_log(p_token uuid, p_rows jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare sid uuid; cid uuid;
begin
  sid := _student_from_token(p_token);
  select class_id into cid from students where id = sid;
  if jsonb_array_length(p_rows) > 50 then raise exception 'qua_nhieu'; end if;
  insert into answers(student_id, class_id, lesson, seed, question_id, kind, correct, first_try, misconception)
  select sid, cid, r->>'lesson', r->>'seed', r->>'qid', coalesce(r->>'kind','seed'),
         coalesce((r->>'correct')::boolean, false), coalesce((r->>'firstTry')::boolean, false),
         nullif(r->>'code','')
  from jsonb_array_elements(p_rows) r;
end $$;

create or replace function public.student_logout(p_token uuid)
returns void
language sql security definer set search_path = public as $$
  delete from student_sessions where token = p_token;
$$;

grant execute on function public.class_roster(text)                to anon, authenticated;
grant execute on function public.student_login(text, uuid, text[]) to anon, authenticated;
grant execute on function public.student_load(uuid)                to anon, authenticated;
grant execute on function public.student_save(uuid, jsonb)         to anon, authenticated;
grant execute on function public.student_log(uuid, jsonb)          to anon, authenticated;
grant execute on function public.student_logout(uuid)              to anon, authenticated;

-- =====================================================================
-- Trò chuyện lớp (có lọc từ tục) và bảng xếp hạng
-- =====================================================================
create table if not exists public.chat_messages (
  id          bigserial primary key,
  class_id    uuid not null references public.classes(id) on delete cascade,
  student_id  uuid references public.students(id) on delete cascade,
  name        text not null,
  text        text not null,
  flagged     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists chat_class_time_idx on public.chat_messages(class_id, created_at desc);
alter table public.chat_messages enable row level security;
drop policy if exists "gv xem tro chuyen" on public.chat_messages;
create policy "gv xem tro chuyen" on public.chat_messages
  for select to authenticated
  using (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid()));
drop policy if exists "gv xoa tro chuyen" on public.chat_messages;
create policy "gv xoa tro chuyen" on public.chat_messages
  for delete to authenticated
  using (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid()));

-- Thay từ tục bằng *** (thầy cô thêm từ vào danh sách này nếu cần)
create or replace function public._loc_tu_tuc(p text, out clean text, out flagged boolean)
language plpgsql immutable as $$
declare w text;
  words text[] := array['đụ','địt','đéo','đếch','lồn','buồi','cặc','đĩ','vãi lồn','vcl','vkl','vl','đm','dm','đcm','dcm','đmm','dmm','clm','cl','cc','ngu như','óc chó','con chó','thằng chó','mất dạy','khốn nạn','djt','fuck','shit','bitch'];
begin
  clean := p; flagged := false;
  foreach w in array words loop
    if clean ~* ('(^|[^[:alnum:]])' || w || '($|[^[:alnum:]])') then
      clean := regexp_replace(clean, '(^|[^[:alnum:]])' || w || '($|[^[:alnum:]])', '\1***\2', 'gi');
      flagged := true;
    end if;
  end loop;
end $$;

create or replace function public.student_chat_send(p_token uuid, p_text text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare sid uuid; s students%rowtype; c classes%rowtype; t text; f boolean; r chat_messages%rowtype;
begin
  sid := _student_from_token(p_token);
  select * into s from students where id = sid;
  select * into c from classes where id = s.class_id;
  if coalesce(c.settings->>'chat', 'true') = 'false' then raise exception 'chat_tat'; end if;
  t := left(regexp_replace(trim(coalesce(p_text, '')), '\s+', ' ', 'g'), 120);
  if t = '' then raise exception 'chat_trong'; end if;
  if exists (select 1 from chat_messages where student_id = sid and created_at > now() - interval '3 seconds') then
    raise exception 'chat_nhanh';
  end if;
  select clean, flagged into t, f from _loc_tu_tuc(t);
  insert into chat_messages(class_id, student_id, name, text, flagged)
    values (s.class_id, sid, s.name, t, f) returning * into r;
  return jsonb_build_object('id', r.id, 'sid', sid, 'name', r.name, 'text', r.text, 'at', r.created_at);
end $$;

create or replace function public.student_chat_list(p_token uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare sid uuid; cid uuid; r jsonb;
begin
  sid := _student_from_token(p_token);
  select class_id into cid from students where id = sid;
  select coalesce(jsonb_agg(x order by x.at), '[]'::jsonb) into r from (
    select m.id, m.student_id as sid, m.name, m.text, m.created_at as at
    from chat_messages m where m.class_id = cid order by m.created_at desc limit 40) x;
  return r;
end $$;

-- Điểm mây = hạt giống đã học × 10 + cỏ dại đã tự sửa × 5
create or replace function public.student_leaderboard(p_token uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare sid uuid; cid uuid; r jsonb;
begin
  sid := _student_from_token(p_token);
  select class_id into cid from students where id = sid;
  select coalesce(jsonb_agg(x order by x.score desc, x.name), '[]'::jsonb) into r from (
    select s.name, s.id = sid as me, s.state->'avatar' as avatar,
      (select count(*) from jsonb_each(coalesce(s.state->'seeds', '{}'::jsonb)) e where e.value->>'done' = 'true') as seeds,
      (select count(*) from jsonb_array_elements(case when jsonb_typeof(s.state->'weeds') = 'array' then s.state->'weeds' else '[]'::jsonb end) w where w->>'fixed' = 'true') as fixed,
      0 as score
    from students s where s.class_id = cid) y
  cross join lateral (select y.name, y.me, y.avatar, y.seeds, y.fixed, y.seeds * 10 + y.fixed * 5 as score) x;
  return r;
end $$;

grant execute on function public.student_chat_send(uuid, text)   to anon, authenticated;
grant execute on function public.student_chat_list(uuid)         to anon, authenticated;
grant execute on function public.student_leaderboard(uuid)       to anon, authenticated;
revoke all on function public._loc_tu_tuc(text) from public, anon, authenticated;
