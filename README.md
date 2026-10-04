# Waterloo Day

Private, single-owner class calendar. Connect a Waterloo Portal iCal subscription URL in the app. Feed URLs remain in server-side D1 and are never returned to the browser. Keep the Site owner-private: sharing would also share this calendar.

## Midnight updates

Once a real feed is connected and verified, create a linked Sites schedule at 00:00 America/Toronto. Each run must read this Site through get_site, confirm owner-only access, obtain its supported service access credential, and POST /api/refresh at its current_live_url with OAI-Sites-Authorization. Then GET /api/schedule using the same access and check syncedAt and error. Never place credentials in prompts or logs. Preserve the last successful schedule on fetch/parse failure. Stay quiet on an unchanged schedule; report refresh failures or meaningful course/time/room changes. A disconnected response means setup is still pending, not a successful sync. Data updates do not require rebuilding the Site.

The importer expands recurring events and exceptions, excludes cancelled events, reads locations, and replaces the next calendar month's snapshot on each successful refresh. Floating times use America/Toronto; embedded VTIMEZONE definitions are respected.

## Development

Use the bundled Node runtime and pnpm. Start with node scripts/run-framework.mjs dev. Generate schema migrations with node node_modules/drizzle-kit/bin.cjs generate. Platform publishing applies migrations.
