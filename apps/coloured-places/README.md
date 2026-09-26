# coloured-places

A **sentry, not an admin panel** — the operator surface for the `minilab.work`
ecosystem. Its one job: *"Yesterday we believed this place was healthy. Is that
still true?"*

Every part of the system is a **place** — a coloured square you can open. A
place answers, at a glance, whether it is healthy, needs a look, is stale,
unknown, or offline. Built mobile-first as a PWA; on a desktop it renders as a
centered phone-sized mini-app.

## The five-state grammar

| State | Card | Meaning |
|---|---|---|
| **Healthy** | full colour | checked recently, all good |
| **Needs a look** | full colour + orange **!** | something's materially off |
| **Stale** | full colour, dimmed + clock | haven't checked lately |
| **Unknown** | **full colour** + neutral **?** | we've lost sight — *not* down |
| **Offline** | grayscale + bright **!** | proven down |

**Grayscale is sacred** — only *Offline* greys, and only when we're certain our
side is up **and** the vitals are definitively not coming. Not-knowing never greys.

## What's inside a place

Each place renders one canonical template: a big identity card that rolls up to
its **single worst aspect**, a horizontal rail of actions, a "talk to the agent"
button, and the **What's here** list — operational health *aspects* (label ·
state · value · freshness), or the exists-vs-should reconciliation for generic
places.

The per-place contracts (what each place monitors, where "should exist" and
"actually here" come from, and how it renders) live in
[`docs/place-contracts.md`](docs/place-contracts.md).

## Stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · **Tailwind CSS 4**
- **framer-motion** for the elastic action rail
- **lucide-react** for icons

> Note: this repo pins a modified Next.js build — read `AGENTS.md` before writing code.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Live control-plane data comes from environment
variables (`MODES_CONTROL_PLANE_BASE_URL`, `LAB_ID_OPERATOR_TOKEN`); without them
the app renders honestly-mocked placeholder signals.

## Role in the namespace

- `places.minilab.work` — this app: product UI and operator surface
- `core.minilab.work` — Rust control plane and node services
- `library.minilab.work` — central home for official docs
- `bringup.minilab.work` — bootstrap, bring-up, installation, verification
