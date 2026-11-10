-- Public exam payload without answer keys or explanations.
-- Clients and anon queries must use this view, not examination_questions.

create or replace view public.exam_questions_public as
select
  eq.id,
  eq.examination_id,
  eq.sort_order,
  eq.question_text,
  eq.option_a,
  eq.option_b,
  eq.option_c,
  eq.option_d,
  eq.marks
from public.examination_questions eq
join public.examinations e on e.id = eq.examination_id
where e.status = 'published';

grant select on public.exam_questions_public to anon, authenticated;

create or replace view public.examinations_public as
select
  id,
  public_slug,
  title,
  description,
  instructions,
  total_questions,
  total_marks,
  time_limit_minutes,
  starts_at,
  ends_at,
  result_visibility,
  status
from public.examinations
where status = 'published';

grant select on public.examinations_public to anon, authenticated;
