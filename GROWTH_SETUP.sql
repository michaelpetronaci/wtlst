-- Additive WTLST V1 growth infrastructure. Run after WTLST_SETUP.sql.
-- Re-runnable; application/admission/invitation RPCs are unchanged.
begin;
create index if not exists wtlst_application_created_idx on private.applications(created_at);
create index if not exists wtlst_application_admitted_idx on private.applications(admitted_at) where admitted_at is not null;
create index if not exists wtlst_invitation_redeemed_idx on private.invitations(redeemed_at) where redeemed_at is not null;
-- Existing RPCs use one transaction timestamp for invitation applications.
-- Existing waiting applicants who later redeem retain their original acquisition source.
create or replace view private.growth_applications as
 select a.id,a.created_at,a.admitted_at,a.member_number,a.referred_by,
 i.owner_id invited_by,
 case when i.redeemed_at=a.created_at then 'invitation'
      when a.referred_by is not null then 'referral' else 'direct' end source,
 case when a.admitted_at is null then null when i.redeemed_at is not null then 'invitation' else 'manual' end admission_source
 from private.applications a left join private.invitations i on i.redeemed_by=a.id;

create or replace function private.growth(p_at timestamptz default now()) returns jsonb
language sql stable security definer set search_path='' as $$
 with a as (select * from private.growth_applications where created_at<p_at),
 inv as (select i.*,o.admitted_at generated_at from private.invitations i join private.applications o on o.id=i.owner_id where o.admitted_at<p_at),
 periods as (select label,p_at - start_days*interval '1 day' lo,p_at-end_days*interval '1 day' hi
  from (values ('last7',7,0),('previous7',14,7),('last30',30,0)) w(label,start_days,end_days)),
 stats as (select label,jsonb_build_object(
 'applications',(select count(*) from a where created_at>=lo and created_at<hi),
 'members',(select count(*) from a where admitted_at>=lo and admitted_at<hi),
 'direct',(select count(*) from a where created_at>=lo and created_at<hi and source='direct'),
 'referral',(select count(*) from a where created_at>=lo and created_at<hi and source='referral'),
 'invitation',(select count(*) from a where created_at>=lo and created_at<hi and source='invitation'),
 'invitation_admissions',(select count(*) from a where admitted_at>=lo and admitted_at<hi and admission_source='invitation'),
 'manual_admissions',(select count(*) from a where admitted_at>=lo and admitted_at<hi and admission_source='manual'),
 'waiting_change',(select count(*) from a where created_at>=lo and created_at<hi)-(select count(*) from a where admitted_at>=lo and admitted_at<hi)
 ) value from periods)
 select jsonb_build_object('as_of',p_at,'snapshot',jsonb_build_object(
 'applications',(select count(*) from a),'waiting',(select count(*) from a where admitted_at is null or admitted_at>=p_at),
 'members',(select count(*) from a where admitted_at<p_at),
 'direct',(select count(*) from a where source='direct'),'referral',(select count(*) from a where source='referral'),
 'invitation',(select count(*) from a where source='invitation'),
 'invitation_admissions',(select count(*) from a where admission_source='invitation' and admitted_at<p_at),
 'manual_admissions',(select count(*) from a where admission_source='manual' and admitted_at<p_at),
 'verified_referrals',(select count(*) from a where referred_by is not null),
 'referrers',(select count(distinct referred_by) from a where referred_by is not null),
 'referred_members',(select count(*) from a where referred_by is not null and admitted_at<p_at),
 'invitations',(select count(*) from inv),
 'unused',(select count(*) from inv where redeemed_at is null or redeemed_at>=p_at),
 'redeemed',(select count(*) from inv where redeemed_at<p_at),
 'redemption_avg_days',(select avg(extract(epoch from (redeemed_at-generated_at))/86400) from inv where redeemed_at<p_at),
 'redemption_median_days',(select percentile_cont(0.5) within group(order by extract(epoch from (redeemed_at-generated_at))/86400) from inv where redeemed_at<p_at)
 ),'periods',(select jsonb_object_agg(label,value) from stats),
 'top_referrers',coalesce((select jsonb_agg(t) from (
 select parent.id,parent.member_number,count(*) referrals,count(*) filter(where a.admitted_at<p_at) admitted
 from a join a parent on parent.id=a.referred_by group by parent.id,parent.member_number order by count(*) desc,parent.id limit 10
 ) t),'[]'::jsonb));
$$;
create or replace function public.wtlst_admin_growth() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_user();
 if not private.is_admin() then raise exception 'Admin access required.'; end if;
 return private.growth();
end $$;

-- Nullable applicant permits one aggregate weekly report without a fake application.
alter table private.outbox alter column applicant_id drop not null;
alter table private.outbox add column if not exists dedupe_key text;
alter table private.outbox add column if not exists context jsonb;
alter table private.outbox add column if not exists cancelled_at timestamptz;
create unique index if not exists wtlst_outbox_dedupe_idx on private.outbox(dedupe_key) where dedupe_key is not null;
alter table private.outbox drop constraint if exists outbox_kind_check;
alter table private.outbox add constraint outbox_kind_check check(kind in ('application','admission','operator_application','operator_admission','invitation_reminder','weekly_growth'));
alter table private.outbox drop constraint if exists outbox_subject_check;
alter table private.outbox add constraint outbox_subject_check check((kind='weekly_growth' and applicant_id is null and dedupe_key is not null) or (kind<>'weekly_growth' and applicant_id is not null));

