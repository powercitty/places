Remote AI Workstation UI Prompt
===============================

Use this prompt when redesigning and implementing the UI for the workstation surface in:

*   [/Users/ubl-ops/Modes/places.minilab.work](/Users/ubl-ops/Modes/places.minilab.work)

Prompt
------

You are designing and implementing the product UI for a **mobile-first remote AI workstation**.

This is not a generic dashboard, not a chatbot shell, and not a traditional admin console.

It must feel like:

*   a better chatbot
*   a better IDE
*   a better remote computer
*   one coherent workstation
*   usable from the phone first
*   available outside the local network
*   alive 24/7

The key product idea is:

**this system does not disappear after a message**

It keeps context, supervises ongoing work, acts over real files and services, resumes after interruption, and stays present when the human is away.

Architectural truth you must preserve
-------------------------------------

The UI is a surface over a deeper system.

Under the surface exist:

*   an Agent Runtime for continuity
*   Flows for ongoing behavior and automation
*   a Personal Cloud Fabric for always-on substrate
*   local and remote compute
*   a governed control plane for truth, policy, and recovery

Important UX doctrine you must preserve:

*   the product does not sell an LLM magically automating process
*   the process already exists as governed automation underneath
*   the LLM operates that automation through language
*   the human architects the goal and approves material change

So the UI should make bureaucracy feel:

*   light
*   conversational
*   fast
*   nearly invisible

While preserving the internal truth that the system is:

*   protocolar
*   governed
*   persistent
*   auditable

But that architecture is not the product surface.

The product surface is:

**a remote AI workstation that is always there**

And more specifically:

*   a serious bureaucratic machine for work
*   operated through language
*   made humane by chat, cards, previews, and clear approvals

Do not turn the UI into:

*   a card soup
*   a backend admin tool
*   a fake local browser agent
*   a generic "AI dashboard"
*   an infrastructure diagram disguised as product

Design goal
-----------

Transform the existing `minilab.work` app into the first honest product surface of the remote AI workstation.

Preserve the current live wiring to the control plane where it already exists, but redesign the experience so the user feels:

*   continuity
*   presence
*   remote control
*   supervision
*   resumability
*   workstation-ness

Current codebase and constraints
--------------------------------

Work inside this app:

*   [/Users/ubl-ops/Modes/places.minilab.work/app/page.tsx](/Users/ubl-ops/Modes/places.minilab.work/app/page.tsx)
*   [/Users/ubl-ops/Modes/places.minilab.work/app/globals.css](/Users/ubl-ops/Modes/places.minilab.work/app/globals.css)
*   [/Users/ubl-ops/Modes/places.minilab.work/components/PlaceGrid.tsx](/Users/ubl-ops/Modes/places.minilab.work/components/PlaceGrid.tsx)
*   [/Users/ubl-ops/Modes/places.minilab.work/components/PlaceCard.tsx](/Users/ubl-ops/Modes/places.minilab.work/components/PlaceCard.tsx)
*   [/Users/ubl-ops/Modes/places.minilab.work/components/PlaceCardFront.tsx](/Users/ubl-ops/Modes/places.minilab.work/components/PlaceCardFront.tsx)
*   [/Users/ubl-ops/Modes/places.minilab.work/lib/place-catalog.ts](/Users/ubl-ops/Modes/places.minilab.work/lib/place-catalog.ts)
*   [/Users/ubl-ops/Modes/places.minilab.work/lib/query-client.ts](/Users/ubl-ops/Modes/places.minilab.work/lib/query-client.ts)
*   [/Users/ubl-ops/Modes/places.minilab.work/lib/command-client.ts](/Users/ubl-ops/Modes/places.minilab.work/lib/command-client.ts)
*   [/Users/ubl-ops/Modes/places.minilab.work/lib/agent-runtime.ts](/Users/ubl-ops/Modes/places.minilab.work/lib/agent-runtime.ts)

Important implementation constraints:

*   the UI must remain constitutionally correct
*   queries reflect truth; they do not govern
*   commands must go through backend boundaries
*   no fake local agent intelligence
*   if something is not implemented, say `SOON` honestly
*   preserve mobile-safe-area behavior and mobile-first ergonomics
*   do not break the existing live integration with `minilab.work` and `ingress.minilab.work`

Product direction
-----------------

The product should no longer read primarily as "LAB cards."

It should read as:

*   one workstation
*   with active zones or surfaces inside it
*   with a living operator/runtime presence
*   with current work, current machine state, and resumable threads

The Places can remain as part of the product structure, but they should feel like operational zones inside the workstation, not the whole product identity.

At the same time:

*   do not erase the Places
*   do not turn the app into a generic shell
*   `minilab.work` should still clearly feel like `minilab.work`
*   the evolution should be deeper and more truthful, not a radical identity replacement

Core product feelings
---------------------

The UI should evoke:

*   calm power
*   remote reach
*   continuity
*   sharp situational awareness
*   workstation seriousness
*   intimacy with the machine

Avoid:

*   toy AI aesthetics
*   purple SaaS gradients
*   generic glassmorphism
*   crypto terminal clichés
*   overpacked admin-console density
*   "dashboard card" sameness

Visual direction
----------------

Aim for a visual language closer to:

*   mission control
*   remote operations deck
*   AI workstation
*   persistent machine presence

The UI should feel premium, intentional, dark, and physically grounded.

Use:

*   strong typography
*   clear rhythm
*   bold but restrained contrast
*   depth through composition, not gimmicks
*   a sense of live state without constant visual noise

Prefer:

*   one powerful top-level landing surface
*   a strong workstation header or hero state
*   visible continuity modules:
    *   active runtime
    *   current work
    *   remote reachability
    *   machine health
    *   resumable threads
*   places as secondary but still beautiful surfaces

