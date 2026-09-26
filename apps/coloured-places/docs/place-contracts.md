# Place Contracts

The backend spec, one place at a time. Built from interviews with the operator.
Each place's adapter must fulfil the contract below so the UI can render it
through the single canonical `PlaceScreen` template with no per-place code.

> **Guiding principle — this app is a *sentry*, not an admin panel.**
> Its one job: *"Yesterday we believed this place was healthy. Is that still
> true?"* Between yesterday and today, agents deployed things, humans deleted
> things, credentials expired, migrations half-ran, APIs changed. The app just
> has to notice that the floorboards moved overnight — not understand the whole
> institution.

---

## Global model (applies to EVERY place)

These came out of the SUPABASE interview but are cross-cutting. Lock them once.

### 1. Status vocabulary — five states, not three

The current app has three (healthy / problem / offline). The real model needs
five, because "we can't see it" and "we haven't looked lately" are NOT the same
as "it's down".

| State | Meaning | Front-page card |
|---|---|---|
| **Healthy** | Checked recently; everything agrees with expected. | Full colour, no mark |
| **Needs a look** | Checked recently; found something materially different or wrong. | Full colour + orange **!** |
| **Stale** | No fresh check — last state may be outdated. | Full colour, slightly dimmed + small clock. *No alarm.* |
| **Unknown** | We can't establish reality (creds broken, observer down). We don't know. | **Full colour, unchanged** + subtle **?**. *Colour must NOT drop* — greying would falsely say "down". |
| **Offline** | We are certain it is unavailable. | Grayscale + bright orange **!** |

**Grayscale is sacred — it means "down", and we only earn it with two certainties:**
1. **We are 100% sure our own side is up** (our observer is healthy and reporting), and
2. **We are 100% sure the vitals from that place are not coming.**

Only then is a place **Offline**. If our observer is broken, our credential
expired, or we simply haven't checked — the place keeps its colour (**Unknown**
or **Stale**). *Not knowing is never the same as being down.*
(If Powerfarm loses its Supabase credential, Supabase didn't disappear — our
ability to observe it did.)

### 2. Rows are *aspects*, not raw inventory

A place's "What's here" list is a small set of **operational health aspects**,
each with a state + freshness — NOT a dump of low-level resources. Detail
(actual table names, migrations, diffs) is revealed only on tap / ask-the-agent.

> If someone deletes a Registry table, the card says `Database structure — Needs a look`,
> not `registry.identities table missing` with a Postgres relation oid.

### 3. Freshness on every observation

Every aspect carries *when it was last checked*. This is what makes Stale and
Unknown possible, and lets the UI say "healthy now" vs "last checked 6h ago".

### 4. Three-way comparison

Don't compare only against abstract intent. Compare against the last healthy
observation too:

```
EXPECTED         what the place manifest says should be there
LAST KNOWN GOOD  what was actually there when last healthy
NOW              what the probe sees today
```

This catches the nightmare case: `Database structure` was OK yesterday, differs
today → "one expected structure disappeared since the last healthy observation."

### 5. Probe rhythm — tiers, not one giant scan

Each aspect is refreshed on its own cadence; each result gets freshness.

- **FAST** — reachability: project up? db up? observer working? function smoke checks?
- **STRUCTURAL** — expected shape still there? functions deployed? buckets present?
- **PLATFORM** — provider alerts/advisories, backup status, capacity/security warnings.
- **ON DEMAND** — full re-check when the operator taps "Re-check now".

### 6. Actions default to observational

Start read-only (re-check, explain, open). "Fix what changed" comes later and
should *guide* a repair, not have the little app directly editing infrastructure.

---

## SUPABASE — `Is the infrastructure holding Powerfarm's Registry healthy and still shaped the way we expect?`

**Boundary:** Supabase is the Registry's *infrastructure home*, NOT the Registry
UI. This place answers *"is the place that holds our Registry healthy?"* — never
*"what identities are registered?"* (that belongs to POWERFARM). No registry
rows, identities, contracts, or Postgres internals on this screen.

### What lives here (the aspect rows)

