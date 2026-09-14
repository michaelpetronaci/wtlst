-- WTLST V1: run this entire file in the dedicated project SQL editor.
-- Safe to rerun; no application data is deleted.
begin;

create schema if not exists private;
revoke all on schema private from public;
create sequence if not exists private.member_numbers;
create table if not exists private.admins (user_id uuid primary key references auth.users(id));
create table if not exists private.applications (
 id bigint generated always as identity primary key,
 user_id uuid not null unique references auth.users(id) on delete cascade,
 name text not null check (length(name) between 1 and 60),
 city text not null check (length(city) between 1 and 80),
 social text not null default '' check (length(social)<=100),
 reason text not null check (length(reason) between 10 and 1000),
 status text not null default 'waiting' check(status in ('waiting','admitted')),
 referral_code uuid not null unique default gen_random_uuid(),
 referred_by bigint references private.applications(id) on delete set null,
 member_number bigint unique,
 admitted_at timestamptz,
 public_profile boolean not null default false,
 created_at timestamptz not null default now(),
 check (referred_by is distinct from id),
 check ((status='admitted') = (member_number is not null))
);
create index if not exists wtlst_referred_by_idx on private.applications(referred_by);
create table if not exists private.invitations (
 owner_id bigint primary key references private.applications(id) on delete cascade,
 code uuid not null unique default gen_random_uuid(),
 redeemed_by bigint unique references private.applications(id) on delete set null,
 redeemed_at timestamptz
);
create table if not exists private.outbox (
 id uuid primary key default gen_random_uuid(),
 applicant_id bigint not null references private.applications(id) on delete cascade,
 kind text not null,
 created_at timestamptz not null default now(), sent_at timestamptz,
 attempts int not null default 0, locked_until timestamptz,
 last_error text, unique(applicant_id,kind)
);
create table if not exists private.audit (
 id bigint generated always as identity primary key,
 actor uuid, action text not null, applicant_id bigint, created_at timestamptz default now()
);
alter table private.applications enable row level security;
alter table private.invitations enable row level security;
alter table private.admins enable row level security;
alter table private.outbox enable row level security;
alter table private.audit enable row level security;

create or replace function private.require_user() returns uuid language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then
  raise exception 'Verify your email first.';
 end if;
 return auth.uid();
end $$;
create or replace function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.admins where user_id=auth.uid());
$$;
create or replace function private.admit(p_id bigint, p_actor uuid) returns void language plpgsql security definer set search_path='' as $$
declare a private.applications;
begin
 select * into a from private.applications where id=p_id for update;
 if not found then raise exception 'Application not found.'; end if;
 if a.status='admitted' then return; end if;
 update private.applications set status='admitted',member_number=nextval('private.member_numbers'),admitted_at=now() where id=p_id;
 insert into private.invitations(owner_id) values(p_id) on conflict do nothing;
 insert into private.outbox(applicant_id,kind) values(p_id,'admission') on conflict do nothing;
 insert into private.audit(actor,action,applicant_id) values(p_actor,'admit',p_id);
end $$;
create or replace function public.wtlst_counts() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('waiting',count(*) filter(where status='waiting'),'admitted',count(*) filter(where status='admitted')) from private.applications;
$$;
create or replace function public.wtlst_me() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid := private.require_user(); result jsonb;
begin
 with referrals as (select referred_by,count(*) n from private.applications where referred_by is not null group by referred_by),
 ranked as (select a.id,row_number() over(order by a.id-5*coalesce(r.n,0),a.id) position from private.applications a left join referrals r on r.referred_by=a.id where a.status='waiting')
 select to_jsonb(a)||jsonb_build_object('position',q.position,'referrals',coalesce(r.n,0),'invite_code',i.code,'invite_used',i.redeemed_at is not null)
 into result from private.applications a left join ranked q on q.id=a.id left join referrals r on r.referred_by=a.id left join private.invitations i on i.owner_id=a.id where a.user_id=u;
 return jsonb_build_object('application',result,'admin',private.is_admin());
