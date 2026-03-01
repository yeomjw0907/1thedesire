-- Enable RLS on all tables
-- 기본값: 거부 (deny by default)

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.blocks enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.consent_events enable row level security;
alter table public.messages enable row level security;
alter table public.point_transactions enable row level security;
alter table public.payment_events enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;
