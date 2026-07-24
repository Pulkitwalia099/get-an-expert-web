-- Mark sessions that ran in demo mode (no ANTHROPIC_API_KEY), so real launch
-- traffic can be told apart from the scripted demo in every funnel query.
-- Defaults false, so main-site writes keep working even if this migration
-- lags a deploy: the app only sends demo=true when it is actually in demo mode.

alter table sessions add column demo boolean not null default false;

create index sessions_demo_idx on sessions (demo);
