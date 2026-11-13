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

-- Bảng xếp hạng: hạt giống × 10 + cỏ dại đã tự sửa × 5 + nhà đã xây × 15 + cỏ quảng trường × 5
create or replace function public.student_leaderboard(p_token uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare sid uuid; cid uuid; r jsonb;
begin
  sid := _student_from_token(p_token);
  select class_id into cid from students where id = sid;
  select coalesce(jsonb_agg(x order by x.score desc, x.name), '[]'::jsonb) into r from (
    select s.name, s.id = sid as me, s.state->'avatar' as avatar,
      (select count(*) from jsonb_each(case when jsonb_typeof(s.state->'seeds') = 'object' then s.state->'seeds' else '{}'::jsonb end) e where e.value->>'done' = 'true') as seeds,
      (select count(*) from jsonb_array_elements(case when jsonb_typeof(s.state->'weeds') = 'array' then s.state->'weeds' else '[]'::jsonb end) w where w->>'fixed' = 'true') as fixed,
      (case when jsonb_typeof(s.state->'houses') = 'array' then jsonb_array_length(s.state->'houses') else 0 end) as houses,
      coalesce((s.state->'plaza'->>'cleared')::int, 0) as plaza
    from students s where s.class_id = cid) y
  cross join lateral (select y.name, y.me, y.avatar, y.seeds, y.fixed, y.houses, y.plaza, y.seeds * 10 + y.fixed * 5 + y.houses * 15 + y.plaza * 5 as score) x;
  return r;
end $$;
grant execute on function public.student_leaderboard(uuid) to anon, authenticated;

-- =====================================================================
-- Quản trị: admin tổng là hothanhthuy309@gmail.com
-- =====================================================================
create table if not exists public.app_admins (
  email     text primary key check (email = lower(email)),
  role      text not null default 'phu' check (role in ('tong', 'phu')),
  added_at  timestamptz not null default now()
);
insert into public.app_admins(email, role) values ('hothanhthuy309@gmail.com', 'tong')
  on conflict (email) do update set role = 'tong';
alter table public.app_admins enable row level security;

create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from app_admins where email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
create or replace function public._is_admin_tong() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from app_admins where email = lower(coalesce(auth.jwt() ->> 'email', '')) and role = 'tong');
$$;
grant execute on function public.is_admin() to authenticated;
revoke all on function public._is_admin_tong() from public, anon;
grant execute on function public._is_admin_tong() to authenticated;

drop policy if exists "admin xem ds admin" on public.app_admins;
create policy "admin xem ds admin" on public.app_admins for select to authenticated using (public.is_admin());

drop policy if exists "admin xem lop" on public.classes;
create policy "admin xem lop" on public.classes for select to authenticated using (public.is_admin());
drop policy if exists "admin xem hoc sinh" on public.students;
create policy "admin xem hoc sinh" on public.students for select to authenticated using (public.is_admin());
drop policy if exists "admin xem cau tra loi" on public.answers;
create policy "admin xem cau tra loi" on public.answers for select to authenticated using (public.is_admin());

create or replace function public.am_i_admin() returns boolean
language sql security definer set search_path = public stable as $$ select public.is_admin(); $$;
grant execute on function public.am_i_admin() to authenticated;

create or replace function public.admin_overview() returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'khong_phai_admin'; end if;
  select jsonb_build_object(
    'teachers', coalesce((select jsonb_agg(t order by t.classes desc) from (
        select coalesce(u.email, c.teacher_id::text) as email, count(distinct c.id) as classes, count(s.id) as students
        from classes c left join auth.users u on u.id = c.teacher_id left join students s on s.class_id = c.id
        group by 1) t), '[]'::jsonb),
    'totals', jsonb_build_object('teachers', (select count(distinct teacher_id) from classes), 'classes', (select count(*) from classes), 'students', (select count(*) from students)))
  into r;
  return r;
end $$;
grant execute on function public.admin_overview() to authenticated;

create or replace function public.admin_add(p_email text, p_role text default 'phu') returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public._is_admin_tong() then raise exception 'khong_phai_admin'; end if;
  insert into app_admins(email, role) values (lower(trim(p_email)), case when p_role = 'tong' then 'tong' else 'phu' end)
    on conflict (email) do update set role = excluded.role;
