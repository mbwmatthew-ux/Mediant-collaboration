# Agent Tasks — Mediant

AFTER EVERY CHANGE, WHEN APPROPRIATE, MAKE SURE TO UPDATE THIS FILE

Last updated: 2026-06-16

---

## Current Goal

**Build the song-thread model and make the analysis view feel cohesive.**

Each song should have one persistent thread. The user uploads a recording, sees analysis with Loop tied to specific flags, asks the AI coach follow-up questions, and comes back later to upload another take. The second take compares against the first. This thread never resets. 

---

## Approved Tasks

Tasks here are ready to be implemented. Coding agent picks these up in order.

_No approved tasks at this time._

---

## In Progress

_Nothing active._

---

## Needs Review

- [ ] **Settings — live backend check.** Visual + lint verified, but the functional controls (profile save, password change, email change) call `supabase.auth.updateUser` and could only be confirmed in-browser with placeholder Supabase keys. Re-test password/email/profile saves once real project credentials are in `.env` and a user is logged in.

---

## Completed

- [x] Settings rebuilt as tabbed layout (Account / Security / Privacy / Billing). Security: change password, change email (both functional), 2FA frame. Privacy: accurate data-handling copy, real cache-clear, export + delete-account frames. Billing: plan card, Stripe-managed payment display, sample invoice history. Warm theme preserved in light + dark. (2026-06-16)
- [x] Full webapp UI redesign: AppShell, Home, Library, Record, Analysis, Progress, Settings, Auth pages + Landing page (2026-06-14)
- [x] Song-thread data model: `songs` table, `song_id` FK on takes, persistent `chat_history` per song (2026-06-14)
- [x] Loop scrubbing: timestamp is a seek button, gold progress bar while looping, active Loop button styled gold (2026-06-14)
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