Information architecture
------------------------

Design the top-level experience around these layers:

1. Workstation shell

This is the product identity layer.

It should answer immediately:

*   is the workstation alive
*   what is it doing now
*   what can I act on right now
*   can I trust it while away from the desk

2. Continuity layer

This should surface:

*   active agent/runtime thread
*   latest queued or running work
*   resumable tasks
*   approvals waiting
*   recent completions

3. Places layer

These remain distinct zones:

*   `LAB 512`
*   `LAB 8GB`
*   `LAB 256`
*   `SUPABASE`
*   `LAB ID`
*   `GOOGLE DRIVE`
*   `APPS`
*   `WORKFLOWS`
*   `SETTINGS`

But they should be presented as part of a broader workstation, not as isolated product identity silos.

4. Deep views

Every important surface should lead to:

*   inspectors
*   timelines
*   active session or agent view
*   command or intake surfaces

Mobile-first requirements
-------------------------

This product must work beautifully on iPhone-sized screens.

Prioritize:

*   thumb-friendly actions
*   strong vertical flow
*   no tiny status text as the primary carrier of meaning
*   sticky or stable bottom interaction zones when useful
*   safe-area aware layout
*   panels that collapse gracefully into stacked sections

The mobile user should be able to:

*   understand system state quickly
*   open the active agent
*   inspect a running area
*   launch or continue a workflow
*   review `LAB ID` intake or a waiting approval
*   trust the workstation while away

Desktop requirements
--------------------

Desktop should feel expanded, not different in identity.

It should:

*   preserve the same product hierarchy
*   use space for simultaneous visibility
*   expose more context, not a different worldview

Content priorities
------------------

The UI should prioritize these realities in order:

*   current work
*   machine aliveness
*   continuity
*   actions waiting for the human
*   trusted operational surfaces
*   deeper place-specific inspection

Do not prioritize:

*   static inventory for its own sake
*   decorative metrics with no action value
*   infrastructure vocabulary before user meaning

Also do not imply:

*   the LLM itself is governance
*   the model improvises business process
*   successful output means official truth already changed

Desired landing page outcome
----------------------------

Redesign the home screen so it feels like opening a live workstation.

A good home screen should include some version of:

*   workstation identity
*   live status banner or hero
*   active runtime / active thread
*   "continue where you left off"
*   currently running or queued work
*   remote state summary
*   place zone access

Potential top-level sections:

*   Workstation
*   Active Runtime
*   Continue
*   Running Now
*   Operational Zones

Agent experience requirements
-----------------------------

The agent surface must feel like part of the workstation, not a detached chatbot.

It should communicate:

*   persistence
*   current place context
*   current run state
*   handoff status
*   whether it is waiting, working, or needs approval

It must not imply fake competence.

If the backend is waiting on `LAB 512`, show that honestly.
If a handoff is needed, show that clearly.
If a creation flow is not yet officialized, do not imply that it is.

The agent should feel like:

*   a linguistic operator of a governed machine

Not like:

*   an all-powerful improviser
*   a magic backend
*   a fake omniscient bot

LAB ID requirements
-------------------

`LAB ID` is especially important.

It should feel like:

*   identity intake
*   registration
*   provenance-aware onboarding
*   trust and principal resolution

The UI should make it natural to:

*   register from text
*   register from photo
*   register from file
*   continue from agent handoff
*   inspect a created entity
*   review provenance and timeline

States and honesty
------------------

The UI must be truthful.

If a surface is not implemented:

*   mark it `SOON`
*   keep it visually intentional
*   do not fake runtime data

If a runtime action is pending:

*   say it is pending
*   show what the system is waiting for

If a system is live:

*   make that visibly reassuring

If the system is carrying protocol under the hood:

*   let the UI feel easy
*   but keep cards and states that materialize:
    *   intake
    *   draft
    *   validation
    *   approval
    *   blocked
    *   execution
    *   completion

Interaction design principles
-----------------------------

Use these principles:

*   every major screen should answer "what is happening now?"
*   every actionable surface should make next steps obvious
*   every deep view should preserve context on how the user got there
*   mobile actions should be few, clear, and high-confidence
*   the system should feel alive, but not noisy

Implementation guidance
-----------------------

When implementing:

*   preserve the existing real data wiring
*   do not regress server-side fetching or backend boundaries
*   reuse and evolve the current component structure where sensible
*   introduce new shared primitives if they materially improve coherence
*   keep CSS variables and visual tokens explicit
*   improve typography beyond current defaults if the codebase allows it
*   avoid generic cards unless they are made specific and intentional

You may:

*   redesign the home screen structure
*   redesign headers, shells, sectioning, and layout
*   reframe Places as zones inside a workstation
*   improve navigation, status presentation, and continuity modules
*   create stronger mobile patterns for active runtime and resumption

You must not:

*   bypass query or command boundaries
*   fabricate local agent intelligence
*   introduce fake success states
*   collapse every concern into one chat column

Desired deliverable
-------------------

Produce a UI that feels like:

**a real remote AI workstation that is present, alive, and controllable from anywhere**

The result should make a user feel:

*   "this is my machine"
*   "it is alive right now"
*   "I can continue work from here"
*   "I can trust it while I am away"
*   "I am interacting with a very good bureaucracy that does not waste my time"

Implementation plan to follow
-----------------------------

A strong execution sequence is:

1. redesign the top-level workstation home
2. create continuity modules for active work and resumption
3. reposition Places as operational zones
4. strengthen agent-shell UI and pending/working states
5. improve `LAB ID` registration and intake surfaces
6. tighten mobile ergonomics and safe-area behavior
7. refine desktop layout without breaking mobile primacy

Final rule
----------

Do not ship a dashboard.

Ship the first honest UI of a mobile-first remote AI workstation.
