# Coloured Places admission — 2026-09-15

This app is `pf.coloured-places`, Registry identity
`cb690740-ffd8-439a-8d54-d9284e729443`, admitted under app contract v2.

- Place: `pf.app-park.8gb`.
- Bytes: `/Users/danvoulez/App Park/coloured-places` on lab-8gb.
- Source: https://github.com/powerfarm/powerfarm-coloured-places.
- Human route: https://places.minilab.work.
- Login: existing Powerfarm Identity OAuth issuer, PKCE and server-side session.
- Operator: the existing `pf.danvoulez` identity link is required; being any
  authenticated Supabase user is insufficient.
- Observability: accepted client contract `coloured-places.observability`,
  `f5bde058-9e7e-465d-9938-9744046cb5a1`, under `antenna.http`.
- Accepted terms SHA256:
  `27ae1700cb25feaa05317e56e1dd68f4ab4434ff552d5b0b3dcf3c25ea3b4147`.
- Limits: 65,536 bytes; no external delivery destinations; expires
  2026-12-14T08:39:58.899649Z.

## Runtime

The existing LaunchAgent `com.minilab.app.places` serves port 4176. Its private
configuration is in `.env.local`; credentials are outside Git under
`~/.config/powerfarm/coloured-places/` with mode 0600.

On startup the app observes Antenna's public health and sends that observation
through its own accepted contract. Antenna executes the storage/inspection
graph and returns a durable receipt. The latest successful observation and
receipt are also retained in the app's private state file.

`GET /api/health` is public and reports only this process's identity/liveness.
Authenticated `GET /api/observability` returns the last observation, receipt and
freshness. Same-origin authenticated `POST /api/observability` requests a new
observation. After two minutes without a new observation the record is stale.
No periodic scheduler was installed. Heartime remains empty.

This initial probe observes Antenna only. It does not establish the health of
all places or turn the existing placeholder cards into live infrastructure
measurements. Authentication starts at `/login` and reuses the existing login
UI; no new login form is implemented in this app. The OAuth flow and session
adapter are adapted from `powerfarm-identity` commit `117c65d`.

The app contract declares brand version 0.5.1 as the admission target. The
existing Coloured Places visual design remains; this is not a claim that its
styles have already been migrated to the shared brand package.
