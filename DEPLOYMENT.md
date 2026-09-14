# WTLST V1 production setup

Runtime: Node.js 22, Vercel project wtlst, main branch. No payment integration, trackers, storage buckets or new SaaS.

## Database
Run the complete `WTLST_SETUP.sql` once in the Supabase SQL Editor as postgres. It is transaction-wrapped and safe to rerun. It installs:
- private.applications, invitations, admins, outbox, audit; permanent member_numbers sequence.
- Private table RLS enabled with NO direct client policies; all table/sequence/schema privileges revoked from public, anon and authenticated.
- Public read RPCs: wtlst_counts(), wtlst_member(bigint). They reveal only counts and consent-controlled public member cards.
- Authenticated RPCs: wtlst_me(), wtlst_apply(text,text,text,text,uuid,uuid), wtlst_redeem(uuid), wtlst_profile(boolean). Each binds to the verified JWT identity.
- wtlst_admin_list(int), wtlst_admit(bigint): verified identity plus private.admins allowlist.
- Service-role only email RPCs: wtlst_email_claim(bigint), wtlst_email_prepare(uuid,uuid,jsonb), wtlst_email_finish(uuid,uuid,text,text).
- Scoped SECURITY DEFINER functions with empty search_path, indexes, an operator-notification trigger and PostgREST schema reload.

## Environment
Vercel Production needs SUPABASE_URL, SUPABASE_ANON_KEY (publishable or legacy anon only), SUPABASE_SECRET_KEY (server only), RESEND_API_KEY, CRON_SECRET, SITE_OPERATOR and PRIVACY_CONTACT.
Optional SITE_URL defaults to https://thewtlst.com; EMAIL_FROM defaults to WTLST <hello@thewtlst.com>; ADMIN_NOTIFICATION_EMAIL defaults to PRIVACY_CONTACT. Set SITE_URL to https://wtlst.vercel.app during testing until the custom domain is connected.
The public config endpoint fails closed on secret/service-role keys. Credentials never go in assets.json or the source archive.
If a secret was previously returned by /api/config, revoke it in Supabase. Replacing the environment variable alone is insufficient. Redeploy after changing variables.

## Sign-in emails (required separately)
Supabase Authentication → Emails → SMTP Settings:
Enable custom SMTP. Host smtp.resend.com, port 465, username resend, password a Resend sending key, sender hello@thewtlst.com, sender name WTLST.
Supabase's default email service restricts recipients and is not production delivery.
Use the Magic Link template in AUTH_EMAIL.html; it includes {{ .Token }} as the six-digit sign-in code. Email provider OTP length must be 6. Keep email confirmation enabled. Site URL: https://thewtlst.com; allow https://wtlst.vercel.app for testing. Preserve built-in auth rate limits.

## Admin
After the intended operator has verified their email, run the query in ADMIN_SETUP.sql. It targets the configured operator email explicitly and fails if there is no verified account. Never add a public admin-signup endpoint or use a frontend admin flag as authorization.

## Delivery
POST /api/send-emails verifies the user with Supabase Auth, scopes non-admins to their own application, and awaits Resend delivery before returning. Admins can drain queued jobs. GET /api/cron/emails requires CRON_SECRET and runs once daily on Hobby, with a five-job batch; ordinary submissions and logins also drain their own jobs. No in-memory queue or work scheduled after the response.
Payloads are saved before sending and immutable across retries; each job has a lease and Resend idempotency key. Accepted emails have provider receipts recorded. Ambiguous jobs older than 23 hours stop automatically to avoid duplicate delivery beyond Resend's idempotency window; inspect the provider log before resolving those jobs. A large backlog needs operator attention or a more frequent scheduler; do not assume daily cron provides immediate delivery.

## Domains
Add thewtlst.com and www.thewtlst.com in Vercel project Settings → Domains. Redirect www to the apex. Use the exact project-specific A/CNAME records displayed by Vercel; do not guess targets.
In GoDaddy change ONLY thewtlst.com: replace GitHub Pages apex A/AAAA records and www CNAME with Vercel's displayed records. Disable GitHub repository Settings → Pages publishing. Remove CNAME from repository after Pages is disabled. Preserve MX, resend._domainkey TXT, send SPF/MX, DMARC and unrelated verification records. Leave nameservers and other domains unchanged.
Wait for Vercel Valid Configuration and certificate provisioning, then test HTTPS on both hosts, redirect, /api/config and the application flow.

## Source and tests
The repo ships prebuilt assets for predictable deployment. The full editable source is in wtlst-source.zip. Extract into a clean directory, install dependencies, run npm test, and npm run build:client to regenerate assets.json. Commit source/archive and assets together. server.mjs exports a request handler for Vercel and also runs directly with npm start on other Node hosts.
Tests cover SQL reapplication, role isolation, verified identities, duplicate application, referrals, admission idempotency, public profile privacy, one-use invitation, email leases, server routing and key rejection. Live delivery and inbox receipt must be checked separately.
