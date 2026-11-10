-- Row Level Security
-- Admins manage content. Participants never see answer keys or other participants.

alter table public.admin_profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.resources enable row level security;
alter table public.document_chunks enable row level security;
alter table public.question_bank enable row level security;
alter table public.question_sources enable row level security;
alter table public.examinations enable row level security;
alter table public.examination_questions enable row level security;
alter table public.participants enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.participant_answers enable row level security;
alter table public.exam_results enable row level security;
alter table public.generation_jobs enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_profiles
    where id = auth.uid()
  );
$$;

-- admin_profiles
create policy "admins_read_own_profile"
  on public.admin_profiles for select
  using (id = auth.uid());

create policy "admins_update_own_profile"
  on public.admin_profiles for update
  using (id = auth.uid());

-- subjects / topics
create policy "admins_manage_subjects"
  on public.subjects for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins_manage_topics"
  on public.topics for all
  using (public.is_admin())
  with check (public.is_admin());

-- resources / chunks (admin only)
create policy "admins_manage_resources"
  on public.resources for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins_manage_chunks"
  on public.document_chunks for all
  using (public.is_admin())
  with check (public.is_admin());

-- question bank / sources (admin only; never public)
create policy "admins_manage_questions"
  on public.question_bank for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins_manage_question_sources"
  on public.question_sources for all
  using (public.is_admin())
  with check (public.is_admin());

-- examinations
create policy "admins_manage_examinations"
  on public.examinations for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "public_read_published_exams"
  on public.examinations for select
  using (status = 'published');

-- examination_questions: admins full; public select WITHOUT correct_option/explanation
-- Public clients must query via edge function or a view that omits answer keys.
create policy "admins_manage_exam_questions"
  on public.examination_questions for all
  using (public.is_admin())
  with check (public.is_admin());

-- Public exam questions are served by edge functions using service role,
-- stripping correct_option and explanation. No direct public SELECT.

-- participants / attempts / answers / results: admin read; writes via edge functions
create policy "admins_read_participants"
  on public.participants for select
  using (public.is_admin());

create policy "admins_read_attempts"
  on public.exam_attempts for select
  using (public.is_admin());

create policy "admins_read_answers"
  on public.participant_answers for select
  using (public.is_admin());

create policy "admins_read_results"
  on public.exam_results for select
  using (public.is_admin());

create policy "admins_manage_generation_jobs"
  on public.generation_jobs for all
  using (public.is_admin())
  with check (public.is_admin());

-- Public participant result: only via access_token through edge function.
