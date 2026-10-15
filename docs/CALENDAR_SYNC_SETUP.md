# Calendar synchronization setup

Acervo now supports two calendar paths:

- `⬇ .ics`: downloads the current agenda immediately.
- `🔗 Sync`: creates a private read-only URL that Google Calendar, iCloud, and Outlook can subscribe to. Those services refresh subscribed calendars on their own schedule.

The sync URL is a credential. Anyone who has it can read that user's calendar, so it must not be posted publicly. It can be regenerated or revoked from Acervo.

## Supabase setup

Review and run this migration manually in the Supabase SQL Editor:

```text
supabase/sql/calendar-feed.sql
```

This agent does not run SQL against the production database.

## Deploy the feed function

From a machine with the Supabase CLI authenticated and the project linked:

```bash
supabase functions deploy calendar-feed --no-verify-jwt
```

`--no-verify-jwt` is required because Google Calendar, iCloud, and Outlook will request the feed URL without a Supabase user JWT. The random feed token is the credential; the Edge Function stores only its SHA-256 hash.

## Local validation

```bash
docker compose run --rm test npm test
docker compose run --rm test npm run test:security
```

After the migration and deployment, create a link from Agenda → `🔗 Sync`. Test the generated URL manually with a placeholder for the real token:

```bash
curl -i 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/calendar-feed?token=PASTE_TOKEN_HERE'
```

The response should be `200`, `Content-Type: text/calendar`, and must not expose JSON or Supabase credentials. To revoke access, use the Acervo Sync dialog; no production SQL query is required for normal use.
