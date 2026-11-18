# WTLST — OpenAI Digital Asset Opportunity Scout

This is a **separate, approval-gated research operator**, not an extension of WTLST's admissions or email system. WTLST remains the first awareness experiment; other digital asset opportunities must use their own brands, repositories and domains.

## What the agent actually does

- Once a week, calls the **OpenAI Responses API** with the `web_search` tool to research a single WTLST awareness test plus exactly three independently monetizable niche assets.
- Requires at least two cited source URLs for every idea (URL format validation only; **not independent fact checking**).
- Scores demand intent, commercial potential, competitive gap, distribution fit, and maintenance ease from 0–5, with explicitly uncertain estimates and verification tasks.
- Creates a **GitHub issue for human review**, not a deployed website, paid advertisement or publication.
- Skips if a report issue for the same UTC date already exists among the most recent 100 issues; GitHub's issue API retains the report.

## Safety boundaries

- **Disabled by default:** the GitHub Actions workflow runs only with repository variable `OPENAI_SCOUT_ENABLED=true`.
- No checkout/publishing/write permissions to website code. Its token gets only `contents: read` and `issues: write` in this workflow.
- The OpenAI API credential exists only as a GitHub Actions secret; never expose it in frontend code, project files, issues, or PR descriptions.
- The operator doesn't read Supabase, applicant information, CRM data, analytics, or user emails.
- No auto-merges, website modifications, paid ads, domain registrations, signups, direct messages or outreach.
- ChatGPT Plus does **not** include OpenAI API credits. API use and web-search calls incur usage-based charges separately; the exact bill depends on the current API price schedule and run complexity.
- Workflows are a research assistant, not proof of keyword volume, affiliate approval, SEO performance, revenue, or profitability.

## Setup after cost and privacy approval

1. Review the code and security/cost boundaries in the separate draft pull request. Run `node --test operator/*.test.mjs`.
2. Create an OpenAI API key in the OpenAI Platform account with an appropriate project and budget/usage alerts. **Do not paste the key into ChatGPT.**
3. In GitHub, open the WTLST repo → Settings → Secrets and variables → Actions. Under **Secrets**, create `OPENAI_API_KEY` with the API key.
4. Under **Variables**, optionally set `OPENAI_SCOUT_MODEL` to a supported web-search and structured-output compatible model. The operator defaults to `gpt-5-mini`; check availability in the connected API project.
5. Under **Variables**, set `OPENAI_SCOUT_ENABLED` to `true` only after you approve the cost and understand that scheduled runs will make API calls.
6. In the Actions tab run **OpenAI Opportunity Scout → Run workflow** for a first test, inspect the new GitHub issue, factual evidence, costs and model output.
7. If acceptable, keep the scheduled Monday run. To stop all API charges from this operator, set `OPENAI_SCOUT_ENABLED=false`; removing the key also prevents calls.

## Scheduling

GitHub Actions runs Monday at **08:00 UTC**, equivalent to **09:00 in winter (CET)** and **10:00 in summer (CEST)**. GitHub scheduled jobs can be delayed. The separate ChatGPT weekly opportunity-scanning task may surface some of the same research; this code is an additional repository-based and reviewable source.

## Testing and known limits

Run `node --test operator/*.test.mjs`; unit tests make no network calls. Integration verification must be completed after approval with a real project API key.

Known limitations:
- No live search-volume API, analytics integration, referral attribution, Search Console metrics, actual affiliate payout confirmation, or autonomous publishing.
- Web sources may be unreliable or stale. The operator asks the model to use current sources and flags uncertainty, but model outputs remain unverified suggestions.
- GitHub `issues?per_page=100` date deduplication is a first-pass safeguard, not a complete paginated history.
- The optional budget limiter is OpenAI project billing configuration; the script limits output tokens but does not enforce a dollar spending cap itself. Scheduled and manual runs can each incur API usage.
- A report cannot be considered a shipped digital asset or a validated business until an independent review and experiment establish actual user demand.

## Next phases (not in this PR)

1. Read-only aggregated WTLST funnel reporting with explicit database authorization and no visitor tracking unless separately approved.
2. Agent-generated **draft** pull requests for additional pages, with CI and human approval before merges.
3. Separate repositories for new digital assets after a validated niche and monetization strategy.
4. Privacy-compliant analytics and measurement where useful and approved; affiliate disclosures and individual program approval before monetization.