end $$;
create or replace function public.wtlst_apply(p_name text,p_city text,p_social text,p_reason text,p_ref uuid default null,p_invite uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); a private.applications; inv private.invitations; ref bigint;
begin
 -- Serialize requests for the same verified identity.
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 select * into a from private.applications where user_id=u;
 if found then return public.wtlst_me(); end if;
 if p_invite is not null then
  select * into inv from private.invitations where code=p_invite for update;
  if not found or inv.redeemed_at is not null then raise exception 'This invitation is no longer available. You can apply without it.'; end if;
 end if;
 if p_ref is not null then select id into ref from private.applications where referral_code=p_ref and user_id<>u; end if;
 insert into private.applications(user_id,name,city,social,reason,referred_by)
 values(u,trim(p_name),trim(p_city),trim(p_social),trim(p_reason),ref) returning * into a;
 if p_invite is not null then
  update private.invitations set redeemed_by=a.id,redeemed_at=now() where owner_id=inv.owner_id;
  perform private.admit(a.id,u);
 else
  insert into private.outbox(applicant_id,kind) values(a.id,'application');
 end if;
 return public.wtlst_me();
end $$;
create or replace function public.wtlst_redeem(p_invite uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); a private.applications; inv private.invitations;
begin
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 select * into inv from private.invitations where code=p_invite for update;
 if not found or inv.redeemed_at is not null then raise exception 'This invitation is no longer available.'; end if;
 select * into a from private.applications where user_id=u for update;
 if not found then raise exception 'Apply first.'; end if;
 if a.status='admitted' then raise exception 'You are already a member.'; end if;
 update private.invitations set redeemed_by=a.id,redeemed_at=now() where owner_id=inv.owner_id;
 perform private.admit(a.id,u);
 return public.wtlst_me();