end $$;
create or replace function public.admin_remove(p_email text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public._is_admin_tong() then raise exception 'khong_phai_admin'; end if;
  if lower(p_email) = 'hothanhthuy309@gmail.com' then raise exception 'khong_phai_admin'; end if;
  delete from app_admins where email = lower(p_email);
end $$;
grant execute on function public.admin_add(text, text) to authenticated;
grant execute on function public.admin_remove(text) to authenticated;

-- Cài đặt chung (dòng bản quyền, thông báo trang đầu): ai cũng đọc được, chỉ admin sửa
create table if not exists public.app_settings (
  key    text primary key,
  value  jsonb,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
drop policy if exists "ai cung doc cai dat" on public.app_settings;
create policy "ai cung doc cai dat" on public.app_settings for select to anon, authenticated using (true);
drop policy if exists "admin sua cai dat" on public.app_settings;
create policy "admin sua cai dat" on public.app_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.app_settings to anon;

-- Bộ câu hỏi riêng của thầy cô
create table if not exists public.question_sets (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  questions   jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);
alter table public.question_sets enable row level security;
drop policy if exists "gv quan ly bo cau hoi" on public.question_sets;
create policy "gv quan ly bo cau hoi" on public.question_sets for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- =====================================================================
-- Tí Nị AI: giới hạn số lần hỏi mỗi ngày cho mỗi học sinh (api/tini.js gọi hàm này)
-- =====================================================================
create table if not exists public.tini_usage (
  student_id uuid not null references public.students(id) on delete cascade,
  day        date not null default current_date,
  n          int not null default 0,
  primary key (student_id, day)
);
alter table public.tini_usage enable row level security;

drop function if exists public.student_tini_quota(uuid, int);
create or replace function public.student_tini_quota(p_token uuid, p_limit int default 30, p_kind text default 'ai')
returns jsonb
language plpgsql security definer set search_path = public as $$
declare sid uuid; mode text; used int;
begin
  sid := _student_from_token(p_token);
  select coalesce(c.settings->>'aiMode', 'approved') into mode from students s join classes c on c.id = s.class_id where s.id = sid;
  if mode <> 'ai' and p_kind <> 'tts' then return jsonb_build_object('ok', false, 'reason', 'ai_tat'); end if; -- giọng đọc Ông Kể Chuyện luôn dùng được
  insert into tini_usage(student_id, day, n) values (sid, current_date, 1)
    on conflict (student_id, day) do update set n = tini_usage.n + 1 returning n into used;
  if used > least(greatest(p_limit, 1), 60) then return jsonb_build_object('ok', false, 'reason', 'het_luot'); end if;
  return jsonb_build_object('ok', true, 'left', least(greatest(p_limit, 1), 60) - used);
end $$;
grant execute on function public.student_tini_quota(uuid, int, text) to anon, authenticated;

-- =====================================================================
-- Trò chơi cả lớp: Hack Mật Mã Mây và Đua khinh khí cầu.
-- Máy chủ làm trọng tài (giống js/gamelogic.js): đáp án đúng không bao giờ gửi cho học sinh.
-- =====================================================================
create table if not exists public.game_rooms (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references public.classes(id) on delete cascade,
  teacher_id   uuid not null default auth.uid(),
  kind         text not null check (kind in ('hack', 'race')),
  status       text not null default 'lobby' check (status in ('lobby', 'play', 'end')),
  duration     int not null check (duration between 60 and 3600),
  review_only  boolean not null default false,
  questions    jsonb not null,
  puzzles      jsonb not null default '[]'::jsonb,
  feed         jsonb not null default '[]'::jsonb,
  stats        jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  started_at   timestamptz,
  ended_at     timestamptz
);
create index if not exists game_rooms_class_idx on public.game_rooms(class_id, created_at desc);
create table if not exists public.game_players (
  room_id     uuid not null references public.game_rooms(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  name        text not null,
  crystals    int not null default 0,
  alt         int not null default 0,
  shield      boolean not null default false,
  hacked      int not null default 0,
  last_round  int not null default -1,
  last_gain   int not null default 0,
  box         jsonb,
  hack        jsonb,
  right_n     int not null default 0,
  wrong_n     int not null default 0,
  primary key (room_id, student_id)
);
alter table public.game_rooms enable row level security;
alter table public.game_players enable row level security;
drop policy if exists "gv xem phong choi" on public.game_rooms;
create policy "gv xem phong choi" on public.game_rooms for select to authenticated
  using (exists (select 1 from classes c where c.id = class_id and c.teacher_id = auth.uid()));
drop policy if exists "gv xem nguoi choi" on public.game_players;
create policy "gv xem nguoi choi" on public.game_players for select to authenticated
  using (exists (select 1 from game_rooms r join classes c on c.id = r.class_id where r.id = room_id and c.teacher_id = auth.uid()));

create or replace function public._ms(t timestamptz) returns bigint language sql immutable as $$ select (extract(epoch from t) * 1000)::bigint $$;
create or replace function public._g_tick(p_room uuid) returns void
language sql security definer set search_path = public as $$
  update game_rooms set status = 'end', ended_at = now()
   where id = p_room and status = 'play' and now() >= started_at + make_interval(secs => duration);
$$;
create or replace function public._g_round(r game_rooms) returns int language sql stable as $$
  select case when r.started_at is null then -1 else floor(extract(epoch from now() - r.started_at) / 20)::int end $$;
create or replace function public._g_round_left(r game_rooms) returns numeric language sql stable as $$
  select case when r.started_at is null then 20 else 20 - mod(extract(epoch from now() - r.started_at)::numeric, 20) end $$;
create or replace function public._g_time_left(r game_rooms) returns numeric language sql stable as $$
  select case when r.started_at is null then r.duration else greatest(0, r.duration - extract(epoch from now() - r.started_at)::numeric) end $$;
create or replace function public._g_qi(r game_rooms) returns int language sql stable as $$
  select (( public._g_round(r) % jsonb_array_length(r.questions)) + jsonb_array_length(r.questions)) % jsonb_array_length(r.questions) $$;
create or replace function public._g_box(p_review boolean) returns text language plpgsql volatile as $$
declare x numeric := random();
begin
  if p_review then  -- ôn tập: không có hack, không có gió
    if x < 3.0/7 then return 'crystal'; elsif x < 5.0/7 then return 'double'; else return 'shield'; end if;
  end if;
  if x < 3.0/11 then return 'crystal'; elsif x < 5.0/11 then return 'double'; elsif x < 7.0/11 then return 'shield';
  elsif x < 8.0/11 then return 'wind'; else return 'hack'; end if;
end $$;
create or replace function public._g_board(p_room uuid, p_kind text) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', student_id, 'name', name, 'crystals', crystals, 'alt', alt, 'shield', shield, 'hacked', hacked, 'right', right_n, 'wrong', wrong_n)
    order by case when p_kind = 'race' then alt else crystals end desc, name), '[]'::jsonb)
  from game_players where room_id = p_room $$;
create or replace function public._g_hack_view(r game_rooms, hk jsonb) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'targets', (select coalesce(jsonb_agg(jsonb_build_object('id', t.v, 'name', coalesce(p.name, '?')) order by t.o), '[]'::jsonb)
                from jsonb_array_elements_text(hk->'targets') with ordinality t(v, o) left join game_players p on p.room_id = r.id and p.student_id = t.v::uuid),
    'puzzle', jsonb_build_object('prompt', r.puzzles->((hk->>'pz')::int)->>'prompt',
                'items', (select jsonb_agg(r.puzzles->((hk->>'pz')::int)->'items'->(e.v::int) order by e.o) from jsonb_array_elements_text(hk->'perm') with ordinality e(v, o))),
    'deadline', (hk->>'deadline')::bigint) $$;
create or replace function public._g_feed(p_room uuid, p_text text) returns void language sql security definer set search_path = public as $$
  update game_rooms set feed = (case when jsonb_array_length(feed) > 40 then feed - 0 else feed end) || jsonb_build_array(jsonb_build_object('t', public._ms(now()), 'text', p_text)) where id = p_room $$;
revoke all on function public._g_tick(uuid), public._g_board(uuid, text), public._g_hack_view(game_rooms, jsonb), public._g_feed(uuid, text) from public, anon, authenticated;

-- ----- thầy cô -----
create or replace function public._g_mine_room(p_room uuid) returns game_rooms
language plpgsql security definer set search_path = public as $$
declare r game_rooms;
begin
  select * into r from game_rooms where id = p_room;
  if r.id is null or not exists (select 1 from classes c where c.id = r.class_id and c.teacher_id = auth.uid()) then raise exception 'khong_co_quyen'; end if;
  return r;
end $$;
revoke all on function public._g_mine_room(uuid) from public, anon;

