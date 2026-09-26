# App Park admission verification

- Build: Next.js 16.2.1 production build and TypeScript check passed.
- Login flow: five tests cover PKCE, exact callback, state mismatch, token
  exchange and callback path normalization.
- Public `/api/health`: 200 and identity `pf.coloured-places`.
- Unauthenticated `/`: redirects to Powerfarm login.
- `/auth/start`: redirects to the registered Supabase OAuth issuer with PKCE
  and the exact `https://places.minilab.work/auth/callback`.
- Unauthenticated `/api/observability`: 401.
- Callback with invalid state: 401.
- Existing operator session: app returns 200 after verifying its Registry
  identity link. This checks authorization with a real session, not a mock.
- Cross-origin observation POST with that session: 403.
- Same-origin observation POST with that session: 200 and Antenna receipt.
- Reloaded LaunchAgent: new startup observation and receipt; private state
  remains outside the checkout.

`coloured-places-verification.json` records the HTTP and receipt checks.
`coloured-places-admission-evidence.json` records the Registry identity, both
contract acceptances, deployment revision and startup observation.
`coloured-places-deployment.json` records the initial source and backup path.

The complete human login/consent ceremony has not been exercised here. The
OAuth client retains `pending_verification` until that first login is verified.
Existing placeholder place cards are not evidence of infrastructure health.