end $$;
create or replace function public.wtlst_profile(p_public boolean) returns void language plpgsql security definer set search_path='' as $$
begin update private.applications set public_profile=p_public where user_id=private.require_user(); end $$;
create or replace function public.wtlst_member(p_number bigint) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('member_number',member_number,'name',case when public_profile then name else null end,'city',case when public_profile then city else null end,'admitted_at',admitted_at) from private.applications where member_number=p_number and status='admitted';
$$;
create or replace function public.wtlst_admin_list(p_offset int default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_user();
 if not private.is_admin() then raise exception 'Admin access required.'; end if;
 return jsonb_build_object('applications',coalesce((select jsonb_agg(t) from (select a.*,u.email,(select count(*) from private.applications r where r.referred_by=a.id) referrals from private.applications a join auth.users u on u.id=a.user_id order by a.id desc limit 50 offset greatest(0,p_offset)) t),'[]'::jsonb),'pending_emails',(select count(*) from private.outbox where sent_at is null),'total',(select count(*) from private.applications));
end $$;
create or replace function public.wtlst_admit(p_id bigint) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.require_user();
 if not private.is_admin() then raise exception 'Admin access required.'; end if;
 perform private.admit(p_id,auth.uid());
end $$;
revoke all on all functions in schema private from public,anon,authenticated;
revoke all on function public.wtlst_counts(),public.wtlst_me(),public.wtlst_apply(text,text,text,text,uuid,uuid),public.wtlst_redeem(uuid),public.wtlst_profile(boolean),public.wtlst_member(bigint),public.wtlst_admin_list(int),public.wtlst_admit(bigint) from public,anon,authenticated;
grant execute on function public.wtlst_counts(),public.wtlst_member(bigint) to anon,authenticated;
grant execute on function public.wtlst_me(),public.wtlst_apply(text,text,text,text,uuid,uuid),public.wtlst_redeem(uuid),public.wtlst_profile(boolean),public.wtlst_admin_list(int),public.wtlst_admit(bigint) to authenticated;


-- All access goes through scoped RPCs, never direct table or sequence access.
revoke all on all tables in schema private from public,anon,authenticated;
revoke all on all sequences in schema private from public,anon,authenticated;
revoke all on schema private from anon,authenticated;
alter default privileges in schema private revoke execute on functions from public;
alter default privileges in schema private revoke all on tables from public,anon,authenticated;

alter table private.outbox drop constraint if exists outbox_kind_check;
alter table private.outbox add constraint outbox_kind_check check(kind in ('application','admission','operator_application','operator_admission'));
alter table private.outbox add column if not exists lease_token uuid;
alter table private.outbox add column if not exists payload jsonb;
alter table private.outbox add column if not exists provider_id text;
alter table private.outbox add column if not exists first_attempt_at timestamptz;
create index if not exists wtlst_outbox_pending_idx on private.outbox(created_at) where sent_at is null;
create index if not exists wtlst_waiting_idx on private.applications(id) where status='waiting';

create or replace function private.notify_operator() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='INSERT' then
  insert into private.outbox(applicant_id,kind) values(new.id,'operator_application') on conflict do nothing;
 elsif new.status='admitted' and old.status<>'admitted' then
  insert into private.outbox(applicant_id,kind) values(new.id,'operator_admission') on conflict do nothing;
 end if;
 return new;
end $$;
drop trigger if exists wtlst_operator_notification on private.applications;
create trigger wtlst_operator_notification after insert or update of status on private.applications for each row execute function private.notify_operator();
revoke all on function private.notify_operator() from public,anon,authenticated;

-- Revoke obsolete worker entry points if an older migration was applied.
do $$ begin
 if to_regprocedure('public.wtlst_claim_emails(bigint)') is not null then
  execute 'revoke all on function public.wtlst_claim_emails(bigint) from public,anon,authenticated,service_role';
 end if;
 if to_regprocedure('public.wtlst_finish_email(uuid,text)') is not null then
  execute 'revoke all on function public.wtlst_finish_email(uuid,text) from public,anon,authenticated,service_role';
 end if;
end $$;

create or replace function public.wtlst_email_claim(p_applicant bigint default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 with jobs as (
  select id from private.outbox where sent_at is null and attempts<20
   and (locked_until is null or locked_until<now())
   and (first_attempt_at is null or first_attempt_at>now()-interval '23 hours')
   and (p_applicant is null or applicant_id=p_applicant)
  order by created_at,id for update skip locked limit 5
 ), claimed as (
  update private.outbox o set locked_until=now()+interval '3 minutes', lease_token=gen_random_uuid(),
    first_attempt_at=coalesce(first_attempt_at,now()), attempts=attempts+1
  from jobs where o.id=jobs.id returning o.*
 )
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'lease',c.lease_token,'kind',c.kind,'payload',c.payload,
 'email',u.email,'name',a.name,'member_number',a.member_number,'applicant_id',a.id)),'[]'::jsonb)
 into result from claimed c join private.applications a on a.id=c.applicant_id join auth.users u on u.id=a.user_id;
 return result;
end $$;
create or replace function public.wtlst_email_prepare(p_id uuid,p_lease uuid,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 update private.outbox set payload=coalesce(payload,p_payload) where id=p_id and lease_token=p_lease and sent_at is null returning payload into result;
 if not found then raise exception 'Email lease expired'; end if;
 return result;
end $$;
create or replace function public.wtlst_email_finish(p_id uuid,p_lease uuid,p_provider_id text default null,p_error text default null) returns void language plpgsql security definer set search_path='' as $$
begin
 update private.outbox set sent_at=case when p_provider_id is not null then now() else null end,
 provider_id=p_provider_id,last_error=left(p_error,200),lease_token=null,
 locked_until=case when p_provider_id is not null then null else now()+interval '5 minutes' end
 where id=p_id and lease_token=p_lease and sent_at is null;
 if not found then raise exception 'Email lease expired'; end if;
end $$;
revoke all on function public.wtlst_email_claim(bigint),public.wtlst_email_prepare(uuid,uuid,jsonb),public.wtlst_email_finish(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.wtlst_email_claim(bigint),public.wtlst_email_prepare(uuid,uuid,jsonb),public.wtlst_email_finish(uuid,uuid,text,text) to service_role;
notify pgrst, 'reload schema';
commit;
