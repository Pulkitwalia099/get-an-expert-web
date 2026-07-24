-- The /stuck page: a second intake flow for developers stuck in AI coding
-- sessions. flow segments the two funnels ('main' or 'dev') in analytics.
--
-- The app only sends flow for dev-flow traffic, so the main site keeps
-- persisting even if this migration lags behind a deploy. Apply it before
-- sharing /stuck, or dev sessions will not be stored.

alter table sessions add column flow text not null default 'main';
alter table leads add column flow text not null default 'main';

create index sessions_flow_idx on sessions (flow);
