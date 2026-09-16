-- One row per plan, per address, per hand that pressed the button.
--
-- The first cut keyed rows on (plan_slug, email) alone, which meant a test
-- press by an operator after the customer had confirmed would overwrite the
-- customer's row with `actor = 'operator'`, and the page, which reads back
-- customer rows only, would then show them the question again. The actor
-- joins the key so the customer's row is theirs and a test row sits beside
-- it.

alter table public.plan_choices
  drop constraint if exists plan_choices_one_per_plan;

alter table public.plan_choices
  add constraint plan_choices_one_per_hand unique (plan_slug, email, actor);
