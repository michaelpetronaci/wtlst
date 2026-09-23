# WTLST V1 growth

## Install / deploy

Apply `GROWTH_SETUP.sql` to the existing production project **before deploying this release**. It is additive and safe to rerun. Do not rerun the older base setup after this migration. Deploy main to the existing Vercel project. No new environment variables or services are needed: existing `CRON_SECRET`, Supabase server/public keys, `RESEND_API_KEY`, `SITE_URL` and operator recipient configuration are reused.

The existing `/api/cron/emails` daily schedule remains `0 7 * * *`. Monday's invocation queues one report, uniquely keyed by the Europe/Rome calendar week. Vercel Hobby may run anywhere in the scheduled hour: 08:00–09:00 CET / 09:00–10:00 CEST. Reports summarize the prior seven days ending Monday 00:00 Rome. Daily invocations queue one reminder for admitted members whose invitation is still unused at 10 days, normally delivered at age 10–11 days. No test members or test emails are created in production.

## Privacy / measurement

All funnel counts derive from verified applications and invitation state. No raw IPs, fingerprints, cookies, public tracking endpoint or third-party analytics are added. Homepage visits, unfinished applications, shares and link clicks are deliberately **not measured**: without visitor tracking they cannot supply a reliable conversion denominator. The dashboard labels the measurable conversion (verified referred applicants who become members). Every applicant already has a referral code; verified referrals and top referrers derive from `referred_by`.

A new application redeemed within its creation transaction has invitation acquisition. Existing waiting applicants retain direct/referral acquisition when later admitted via invitation. Invitation admission is independently recorded by the redeemed invitation. Invitations generated use their owner's admission time; average/median redemption age uses that timestamp. Top referrers expose only internal application/member numbers, never emails, names, cities or answers. Historical totals reflect retained accounts; account deletion can change them. No application/admission/redemption/member-numbering/ranking RPC changes.

## Reliability

Existing private RLS, security-definer empty search paths and verified admin guard remain. Scheduler and email lease methods are service-role only; cron uses the existing bearer secret. Unique applicant/kind prevents repeat reminders; a unique report key prevents repeat weekly reports. Payloads freeze before submission and retain the existing Resend idempotency key. Reminder eligibility is checked at queue, claim and immediately before provider submission. A redemption that races after the final database check cannot atomically cancel an external provider request already in flight.

Daily delivery drains up to 60 queued messages with a serverless time budget, returning unstarted leases. Remaining messages wait for another invocation or existing admin retry. As before, uncertain provider deliveries stop retrying after 23 hours to avoid exceeding Resend's idempotency window; operator inspection is needed for such incidents rather than risking duplicate email. A missed Monday cron requires operator investigation; V1 does not add another scheduler.

## Validation

Run `npm install` then `npm test` (PGlite Postgres includes base migration and growth migration, permissions, attribution, all original workflows, reminder threshold/cancellation/once-only and report idempotency). `npm run build:client` rebuilds the deployable assets. Production verification is read-only: public counts, frontend pages, admin aggregate RPC, denied anonymous access and denied unauthenticated cron. Do not invoke cron merely to test because it sends real queued messages.
