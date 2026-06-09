# Agent Tasks — Mediant

AFTER EVERY CHANGE, WHEN APPROPRIATE, MAKE SURE TO UPDATE THIS FILE

Last updated: 2026-06-05

---

## Current Goal

**Build the song-thread model and make the analysis view feel cohesive.**

Each song should have one persistent thread. The user uploads a recording, sees analysis with Loop tied to specific flags, asks the AI coach follow-up questions, and comes back later to upload another take. The second take compares against the first. This thread never resets. 

---

## Approved Tasks

Tasks here are ready to be implemented. Coding agent picks these up in order.

- [ ] `[DESIGN]` Define and document the song-thread layout in `DESIGN_RULES.md`
- [ ] `[CODING]` Scaffold the persistent song-thread data model (one thread per song, multiple takes per thread)
- [ ] `[CODING]` Make Loop visible and scrubable directly from the analysis flag cards
- [ ] `[CODING]` Wire AI coach chat history to persist per song thread (not per session)

---

## In Progress

- [ ] `[DESIGN]` Review and audit current analysis view against `DESIGN_RULES.md`
                UI design changes
                Finalizing Webapp

---

## Needs Review

_Nothing here yet. QA agent fills this section after implementation._

---

## Completed

- [x] Refactored thread tab strip into a premium full-bleed top navigation bar with rounded score badges (2026-06-09)
- [x] Landing page hero logo centering (padding-left: 50px on `.heroLogoLarge` to compensate for PNG canvas offset)
- [x] Analysis page redesign — timeline UI, WaveformTimeline component, Session Summary tab
- [x] AI coach chat bug fixes (alternating message ordering, history trimming)
- [x] CORS fixes for Supabase edge functions

---

## Backlog

_Ideas that are not yet approved. Do not implement these until they move to Approved Tasks._

- [ ] Mobile-friendly dashboard view
- [ ] Coaching tone preference setting (user selects "strict" / "encouraging")
- [ ] Compare two takes side by side in the thread
- [ ] Export analysis summary as PDF
- [ ] Email digest of weekly progress
- [ ] Sheet music annotation layer (highlight flagged measures directly on the score image)
- [ ] Onboarding flow for new users