create or replace function public.game_create(p_class uuid, p_kind text, p_minutes int, p_review boolean, p_questions jsonb, p_puzzles jsonb default '[]'::jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
  if not exists (select 1 from classes where id = p_class and teacher_id = auth.uid()) then raise exception 'khong_co_quyen'; end if;
  if jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) < 3 then raise exception 'it_cau_hoi'; end if;
  update game_rooms set status = 'end', ended_at = now() where class_id = p_class and status <> 'end';
  insert into game_rooms(class_id, teacher_id, kind, duration, review_only, questions, puzzles)
    values (p_class, auth.uid(), p_kind, least(greatest(coalesce(p_minutes, 10), 1), 60) * 60, coalesce(p_review, false) or p_kind = 'race', p_questions, coalesce(p_puzzles, '[]'::jsonb))
    returning id into rid;
  return rid;
end $$;
create or replace function public.game_start(p_room uuid) returns void language plpgsql security definer set search_path = public as $$
begin perform _g_mine_room(p_room);
  update game_rooms set status = 'play', started_at = now() where id = p_room and status = 'lobby';
  perform _g_feed(p_room, 'Trò chơi bắt đầu!');
end $$;
create or replace function public.game_end(p_room uuid) returns void language plpgsql security definer set search_path = public as $$
begin perform _g_mine_room(p_room); update game_rooms set status = 'end', ended_at = now() where id = p_room and status <> 'end'; end $$;
create or replace function public.game_teacher_state(p_room uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare r game_rooms; qi int; q jsonb; answered int;
begin
  perform _g_mine_room(p_room); perform _g_tick(p_room);
  select * into r from game_rooms where id = p_room;
  qi := _g_qi(r); q := r.questions->qi;
  select count(*) into answered from game_players where room_id = p_room and last_round = _g_round(r);
  return jsonb_build_object(
    'room', jsonb_build_object('id', r.id, 'kind', r.kind, 'status', r.status, 'review_only', r.review_only, 'round', _g_round(r), 'roundLeft', _g_round_left(r), 'timeLeft', _g_time_left(r), 'duration', r.duration),
    'q', case when r.status = 'play' then jsonb_build_object('prompt', q->'prompt', 'options', q->'options', 'correct', q->'correct', 'answered', answered) end,
    'players', _g_board(p_room, r.kind),
    'feed', (select coalesce(jsonb_agg(f order by o desc), '[]'::jsonb) from (select f, o from jsonb_array_elements(r.feed) with ordinality x(f, o) order by o desc limit 12) z),
    'missed', (select coalesce(jsonb_agg(jsonb_build_object('prompt', r.questions->(k::int)->'prompt', 'wrong', (v->>'wrong')::int, 'right', (v->>'right')::int) order by (v->>'wrong')::int desc), '[]'::jsonb)
               from (select k, v from jsonb_each(r.stats) s(k, v) where (v->>'wrong')::int > 0 order by (v->>'wrong')::int desc limit 3) m));
end $$;
grant execute on function public.game_create(uuid, text, int, boolean, jsonb, jsonb), public.game_start(uuid), public.game_end(uuid), public.game_teacher_state(uuid) to authenticated;

-- ----- học sinh -----
create or replace function public.student_game_active(p_token uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare sid uuid; rid uuid;
begin
  sid := _student_from_token(p_token);
  select r.id into rid from game_rooms r join students s on s.class_id = r.class_id
   where s.id = sid and r.status <> 'end' order by r.created_at desc limit 1;
  if rid is not null then perform _g_tick(rid); select id into rid from game_rooms where id = rid and status <> 'end'; end if;
  return rid;
end $$;

create or replace function public.game_mine(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare sid uuid; st students; r game_rooms; p game_players; qi int; q jsonb; rnd int;
begin
  sid := _student_from_token(p_token);
  select * into st from students where id = sid;
  select * into r from game_rooms where class_id = st.class_id and (status <> 'end' or ended_at > now() - interval '90 seconds') order by created_at desc limit 1;
  if r.id is null then return null; end if;
  perform _g_tick(r.id); select * into r from game_rooms where id = r.id;
  if r.status <> 'end' then insert into game_players(room_id, student_id, name) values (r.id, sid, st.name) on conflict do nothing; end if;
  update game_players set hack = null where room_id = r.id and student_id = sid and hack is not null and (hack->>'deadline')::bigint < _ms(now());
  select * into p from game_players where room_id = r.id and student_id = sid;
  rnd := _g_round(r); qi := _g_qi(r); q := r.questions->qi;
  return jsonb_build_object(
    'room', jsonb_build_object('id', r.id, 'kind', r.kind, 'status', r.status, 'review_only', r.review_only, 'round', rnd, 'roundLeft', _g_round_left(r), 'timeLeft', _g_time_left(r),
                               'players', (select count(*) from game_players where room_id = r.id)),
    'q', case when r.status = 'play' then jsonb_build_object('prompt', q->'prompt', 'options', q->'options', 'level', q->'level', 'round', rnd) end,
    'me', case when p.student_id is not null then jsonb_build_object('name', p.name, 'crystals', p.crystals, 'alt', p.alt, 'shield', p.shield, 'hacked', p.hacked,
            'answered', p.last_round = rnd, 'box', case when p.box is null then 0 else jsonb_array_length(p.box) end,
            'hack', case when p.hack is null then null else _g_hack_view(r, p.hack) end) end,
    'top', case when r.status = 'end' then (select coalesce(jsonb_agg(e order by o), '[]'::jsonb) from jsonb_array_elements(_g_board(r.id, r.kind)) with ordinality x(e, o) where o <= 3) end);
end $$;

create or replace function public.game_answer(p_token uuid, p_room uuid, p_round int, p_choice int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare sid uuid; r game_rooms; p game_players; rnd int; qi int; q jsonb; ok boolean; gain int := 0; fast int; v_box jsonb := null; k text;
begin
  sid := _student_from_token(p_token);
  perform _g_tick(p_room);
  select * into r from game_rooms where id = p_room for update;
  select * into p from game_players where room_id = p_room and student_id = sid for update;
  if p.student_id is null then raise exception 'chua_vao'; end if;
  if r.status <> 'play' then raise exception 'het_gio'; end if;
  rnd := _g_round(r);
  if p_round <> rnd then raise exception 'het_luot'; end if;
  if p.last_round = rnd then raise exception 'da_tra_loi'; end if;
  qi := _g_qi(r); q := r.questions->qi;
  ok := p_choice = (q->>'correct')::int;
  k := qi::text;
  update game_rooms set stats = jsonb_set(stats, array[k], jsonb_build_object(
      'right', coalesce((stats->k->>'right')::int, 0) + case when ok then 1 else 0 end,
      'wrong', coalesce((stats->k->>'wrong')::int, 0) + case when ok then 0 else 1 end)) where id = p_room;
  if ok then
    if r.kind = 'race' then fast := case when _g_round_left(r) > 12 then 5 else 0 end; gain := 10 + fast;
    else gain := case when q->>'level' = 'vandung' then 15 else 10 end; v_box := jsonb_build_array(_g_box(r.review_only), _g_box(r.review_only), _g_box(r.review_only)); end if;
  end if;
  update game_players set last_round = rnd, last_gain = gain,
      right_n = right_n + case when ok then 1 else 0 end, wrong_n = wrong_n + case when ok then 0 else 1 end,
      crystals = crystals + case when r.kind = 'race' then 0 else gain end, alt = alt + case when r.kind = 'race' then gain else 0 end,
      box = coalesce(v_box, game_players.box)
   where room_id = p_room and student_id = sid returning * into p;
  return jsonb_build_object('correct', ok, 'correctIndex', (q->>'correct')::int, 'explain', coalesce(q->>'explain', ''), 'gain', gain, 'crystals', p.crystals, 'alt', p.alt, 'box', p.box is not null);
end $$;

create or replace function public.game_pick_box(p_token uuid, p_room uuid, p_idx int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare sid uuid; r game_rooms; p game_players; allb jsonb; kind text; amount int := 0; tg jsonb; pz int; n int; perm int[]; i int; j int; tmp int; hk jsonb; dl bigint;
begin
  sid := _student_from_token(p_token);
  select * into r from game_rooms where id = p_room;
  select * into p from game_players where room_id = p_room and student_id = sid for update;
  if p.student_id is null or p.box is null then raise exception 'khong_co_hop'; end if;
  allb := p.box; kind := allb->>least(greatest(coalesce(p_idx, 0), 0), 2);
  update game_players set box = null where room_id = p_room and student_id = sid;
  if kind = 'crystal' then amount := 5 + floor(random() * 8)::int; update game_players set crystals = crystals + amount where room_id = p_room and student_id = sid;
  elsif kind = 'double' then amount := p.last_gain; update game_players set crystals = crystals + amount where room_id = p_room and student_id = sid;
  elsif kind = 'shield' then update game_players set shield = true where room_id = p_room and student_id = sid;
  elsif kind = 'wind' then amount := least(p.crystals, greatest(1, ceil(p.crystals * 0.05)::int)); update game_players set crystals = crystals - amount where room_id = p_room and student_id = sid;
  elsif kind = 'hack' then
    select jsonb_agg(student_id) into tg from (select student_id from game_players where room_id = p_room and student_id <> sid and hacked < 3 order by random() limit 3) t;
    if tg is null or jsonb_array_length(r.puzzles) = 0 then
      kind := 'crystal'; amount := 8; update game_players set crystals = crystals + 8 where room_id = p_room and student_id = sid;
    else
      pz := floor(random() * jsonb_array_length(r.puzzles))::int; n := jsonb_array_length(r.puzzles->pz->'items');
      perm := array(select generate_series(0, n - 1));
      for i in reverse n..2 loop j := 1 + floor(random() * i)::int; tmp := perm[i]; perm[i] := perm[j]; perm[j] := tmp; end loop;
      if n > 1 and perm = array(select generate_series(0, n - 1)) then tmp := perm[1]; perm[1] := perm[2]; perm[2] := tmp; end if;
      dl := _ms(now()) + 12000;
      hk := jsonb_build_object('targets', tg, 'pz', pz, 'perm', to_jsonb(perm), 'deadline', dl);
      update game_players set hack = hk where room_id = p_room and student_id = sid;
    end if;
  end if;
  select * into p from game_players where room_id = p_room and student_id = sid;
  return jsonb_build_object('kind', kind, 'amount', amount, 'crystals', p.crystals, 'all', allb, 'hack', case when hk is null then null else _g_hack_view(r, hk) end);
end $$;

create or replace function public.game_hack(p_token uuid, p_room uuid, p_target uuid, p_order int[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare sid uuid; r game_rooms; p game_players; t game_players; hk jsonb; pzj jsonb; n int; ok boolean := true; k int; stolen int;
begin
  sid := _student_from_token(p_token);
  select * into r from game_rooms where id = p_room;
  select * into p from game_players where room_id = p_room and student_id = sid for update;
  if p.student_id is null or p.hack is null then raise exception 'khong_co_hack'; end if;
  hk := p.hack; update game_players set hack = null where room_id = p_room and student_id = sid;
  if not (hk->'targets') ? p_target::text then raise exception 'sai_muc_tieu'; end if;
  pzj := r.puzzles->((hk->>'pz')::int); n := jsonb_array_length(pzj->'items');
  if r.status <> 'play' or _ms(now()) > (hk->>'deadline')::bigint or p_order is null or coalesce(array_length(p_order, 1), 0) <> n then ok := false;
  else
    for k in 1..n loop
      if p_order[k] is null or p_order[k] < 0 or p_order[k] >= n or (hk->'perm'->>p_order[k])::int <> k - 1 then ok := false; exit; end if;
    end loop;
  end if;
  if not ok then return jsonb_build_object('ok', false, 'explain', pzj->>'explain', 'answer', pzj->'items', 'crystals', p.crystals); end if;
  select * into t from game_players where room_id = p_room and student_id = p_target for update;
  if t.shield then
    update game_players set shield = false where room_id = p_room and student_id = p_target;
    perform _g_feed(p_room, 'Một khiên bông vừa chặn được một lần đột nhập!');
    return jsonb_build_object('ok', true, 'blocked', true, 'explain', pzj->>'explain', 'crystals', p.crystals);
  end if;
  stolen := least(25, floor(t.crystals * 0.2)::int);
  update game_players set crystals = crystals - stolen, hacked = hacked + 1 where room_id = p_room and student_id = p_target;
  update game_players set crystals = crystals + stolen where room_id = p_room and student_id = sid returning * into p;
  perform _g_feed(p_room, 'Một két vừa bị đột nhập!');
  return jsonb_build_object('ok', true, 'stolen', stolen, 'crystals', p.crystals, 'explain', pzj->>'explain');
end $$;
grant execute on function public.student_game_active(uuid), public.game_mine(uuid), public.game_answer(uuid, uuid, int, int), public.game_pick_box(uuid, uuid, int), public.game_hack(uuid, uuid, uuid, int[]) to anon, authenticated;

-- =====================================================================
-- Bản 4: mã lớp dễ nhớ (6A1-AB) và mật khẩu chung của lớp
-- Học sinh đăng nhập: mã lớp → chọn tên → mật khẩu chung (hoặc mật khẩu riêng nếu em đã đổi)
-- =====================================================================
alter table public.classes  add column if not exists class_pw text not null default lpad(floor(random() * 10000)::text, 4, '0');
alter table public.students add column if not exists pw_hash text;
alter table public.students add column if not exists has_pw boolean generated always as (pw_hash is not null) stored;

create or replace function public._code_norm(t text) returns text language sql immutable as $$
  select upper(regexp_replace(coalesce(t, ''), '[^A-Za-z0-9]', '', 'g')) $$;

create or replace function public._class_code_from_name(p_name text) returns text
language plpgsql security definer set search_path = public as $$
declare base text; c text; letters text := 'ABCDEFGHKLMNPQRSTUVXYZ';
begin
  base := left(_code_norm(regexp_replace(coalesce(p_name, ''), '^\s*(lớp|lop)\s*', '', 'i')), 8);
  if base = '' then base := 'LOP'; end if;
  loop
    c := base || '-' || substr(letters, 1 + floor(random() * 22)::int, 1) || substr(letters, 1 + floor(random() * 22)::int, 1);
    exit when not exists (select 1 from classes where _code_norm(code) = _code_norm(c));
  end loop;
  return c;
end $$;

create or replace function public._classes_set_code() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then new.code := public._class_code_from_name(new.name); end if;
  return new;
end $$;
drop trigger if exists classes_set_code on public.classes;
create trigger classes_set_code before insert on public.classes for each row execute function public._classes_set_code();

create or replace function public.class_roster(p_code text)
returns table(id uuid, name text, class_name text)
language sql security definer set search_path = public stable as $$
  select s.id, s.name, c.name from classes c join students s on s.class_id = c.id
  where _code_norm(c.code) = _code_norm(p_code) order by s.name;
$$;

create or replace function public.student_login_pw(p_code text, p_student uuid, p_pw text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s students%rowtype; c classes%rowtype; t uuid; ok boolean;
begin
  select s2.* into s from students s2 join classes c2 on c2.id = s2.class_id
   where s2.id = p_student and _code_norm(c2.code) = _code_norm(p_code);
  if not found then raise exception 'khong_tim_thay'; end if;
  select * into c from classes where id = s.class_id;
  if s.locked_until is not null and s.locked_until > now() then raise exception 'tam_khoa'; end if;
  ok := case when s.pw_hash is not null then s.pw_hash = crypt(coalesce(p_pw, ''), s.pw_hash) else trim(coalesce(p_pw, '')) = c.class_pw end;
  if not ok then
    update students set fails = fails + 1, locked_until = case when fails + 1 >= 5 then now() + interval '1 minute' else null end where id = s.id;
    return jsonb_build_object('error', 'sai_mat_khau');
  end if;
  update students set fails = 0, locked_until = null, last_seen = now() where id = s.id;
  delete from student_sessions where expires_at < now();
  insert into student_sessions(student_id, expires_at) values (s.id, now() + interval '20 minutes') returning token into t;
  return jsonb_build_object('token', t, 'choose', s.pw_hash is null);
end $$;

create or replace function public.student_set_password(p_token uuid, p_pw text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare sid uuid;
begin
  sid := _student_from_token(p_token);
  if char_length(trim(coalesce(p_pw, ''))) < 4 then raise exception 'mat_khau_ngan'; end if;
  update students set pw_hash = crypt(trim(p_pw), gen_salt('bf')) where id = sid;
end $$;
grant execute on function public.student_login_pw(text, uuid, text) to anon, authenticated;
grant execute on function public.student_set_password(uuid, text) to anon, authenticated;
update public.classes set code = public._class_code_from_name(name) where position('-' in code) = 0;  -- đổi mã cũ sang dạng 6A1-AB

-- Bản 4.2: đăng nhập kiểu cũ (3 hình) cũng nhận mã lớp có hoặc không có dấu "-"
create or replace function public.student_login(p_code text, p_student uuid, p_pics text[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare s students%rowtype; t uuid;
begin
  select s2.* into s from students s2 join classes c on c.id = s2.class_id where s2.id = p_student and _code_norm(c.code) = _code_norm(p_code);
  if not found then raise exception 'khong_tim_thay'; end if;
  if s.locked_until is not null and s.locked_until > now() then raise exception 'tam_khoa'; end if;
  if s.pics <> p_pics then
    update students set fails = fails + 1, locked_until = case when fails + 1 >= 5 then now() + interval '1 minute' else null end where id = s.id;
    return jsonb_build_object('error', 'sai_hinh');
  end if;
  update students set fails = 0, locked_until = null, last_seen = now() where id = s.id;
  insert into student_sessions(student_id, expires_at) values (s.id, now() + interval '20 minutes') returning token into t;
  return jsonb_build_object('token', t);
end $$;

-- Bản 4.6: kho giọng đọc tạo sẵn cho Ông Kể Chuyện (Storage, ai cũng nghe được, chỉ admin tải lên)
insert into storage.buckets (id, name, public) values ('giong-doc', 'giong-doc', true) on conflict (id) do update set public = true;
drop policy if exists "admin tai giong doc" on storage.objects;
create policy "admin tai giong doc" on storage.objects for insert to authenticated with check (bucket_id = 'giong-doc' and public.is_admin());
drop policy if exists "admin sua giong doc" on storage.objects;
create policy "admin sua giong doc" on storage.objects for update to authenticated using (bucket_id = 'giong-doc' and public.is_admin());
drop policy if exists "ai cung nghe giong doc" on storage.objects;
create policy "ai cung nghe giong doc" on storage.objects for select using (bucket_id = 'giong-doc');

-- =====================================================================
-- Bản 5.0: trò chơi cả lớp theo tốc độ riêng của từng em; cô đặt thời gian mỗi câu (15/20/25/35 giây)
-- =====================================================================
alter table public.game_rooms   add column if not exists qtime int not null default 20;
alter table public.game_players add column if not exists qi int not null default 0;
alter table public.game_players add column if not exists qs timestamptz;

create or replace function public._g_board(p_room uuid, p_kind text) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', student_id, 'name', name, 'crystals', crystals, 'alt', alt, 'shield', shield, 'hacked', hacked, 'right', right_n, 'wrong', wrong_n, 'done', qi)
    order by case when p_kind = 'race' then alt else crystals end desc, name), '[]'::jsonb)
  from game_players where room_id = p_room $$;

-- hết giờ câu nào thì em đó tự sang câu sau
create or replace function public._g_advance(p_room uuid, p_sid uuid) returns void language plpgsql security definer set search_path = public as $$
declare r game_rooms; p game_players; n int;
begin
  select * into r from game_rooms where id = p_room; if r.status <> 'play' then return; end if;
  select * into p from game_players where room_id = p_room and student_id = p_sid; if p.student_id is null or p.box is not null or p.hack is not null then return; end if;
  if p.qs is null then update game_players set qs = coalesce(r.started_at, now()) where room_id = p_room and student_id = p_sid; return; end if;
  n := floor(extract(epoch from now() - p.qs) / r.qtime)::int;
  if n > 0 then update game_players set qi = qi + n, qs = qs + make_interval(secs => n * r.qtime) where room_id = p_room and student_id = p_sid; end if;
end $$;

drop function if exists public.game_create(uuid, text, int, boolean, jsonb, jsonb);
create or replace function public.game_create(p_class uuid, p_kind text, p_minutes int, p_review boolean, p_questions jsonb, p_puzzles jsonb default '[]'::jsonb, p_qtime int default 20)
returns uuid language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
  if not exists (select 1 from classes where id = p_class and teacher_id = auth.uid()) then raise exception 'khong_co_quyen'; end if;
  if jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) < 3 then raise exception 'it_cau_hoi'; end if;
  update game_rooms set status = 'end', ended_at = now() where class_id = p_class and status <> 'end';
  insert into game_rooms(class_id, teacher_id, kind, duration, review_only, questions, puzzles, qtime)
    values (p_class, auth.uid(), p_kind, least(greatest(coalesce(p_minutes, 10), 1), 60) * 60, coalesce(p_review, false) or p_kind = 'race', p_questions, coalesce(p_puzzles, '[]'::jsonb), least(greatest(coalesce(p_qtime, 20), 10), 60))
    returning id into rid;
  return rid;
end $$;
grant execute on function public.game_create(uuid, text, int, boolean, jsonb, jsonb, int) to authenticated;

create or replace function public.game_start(p_room uuid) returns void language plpgsql security definer set search_path = public as $$
begin perform _g_mine_room(p_room);
  update game_rooms set status = 'play', started_at = now() where id = p_room and status = 'lobby';
  update game_players set qi = 0, qs = now() where room_id = p_room;
  perform _g_feed(p_room, 'Trò chơi bắt đầu!');
end $$;

create or replace function public.game_teacher_state(p_room uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare r game_rooms;
begin
  perform _g_mine_room(p_room); perform _g_tick(p_room);
  select * into r from game_rooms where id = p_room;
  return jsonb_build_object(
    'room', jsonb_build_object('id', r.id, 'kind', r.kind, 'status', r.status, 'review_only', r.review_only, 'round', 0, 'roundLeft', r.qtime, 'timeLeft', _g_time_left(r), 'duration', r.duration),
    'q', null, 'qtime', r.qtime,
    'players', _g_board(p_room, r.kind),
    'feed', (select coalesce(jsonb_agg(f order by o desc), '[]'::jsonb) from (select f, o from jsonb_array_elements(r.feed) with ordinality x(f, o) order by o desc limit 12) z),
    'missed', (select coalesce(jsonb_agg(jsonb_build_object('prompt', r.questions->(k::int)->'prompt', 'wrong', (v->>'wrong')::int, 'right', (v->>'right')::int) order by (v->>'wrong')::int desc), '[]'::jsonb)
               from (select k, v from jsonb_each(r.stats) s(k, v) where (v->>'wrong')::int > 0 order by (v->>'wrong')::int desc limit 3) m));
end $$;

create or replace function public.game_mine(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare sid uuid; st students; r game_rooms; p game_players; v_qi int; q jsonb; n int;
begin
  sid := _student_from_token(p_token);
  select * into st from students where id = sid;
  select * into r from game_rooms where class_id = st.class_id and (status <> 'end' or ended_at > now() - interval '90 seconds') order by created_at desc limit 1;
  if r.id is null then return null; end if;
  perform _g_tick(r.id); select * into r from game_rooms where id = r.id;
  if r.status <> 'end' then insert into game_players(room_id, student_id, name, qs) values (r.id, sid, st.name, case when r.status = 'play' then now() end) on conflict do nothing; end if;
  update game_players set hack = null where room_id = r.id and student_id = sid and hack is not null and (hack->>'deadline')::bigint < _ms(now());
  perform _g_advance(r.id, sid);
  select * into p from game_players where room_id = r.id and student_id = sid;
  n := jsonb_array_length(r.questions); v_qi := ((coalesce(p.qi, 0) + abs(hashtext(sid::text)) % n) % n + n) % n; q := r.questions->v_qi;
  return jsonb_build_object(
    'room', jsonb_build_object('id', r.id, 'kind', r.kind, 'status', r.status, 'review_only', r.review_only, 'round', coalesce(p.qi, 0), 'qtime', r.qtime,
      'roundLeft', case when p.qs is null then r.qtime else greatest(0, r.qtime - extract(epoch from now() - p.qs)) end, 'timeLeft', _g_time_left(r),
      'players', (select count(*) from game_players where room_id = r.id)),
    'q', case when r.status = 'play' then jsonb_build_object('prompt', q->'prompt', 'options', q->'options', 'level', q->'level', 'round', coalesce(p.qi, 0)) end,
    'me', case when p.student_id is not null then jsonb_build_object('name', p.name, 'crystals', p.crystals, 'alt', p.alt, 'shield', p.shield, 'hacked', p.hacked, 'answered', false,
            'box', case when p.box is null then 0 else jsonb_array_length(p.box) end, 'hack', case when p.hack is null then null else _g_hack_view(r, p.hack) end) end,
    'top', case when r.status = 'end' then (select coalesce(jsonb_agg(e order by o), '[]'::jsonb) from jsonb_array_elements(_g_board(r.id, r.kind)) with ordinality x(e, o) where o <= 3) end);
end $$;

create or replace function public.game_answer(p_token uuid, p_room uuid, p_round int, p_choice int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare sid uuid; r game_rooms; p game_players; n int; v_qi int; q jsonb; ok boolean; gain int := 0; v_box jsonb := null; k text;
begin
  sid := _student_from_token(p_token);
  perform _g_tick(p_room); perform _g_advance(p_room, sid);
  select * into r from game_rooms where id = p_room for update;
  select * into p from game_players where room_id = p_room and student_id = sid for update;
  if p.student_id is null then raise exception 'chua_vao'; end if;
  if r.status <> 'play' then raise exception 'het_gio'; end if;
  if p_round <> p.qi then raise exception 'het_luot'; end if;
  n := jsonb_array_length(r.questions); v_qi := ((p.qi + abs(hashtext(sid::text)) % n) % n + n) % n; q := r.questions->v_qi;
  ok := p_choice = (q->>'correct')::int; k := v_qi::text;
  update game_rooms set stats = jsonb_set(stats, array[k], jsonb_build_object(
      'right', coalesce((stats->k->>'right')::int, 0) + case when ok then 1 else 0 end,
      'wrong', coalesce((stats->k->>'wrong')::int, 0) + case when ok then 0 else 1 end)) where id = p_room;
  if ok then
    if r.kind = 'race' then gain := 10 + case when extract(epoch from now() - p.qs) < r.qtime * 0.4 then 5 else 0 end;
    else gain := case when q->>'level' = 'vandung' then 15 else 10 end; v_box := jsonb_build_array(_g_box(r.review_only), _g_box(r.review_only), _g_box(r.review_only)); end if;
  end if;
  update game_players set last_gain = gain, qi = game_players.qi + 1, qs = now(),
      right_n = right_n + case when ok then 1 else 0 end, wrong_n = wrong_n + case when ok then 0 else 1 end,
      crystals = crystals + case when r.kind = 'race' then 0 else gain end, alt = alt + case when r.kind = 'race' then gain else 0 end,
      box = coalesce(v_box, game_players.box)
   where room_id = p_room and student_id = sid returning * into p;
  return jsonb_build_object('correct', ok, 'correctIndex', (q->>'correct')::int, 'explain', coalesce(q->>'explain', ''), 'gain', gain, 'crystals', p.crystals, 'alt', p.alt, 'box', p.box is not null);
end $$;

-- Bản 5.1: lọc trò chuyện chặt hơn (tục, bạo lực, xúc phạm), máy chủ cũng chặn link
create or replace function public._loc_tu_tuc(p text, out clean text, out flagged boolean)
language plpgsql immutable as $$
declare w text; words text[] := array['đụ','địt','đéo','đếch','lồn','buồi','cặc','đĩ','vãi lồn','vãi','vcl','vkl','vl','đm','dm','đcm','dcm','đmm','dmm','clm','cl','cc','cmm','đkm','dkm','óc chó','con chó','thằng chó','chó má','mất dạy','khốn nạn','khốn','djt','dit','du ma','fuck','shit','bitch','wtf','giết','giết mày','đánh chết','đâm chết','chém','chém chết','đâm','bóp cổ','đập chết','đập mày','đấm mày','tát mày','đánh mày','xử mày','xử đẹp','cho mày chết','chết đi','chết mẹ','tự tử','treo cổ','súng','bắn chết','bom','nổ tung','máu me','dao găm','ngu','ngu như bò','ngu như lợn','đần','đần độn','óc lợn','óc bò','thằng điên','con điên','khùng','thằng ngu','con ngu','đồ ngu','não cá vàng','béo như lợn','xấu như ma','đồ ăn hại','phế vật','rác rưởi','biến đi','cút','im mồm','câm mồm','bố mày','mẹ mày','tao','mày'];
begin
  clean := regexp_replace(p, '(https?://|www\.)\S+', '***', 'gi'); flagged := clean <> p;
  foreach w in array words loop
    if clean ~* ('(^|[^[:alnum:]])' || w || '($|[^[:alnum:]])') then
      clean := regexp_replace(clean, '(^|[^[:alnum:]])' || w || '($|[^[:alnum:]])', '\1***\2', 'gi'); flagged := true;
    end if;
  end loop;
end $$;
revoke all on function public._loc_tu_tuc(text) from public, anon, authenticated;

-- Bản 5.2: điểm từng câu (đúng ngay 10 điểm, mỗi lần sai trừ 25%) tính vào bảng xếp hạng
create or replace function public.student_leaderboard(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare sid uuid; cid uuid; r jsonb;
begin
  sid := _student_from_token(p_token);
  select class_id into cid from students where id = sid;
  select coalesce(jsonb_agg(x order by x.score desc, x.name), '[]'::jsonb) into r from (
    select s.name, s.id = sid as me, s.state->'avatar' as avatar,
      (select count(*) from jsonb_each(case when jsonb_typeof(s.state->'seeds') = 'object' then s.state->'seeds' else '{}'::jsonb end) e where e.value->>'done' = 'true') as seeds,
      (select coalesce(sum((e.value)::numeric), 0) from jsonb_each_text(case when jsonb_typeof(s.state->'qpts') = 'object' then s.state->'qpts' else '{}'::jsonb end) e) as qsum,
      (select count(*) from jsonb_array_elements(case when jsonb_typeof(s.state->'weeds') = 'array' then s.state->'weeds' else '[]'::jsonb end) w where w->>'fixed' = 'true') as fixed,
      (case when jsonb_typeof(s.state->'houses') = 'array' then jsonb_array_length(s.state->'houses') else 0 end) as houses,
      coalesce((s.state->'plaza'->>'cleared')::int, 0) as plaza
    from students s where s.class_id = cid) y
  cross join lateral (select y.name, y.me, y.avatar, y.seeds, y.fixed, y.houses, y.plaza,
    round(case when y.qsum > 0 then y.qsum else y.seeds * 10 end + y.fixed * 5 + y.houses * 15 + y.plaza * 5)::int as score) x;
  return r;
end $$;

-- =====================================================================
-- v7.5 RUNG CHUÔNG VÀNG LIÊN LỚP: nhiều lớp cùng thi, trả lời sai bị loại, cô có quyền cứu trợ
-- =====================================================================
create table if not exists public.rcv_rooms (
  id uuid primary key default gen_random_uuid(), teacher_id uuid not null default auth.uid(), code text unique,
  class_ids uuid[] not null default '{}', questions jsonb not null default '[]', qi int not null default -1,
  phase text not null default 'lobby', q_started timestamptz, qtime int not null default 20, created_at timestamptz not null default now(), ended_at timestamptz);
create table if not exists public.rcv_players (
  room_id uuid not null references public.rcv_rooms(id) on delete cascade, student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid, name text, alive boolean not null default true, choice int, choice_qi int not null default -1, right_n int not null default 0, primary key (room_id, student_id));
alter table public.rcv_rooms enable row level security; alter table public.rcv_players enable row level security;

create or replace function public.rcv_create(p_class_ids uuid[], p_questions jsonb, p_qtime int) returns uuid
language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
  if exists (select 1 from unnest(p_class_ids) c where not exists (select 1 from classes where id = c and teacher_id = auth.uid())) then raise exception 'khong_phai_lop_cua_co'; end if;
  insert into rcv_rooms(teacher_id, code, class_ids, questions, qtime) values (auth.uid(), upper(substr(md5(random()::text), 1, 5)), p_class_ids, p_questions, greatest(10, least(60, coalesce(p_qtime, 20)))) returning id into rid;
  return rid;
end $$;
create or replace function public.rcv_join_class(p_code text, p_class_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
  if not exists (select 1 from classes where id = p_class_id and teacher_id = auth.uid()) then raise exception 'khong_phai_lop_cua_co'; end if;
  update rcv_rooms set class_ids = array(select distinct unnest(class_ids || p_class_id)) where code = upper(trim(p_code)) and phase <> 'end' returning id into rid;
  if rid is null then raise exception 'khong_tim_thay_phong'; end if; return rid;
end $$;
create or replace function public.rcv_control(p_room uuid, p_action text) returns void
language plpgsql security definer set search_path = public as $$
declare r rcv_rooms; q jsonb;
begin
  select * into r from rcv_rooms where id = p_room for update;
  if r.id is null or (r.teacher_id <> auth.uid() and not exists (select 1 from classes where teacher_id = auth.uid() and id = any(r.class_ids))) then raise exception 'khong_phai_phong_cua_co'; end if;
  if p_action = 'next' then
    if r.qi + 1 >= jsonb_array_length(r.questions) then update rcv_rooms set phase = 'end', ended_at = now() where id = p_room;
    else update rcv_rooms set qi = r.qi + 1, phase = 'ask', q_started = now() where id = p_room; end if;
  elsif p_action = 'reveal' and r.phase = 'ask' then
    q := r.questions -> r.qi;
    update rcv_players set right_n = right_n + 1 where room_id = p_room and alive and choice_qi = r.qi and choice = (q->>'correct')::int;
    update rcv_players set alive = false where room_id = p_room and alive and (choice_qi <> r.qi or choice is distinct from (q->>'correct')::int);
    update rcv_rooms set phase = 'reveal' where id = p_room;
  elsif p_action = 'revive' then update rcv_players set alive = true where room_id = p_room;
  elsif p_action = 'end' then update rcv_rooms set phase = 'end', ended_at = now() where id = p_room;
  end if;
end $$;
create or replace function public._rcv_view(r rcv_rooms, with_correct boolean) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object('id', r.id, 'code', r.code, 'phase', r.phase, 'qi', r.qi, 'total', jsonb_array_length(r.questions), 'qtime', r.qtime,
    'timeLeft', case when r.phase = 'ask' then greatest(0, r.qtime - extract(epoch from now() - r.q_started)) else null end,
    'q', case when r.qi >= 0 and r.phase in ('ask', 'reveal') then jsonb_build_object('prompt', r.questions->r.qi->'prompt', 'options', r.questions->r.qi->'options',
      'correct', case when with_correct or r.phase = 'reveal' then r.questions->r.qi->'correct' end) end,
    'classes', (select coalesce(jsonb_agg(jsonb_build_object('name', c.name, 'alive', (select count(*) from rcv_players p where p.room_id = r.id and p.class_id = c.id and p.alive),
        'total', (select count(*) from rcv_players p where p.room_id = r.id and p.class_id = c.id),
        'answered', (select count(*) from rcv_players p where p.room_id = r.id and p.class_id = c.id and p.alive and p.choice_qi = r.qi)) order by c.name), '[]'::jsonb) from classes c where c.id = any(r.class_ids)),
    'alive', (select coalesce(jsonb_agg(jsonb_build_object('name', p.name, 'cls', (select name from classes where id = p.class_id), 'right', p.right_n) order by p.right_n desc, p.name), '[]'::jsonb)
      from (select * from rcv_players where room_id = r.id and alive limit 60) p));
$$;
create or replace function public.rcv_teacher_state(p_room uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r rcv_rooms;
begin
  select * into r from rcv_rooms where id = p_room;
  if r.id is null or (r.teacher_id <> auth.uid() and not exists (select 1 from classes where teacher_id = auth.uid() and id = any(r.class_ids))) then raise exception 'khong_phai_phong_cua_co'; end if;
  return _rcv_view(r, true);
end $$;
create or replace function public.rcv_active(p_class uuid) returns uuid
language sql security definer set search_path = public as $$
  select id from rcv_rooms where p_class = any(class_ids) and phase <> 'end' and created_at > now() - interval '6 hours' order by created_at desc limit 1;
$$;
create or replace function public.rcv_state(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare sid uuid; st students; r rcv_rooms; p rcv_players;
begin
  sid := _student_from_token(p_token); select * into st from students where id = sid;
  select * into r from rcv_rooms where st.class_id = any(class_ids) and (phase <> 'end' or ended_at > now() - interval '2 minutes') and created_at > now() - interval '6 hours' order by created_at desc limit 1;
  if r.id is null then return null; end if;
  insert into rcv_players(room_id, student_id, class_id, name, alive) values (r.id, sid, st.class_id, st.name, r.phase = 'lobby') on conflict do nothing;
  select * into p from rcv_players where room_id = r.id and student_id = sid;
  return _rcv_view(r, false) || jsonb_build_object('me', jsonb_build_object('alive', p.alive, 'choice', case when p.choice_qi = r.qi then p.choice end, 'right', p.right_n));
end $$;
create or replace function public.rcv_answer(p_token uuid, p_qi int, p_choice int) returns void
language plpgsql security definer set search_path = public as $$
declare sid uuid; st students; r rcv_rooms;
begin
  sid := _student_from_token(p_token); select * into st from students where id = sid;
  select * into r from rcv_rooms where st.class_id = any(class_ids) and phase = 'ask' order by created_at desc limit 1;
  if r.id is null or r.qi <> p_qi or now() > r.q_started + make_interval(secs => r.qtime + 1) then raise exception 'het_gio'; end if;
  update rcv_players set choice = p_choice, choice_qi = p_qi where room_id = r.id and student_id = sid and alive;
end $$;
grant execute on function public.rcv_create(uuid[], jsonb, int), public.rcv_join_class(text, uuid), public.rcv_control(uuid, text), public.rcv_teacher_state(uuid), public.rcv_active(uuid) to authenticated;
grant execute on function public.rcv_state(uuid), public.rcv_answer(uuid, int, int) to anon, authenticated;
revoke all on function public._rcv_view(rcv_rooms, boolean) from public, anon, authenticated;

-- =====================================================================
-- v7.7 TIẾT KIỆM BĂNG THÔNG: học sinh hỏi thăm bằng 1 gói rất nhỏ (mã cài đặt + phòng chơi),
-- chỉ tải lại cài đặt lớp khi cô thật sự thay đổi.
-- =====================================================================
create or replace function public.student_poll(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare sid uuid; cid uuid; rid uuid;
begin
  sid := _student_from_token(p_token); select class_id into cid from students where id = sid;
  select r.id into rid from game_rooms r where r.class_id = cid and r.status <> 'end' order by r.created_at desc limit 1;
  if rid is not null then perform _g_tick(rid); select id into rid from game_rooms where id = rid and status <> 'end'; end if;
  return jsonb_build_object('h', (select md5(settings::text) from classes where id = cid), 'game', rid, 'rcv', rcv_active(cid));
end $$;
create or replace function public.student_settings(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin return (select c.settings from classes c join students s on s.class_id = c.id where s.id = _student_from_token(p_token)); end $$;
grant execute on function public.student_poll(uuid), public.student_settings(uuid) to anon, authenticated;