| Row | What it really checks |
|---|---|
| **Supabase project** | Project still exists and responds |
| **Database** | Postgres reachable and basic health sane |
| **Database structure** | Critical expected structures still exist and match expectation |
| **Supabase alerts** | New security/performance/platform advisories needing attention |
| **Edge functions** | Expected functions exist and health probes succeed |
| **Backups** | Backup/PITR capability exists; most recent state acceptable |
| **Storage** | Required buckets/services available (only if Powerfarm uses them) |
| **Observer** | We can still perform all of the above with fresh evidence |

Explicitly **out of scope here:** registry entries, identities, rows, contracts,
`authority_revision`, relation oids — those are Powerfarm's, not Supabase's.

### Should-be-here source (intent)
A small **Powerfarm place/config manifest** declaring the Supabase services we
expect to exist and be healthy (project exists, db reachable, expected edge
functions, backups enabled/current, required services available). Infrastructure
intent — not Registry contents.

### Actually-here source (observed)
Direct Supabase observation, each carrying freshness:
- Management API for project/service state
- SQL health/introspection for Postgres
- Supabase alerts/status where available
- direct health probes to Edge Functions
- backup/recovery metadata
- simple reachability checks

### What genuinely goes wrong (surface these loudly)
- Supabase / project / database unavailable
- Supabase raised an alert needing attention
- database degraded or reporting a problem
- an expected Edge Function missing or failing
- backups stale / failing
- our observation of Supabase has gone stale
(Low-level inventory drift matters *only* if it affects something Powerfarm depends on.)

### Actions (observational first)
Re-check now · What should be here · What's actually here · Explain what needs attention · Open Supabase
(Later: "Fix what changed" guides a repair — no direct editing at first.)

### Offline
Only when we have **positive evidence** the project/database is unavailable.
Broken credentials / failed observer / no recent check → **Unknown** or **Stale**, never Offline.

### Example "What's here"
```
Project             OK
Database            DEGRADED
Supabase alerts     2 OPEN
Edge functions      1 FAILING
Backups             RECENT
```

---

## POWERFARM — `Is our identity institution healthy?`

The identity institution itself (runs on LAB 8GB; data in Supabase). What the app must show:

- **Identity app online** — the app is up and answering.
- **OAuth 2.1 link** — connected to the Identity OAuth 2.1 server (on Supabase).
- **Entity auth methods** — can entities actually connect to other services via **OAuth**, **Passkey**, and **Magic link**? Each is its own probe — one can fail while the others work.

_Suggested additions:_
- **Token/session health** — issuance, refresh, and *revocation* all working (revocation matters most for authority).
- **Clock correctness** — OAuth/passkey are time-sensitive; NTP drift silently breaks them (ties to LAB 8GB time-sync).
- **Signing keys / client secrets** — nearing expiry → **At risk** *before* they fail.
- **Auth failure rate** — a spike in failed logins/handshakes = misconfig or attack.

## THE LABS — three Mac minis

The three LABs are **physical Mac minis** and are **Powerfarm's infrastructure**.
They share a **machine layer** (real hardware — this is where Offline/Unknown/
Stale truly earn their keep) and each carries a distinct **purpose**.

- **LAB 512 — Operations.** The workhorse: heavier inference (a medium-sized model) and the heavier jobs.
- **LAB 8GB — Capital.** The *least powerful* mini (8 GB RAM) — yet it deliberately holds the crown jewels: **identity and authority**. Also light inference. The weakest box carries the most precious, most stable role.
- **LAB 256 — Workbench.** Everything here is a *draft* until it is **promoted or deployed** to the LABs.

### Boundary (identity spans three places — keep them distinct)
_Proposed, pending confirmation:_
- **POWERFARM** = the *institution* — is identity/authority correct and trustworthy? (contents, policies, trust graph)
- **LAB 8GB (Capital)** = the *machine* that runs it — is the box holding identity/authority up, powered, uncompromised?
- **SUPABASE** = the *data infra* — is the store behind the Registry healthy?

So: identity data at rest → Supabase; identity/authority runtime + keys → LAB 8GB; the institution's correctness → POWERFARM.

### Shared machine layer (all three minis)

Captured so far — probes still to pin down:

