# WTLST — Door Test awareness pilot

## What ships
- A standalone, public, indexable page at `https://thewtlst.com/the-test`.
- Three short editorial questions, four result archetypes, and native sharing (with clipboard fallback).
- Link from the test result to the existing WTLST waitlist homepage.
- No authentication, cookies, tracking pixels, analytics SDKs, new tables, or calls to WTLST application/member APIs.
- No homepage change. No admission-rule, ranking, privacy-policy, RLS, email, or scheduled-job change.
- Shareable result query strings such as `/the-test?result=wildcard`; links have a canonical URL to avoid duplicate indexing.
- A new sitemap route containing the homepage and test.

## Proposed audience
Curious people who enjoy personality quizzes, identity and status games, social experiments, alternative communities, and selective memberships. This is a *hypothesis*, not a validated audience definition. The WTLST site describes itself as a worldwide membership experiment; do not promise any concrete member benefit or admission outcome.

## Distribution hypothesis
An engaging, playful test can earn shares more naturally than a generic SEO article. It does not require prospective members to understand the WTLST admission system before engaging.

## Launch sequence (manual approval required)
1. Review draft PR, inspect mobile and desktop preview, review content and brand voice.
2. Merge/deploy through the existing WTLST Vercel project only after approval.
3. Smoke test `/the-test`, its result URLs, homepage CTA, share sheet, clipboard fallback, semantic keyboard navigation, 404 behavior, and sitemap.
4. Make 2-3 organic social creative posts about the *social question*, not a generic "join my waitlist" appeal. Example:
   - "One seat left. Who gets it: the person who builds, challenges, connects, or surprises?"
   - "Would you invite yourself? Three choices. No right answer."
   - "Everyone wants to belong. Who gets to choose?"
5. Share in relevant spaces *only where permitted*, as useful discussion, not as spam or undisclosed promotion.
6. Review existing WTLST verified-applications, referrals, and admissions reporting weekly. Track manually where links were posted and post-level impressions/clicks (if the external platform provides these), noting that the current site deliberately has no per-page visit tracking or campaign-level attribution.

## What not to claim
- The test measures personality, fitness for membership, admission likelihood, or someone's chance of acceptance.
- WTLST membership confers any specific benefits that are not already documented.
- A rise in verified applicants is attributable to this page without evidence.
- SEO traffic or revenue is guaranteed.

## Initial evaluation
Run an initial two-week editorial experiment following launch. Review:
- External shares, replies, comments, post clicks where available.
- Verified applications and referrals versus the preceding 2 weeks, with seasonality and small-sample caveats.
- Qualitative feedback on clarity and brand perception.
- Whether any spam/privacy/support issues occurred.

No automatic publication, paid promotion, mass messaging, deals, or use of applicant information for marketing without a separate decision and appropriate consent.

## OpenAI-powered growth operator (not deployed by this PR)
A future separate scheduled workflow can use the OpenAI API on server-side infrastructure to:
- Research underserved audience and content opportunities.
- Produce evidence-backed test briefs with demand, competitiveness, audience fit, risks, and monetization path.
- Rank experiments and open **draft PRs** for review.
- Use aggregate WTLST growth stats (not raw applicant data) after the existing private admin access model is respected.
- Track costs and proposed decisions; no autonomous publishing, email outreach, affiliate negotiations, or payment commitments.

The agent needs an OpenAI API key configured as a protected deployment secret, a deployment target, daily/weekly limits, and operator approval before activation. This PR **does not** contain an agent runtime or API calls. Avoid conflating a static, functional pilot with a deployed autonomous agent.