create or replace function private.growth_schedule(p_now timestamptz) returns jsonb
language plpgsql security definer set search_path='' as $$
declare reminders integer; reports integer:=0; week_start timestamptz;
begin
 insert into private.outbox(applicant_id,kind)
 select a.id,'invitation_reminder' from private.applications a join private.invitations i on i.owner_id=a.id
 where a.status='admitted' and a.admitted_at<=p_now-interval '10 days' and i.redeemed_at is null
 on conflict do nothing;
 get diagnostics reminders=row_count;
 -- Called by the existing daily 07:00 UTC cron: Monday 09:00 CEST / 08:00 CET.
 if extract(isodow from p_now at time zone 'Europe/Rome')=1 then
  week_start:=date_trunc('week',p_now at time zone 'Europe/Rome') at time zone 'Europe/Rome';
  insert into private.outbox(kind,dedupe_key,context)
  values('weekly_growth','weekly-growth:'||(week_start at time zone 'Europe/Rome')::date,
   private.growth(week_start)-'top_referrers') on conflict do nothing;
  get diagnostics reports=row_count;
 end if;
 update private.outbox o set cancelled_at=p_now,last_error='Invitation already redeemed'
 where o.kind='invitation_reminder' and o.sent_at is null and o.cancelled_at is null
 and not exists(select 1 from private.invitations i where i.owner_id=o.applicant_id and i.redeemed_at is null);
 return jsonb_build_object('reminders_queued',reminders,'reports_queued',reports);
end $$;

create or replace function public.wtlst_growth_schedule() returns jsonb language sql security definer set search_path='' as $$ select private.growth_schedule(now()); $$;

create or replace function public.wtlst_email_claim(p_applicant bigint default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 with jobs as (
  select id from private.outbox o where sent_at is null and cancelled_at is null and attempts<20
   and (locked_until is null or locked_until<now())
   and (first_attempt_at is null or first_attempt_at>now()-interval '23 hours')
   and (p_applicant is null or applicant_id=p_applicant)
   and (kind<>'invitation_reminder' or exists(select 1 from private.invitations i join private.applications a on a.id=i.owner_id where i.owner_id=o.applicant_id and i.redeemed_at is null and a.admitted_at<=now()-interval '10 days'))
  order by case when kind='weekly_growth' then 0 when kind='invitation_reminder' then 2 else 1 end,created_at,id for update skip locked limit 5
 ), claimed as (
  update private.outbox o set locked_until=now()+interval '3 minutes',lease_token=gen_random_uuid(),
   first_attempt_at=coalesce(first_attempt_at,now()),attempts=attempts+1 from jobs where o.id=jobs.id returning o.*
 )
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'lease',c.lease_token,'kind',c.kind,'payload',c.payload,'context',c.context,
  'email',u.email,'member_number',a.member_number,'applicant_id',a.id)),'[]'::jsonb)
 into result from claimed c left join private.applications a on a.id=c.applicant_id left join auth.users u on u.id=a.user_id;
 return result;
end $$;
create or replace function public.wtlst_email_prepare(p_id uuid,p_lease uuid,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare job private.outbox; result jsonb;
begin
 select * into job from private.outbox where id=p_id and lease_token=p_lease and sent_at is null and cancelled_at is null for update;
 if not found then raise exception 'Email lease expired'; end if;
 -- Recheck immediately before sending, including reminders queued before redemption.
 if job.kind='invitation_reminder' then
  perform 1 from private.invitations i join private.applications a on a.id=i.owner_id
   where i.owner_id=job.applicant_id and i.redeemed_at is null and a.admitted_at<=now()-interval '10 days' for share of i;
  if not found then
   update private.outbox set cancelled_at=now(),lease_token=null,last_error='Invitation no longer eligible' where id=p_id;
   return null;
  end if;
 end if;
 update private.outbox set payload=coalesce(payload,p_payload) where id=p_id returning payload into result;
 return result;
end $$;
-- Return unstarted work when a serverless invocation nears its time budget.
create or replace function public.wtlst_email_release(p_id uuid,p_lease uuid) returns void language sql security definer set search_path='' as $$
 update private.outbox set lease_token=null,locked_until=null,
 first_attempt_at=case when payload is null then null else first_attempt_at end,
 attempts=greatest(0,attempts-1)
 where id=p_id and lease_token=p_lease and sent_at is null;
$$;
revoke all on function public.wtlst_email_release(uuid,uuid) from public,anon,authenticated;
grant execute on function public.wtlst_email_release(uuid,uuid) to service_role;
-- Exclude cancelled reminders from the existing pending-email total without changing admission behavior.
create or replace function public.wtlst_admin_list(p_offset int default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_user();
 if not private.is_admin() then raise exception 'Admin access required.'; end if;
 return jsonb_build_object('applications',coalesce((select jsonb_agg(t) from (select a.*,u.email,(select count(*) from private.applications r where r.referred_by=a.id) referrals from private.applications a join auth.users u on u.id=a.user_id order by a.id desc limit 50 offset greatest(0,p_offset)) t),'[]'::jsonb),'pending_emails',(select count(*) from private.outbox where sent_at is null and cancelled_at is null),'total',(select count(*) from private.applications));
end $$;
revoke all on private.growth_applications from public,anon,authenticated;
revoke all on function private.growth(timestamptz), private.growth_schedule(timestamptz), public.wtlst_admin_growth(), public.wtlst_growth_schedule() from public,anon,authenticated;
grant execute on function public.wtlst_admin_growth() to authenticated;
grant execute on function public.wtlst_growth_schedule() to service_role;
revoke all on function public.wtlst_email_claim(bigint),public.wtlst_email_prepare(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.wtlst_email_claim(bigint),public.wtlst_email_prepare(uuid,uuid,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
