# Fantasy Blind Spot: account and sync setup

The existing browser-only app works without accounts. Do **not** remove Safari data.

## 1. Cloud accounts (not active until configured)
Create a Supabase project, run `supabase/schema.sql` in its SQL editor, and add these **Netlify site environment variables**:
- `SUPABASE_URL`: your project's URL
- `SUPABASE_ANON_KEY`: Supabase public publishable/anon key (never service_role)
Then redeploy the site. Email/password registration is available after that. Supabase may require email confirmation. Existing locally saved rosters can be copied into the account with the "Back up my teams to cloud" button.

## 2. Roster refresh
The account dashboard can refresh rosters while the app is open, using existing Netlify import functions. An opt-in scheduled function is now present at `netlify/functions/scheduled-sync.js` (every 3 hours). Enable it only after testing the injury data source and adding **server-only** Netlify variables `SUPABASE_SERVICE_ROLE_KEY` and `ENABLE_BACKGROUND_SYNC=true`. The function attempts MFL, Sleeper and public ESPN roster sync, compares injury fields, and records changes. It does not cover private ESPN/Yahoo/NFL Fantasy. Platform injury designations are not a substitute for official practice reports. Avoid importing private information without authorization.

## 3. Injury changes / notifications
Current player injury fields are from each fantasy platform where available, not an authoritative practice-report feed. The `injury_events` table stores detected changes and the app has an in-app event history plus optional foreground browser notifications. These will be empty until server-side sync is enabled and events actually occur. Real push notifications require a licensed/reliable NFL practice/injury feed, a scheduler, notification opt-in, and protected device subscription storage. Do not tell users push alerts are operational yet.

## Security
Never share Supabase service_role keys, ESPN session cookies, password, or fantasy platform credentials with users or commit them to GitHub. Test RLS with separate accounts before accepting public users.