- **Machine reachable** — the mini is up and its heartbeat is arriving. (Vitals present + our side up = healthy; vitals absent + our side up = **Offline**; can't tell = **Unknown**.)
- **Power / UPS** — all three run **24/7 behind a UPS**. Watch: on-mains vs on-battery, battery level. On-battery = "needs a look".
- **Maintenance agents** — each mini runs launched **maintenance / hygiene / anti-configuration-drift agents** that keep it clean. Watch: are they alive, when did they last sweep, did they find/repair drift? (Open question: are these agents *our observer*, or self-healers the app watches from outside?)
- **512 ↔ 8GB ethernet link** — a physical cable between Operations and Capital that is **vital for their interchangeability**. The link's health is a shared aspect that should surface on **both** cards. (Open question: what exactly does interchangeability buy — failover? shared work? — and what breaks if the cable drops?)

### Shared machine hygiene (all three minis) — this is what the anti-drift agents watch

**Key insight: hygiene reuses the existing 5-state grammar — nothing new to invent.**
"Cluttered for no reason" *is* Stray/Unused. So:

- **Memory (RAM)** — healthy, or under pressure / swapping / a leaking hog? ("cluttered for no reason")
- **Login items & background jobs** — every launch-at-login item / LaunchAgent / LaunchDaemon should be **registered AND necessary**:
  - unknown startup item → **Stray** ("should this be here?")
  - expected but gone → **Missing**
  - registered but nothing uses it → **Unused**
- **Registered things present/live** — every item on this machine's registered list is present and live; extras get flagged **Stray** → "should this be registered?" (the core reconciliation, per machine).

### Per-LAB purpose

**LAB 512 — Operations**
- **Inference runtime** on?
- **Models** healthy — loaded, responding, expected version?
- Registered-things reconciliation (present/live? extras? register the extra?) + hygiene above.

**LAB 8GB — Capital** (highest criticality — down/tampered = authority compromised → loudest signals)
- **Antenna ingress** working — for *everything it claims* to route?
- **Minivault** accessible **and secure**?
- **Heartime** pulsing?
- **Powerfarm research institute** on?
- Identity/authority runtime (the machine side of POWERFARM) + hygiene above.

**LAB 256 — Workbench**
- Registered-things reconciliation (present/live? extras? register the extra?)
- Draft → **promote/deploy** pipeline healthy (stuck drafts, half-landed promotions) + hygiene above.

### Extra monitors I'd add (adaptations)

Physical minis as 24/7 critical infra — cheap to check, expensive to miss:

- **Disk** — SSD fill %; a full disk fails everything silently. (If 512/256 are storage sizes, doubly relevant.)
- **Thermals** — 24/7 minis throttle; temperature / fan.
- **Time sync (NTP)** — clock drift breaks OAuth/passkey/tokens. Security-critical on 8GB. *(Is "Heartime" this?)*
- **Unexpected reboot / uptime** — a reboot you didn't order reset state and re-ran login items → needs a look.
- **Pending OS update / restart-required** — drift + surprise-downtime risk.
- **Security posture (8GB especially)** — FileVault on, firewall on, no unexpected listening ports / SSH exposure / login sessions. Tamper watch for the crown jewels.
- **Cert / key / secret expiry** — TLS, signing keys, client secrets → **At risk** before they break.
- **Own network reachability** — the mini's LAN/WAN, separate from the 512↔8GB link.
- **Backup freshness** — recently backed up? (careful with key material on 8GB.)

### Ways this stays fine on the app (rendering)

- **One row per aspect:** name + 5-state + freshness. Reuses the existing Area-2 list — no new UI.
- **Card verdict = the single worst aspect** ("Minivault — needs a look"), so the one-liner is always the most important thing on the machine.
- **Severity weighting per place:** 8GB identity/authority/minivault = critical (can hard-flip the card); RAM clutter = a gentle nudge. Uses the existing per-item `severity`.
- **Group the list** into small sections for a long machine: **Services · Machine · Hygiene** (or keep flat worst-first).
- **Freshness per row** makes Stale/Unknown honest — a row can read "OK · 2m ago" vs "OK · 6h ago".

Example **LAB 8GB "What's here"** (card rolls this up to the worst line):
```
Antenna ingress     OK
Minivault           SECURE
Heartime            PULSING
Research institute  OK
Identity/authority  OK
Machine             OK
Power (UPS)         ON MAINS
Memory              1 HOG          ← "cluttered for no reason"
Login items         1 STRAY
Registered things   OK
Link to 512         OK
Disk · Thermals     OK
Time sync           OK
Security            OK
Observer            2m ago
```

### Offline / Unknown / Stale (the whole reason this grammar exists)
- **Offline** — our side is up AND the mini's vitals are definitively not arriving (powered off, crashed, cable pulled with UPS confirming power).
- **Unknown** — we can't establish it (heartbeat agent down, our observer down, creds bad).
- **Stale** — no fresh heartbeat within the freshness window, but not confirmed absent.

### Open questions to finish the LAB contract
1. **Vitals source:** how does a mini report — a small heartbeat/agent on each reporting to a control plane? What's the freshness window before Stale?
2. **UPS:** what do we read (on-battery flag, battery %, runtime remaining)? Does on-battery alone = "needs a look" or something stronger?
3. **Maintenance agents:** are they our observer, or separate? What should the card say about them?
4. **Ethernet link:** what does interchangeability enable, what fails if it drops, and how do we detect it?
5. **LAB 256 "Workbench":** what's a healthy workbench, and what are its real actions (promote, deploy)?
6. **Identity split:** confirm the POWERFARM / LAB 8GB / SUPABASE boundary above — data-at-rest vs runtime+keys vs institution.

## GENERIC / DEFAULT CONTRACT — the LAB 256 pattern

**These places are all the same shape as LAB 256's core:** a *registered list vs.
reality*. No bespoke services, no physical-machine layer — just:

- **Registered things** — every item on this place's registered list is **present and live**?
  - here but not registered → **Stray** ("should this be registered?")
  - registered but gone → **Missing**
  - registered but nothing uses it → **Unused**
  - here but changed from how it should be → **Out of sync**
- **Reachable** — the place/service itself is up (the machine question, minus the Mac-mini hardware).
- **Observer** — we can still check it, with freshness (→ Stale / Unknown honestly).

This is the **default adapter**. Any new place gets it for free. Only the
*contents* of the registered list differ:

| Place | Descriptor | Its "registered things" are… |
|---|---|---|
| **LAB 256** | Workbench | drafts + whatever's registered on the bench (plus promote/deploy) |
| **Flows** | Orchestration | registered workflows — present / live / extra? |
| **App Park** | Execution surface | **a folder** — apps inside inherit **privileges + Powerfarm identity** by being here |
| **Engine Park** | Runtime | **a folder** — engines inside inherit **privileges + Powerfarm identity** by being here |
| **G. Drive** | Backup | expected backups & archives — present **and fresh**? |
| **Settings** | Policy | registered policies / flags — present **and as declared** (drift = Out of sync) |

Flavours within the same grammar (no new UI):
- **App Park / Engine Park are folders where placement itself grants privilege + a Powerfarm identity.** So a **Stray** here is NOT benign clutter — an unregistered app/engine that landed in the folder *now holds powers and an identity it may not deserve*. Stray/extra here is **critical severity** (privilege/identity escalation) and links straight to **POWERFARM** (placement = an identity-granting act). "Is there anything in here that shouldn't be?" is a security question.
- **G. Drive** cares about *freshness* of each backup (a stale backup = **At risk**).
- **Settings** cares about *drift* (a flag changed from declared = **Out of sync**).

---

## Where we are

- **Bespoke:** SUPABASE (infra health), POWERFARM (identity institution), LAB 8GB (Capital — identity/authority + named services), LAB 512 (Operations — inference/models).
- **Machine layer:** shared by the three physical minis (heartbeat, UPS, hygiene, 512↔8GB link).
- **Generic default:** LAB 256 and the five above.

**Still open:** the small clarifiers (Heartime = NTP?, what makes minivault "secure", 512/256 = storage), the machine-layer probe details (vitals/freshness window, UPS reads, maintenance-agent role, ethernet-link detection), and LAB 256's promote/deploy actions.
