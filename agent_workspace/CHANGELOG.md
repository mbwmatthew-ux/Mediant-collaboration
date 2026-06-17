# Changelog — Mediant

Format: `[YYYY-MM-DD] Area — Description`

Most recent first.

---

## 2026-06-16

- `[Settings]` Rebuilt page into a four-tab layout (Account / Security / Privacy / Billing) with a gold-underline tab strip and a fade-in `.tabPanel`. Account tab retains all prior controls (profile, appearance, sound, help, about, sign out).
- `[Settings]` Security tab: functional change-password (`auth.updateUser({password})`, min-8 + match validation) and change-email (`auth.updateUser({email})`, confirmation-link flow); two-factor card is a frame ("Coming soon", disabled).
- `[Settings]` Privacy tab: rewrote data-handling copy to be accurate (recordings go to Supabase storage + analysis service, not sold/shared) replacing the old "stored locally, never shared" claim; real Clear-cached-recordings (`indexedDB.deleteDatabase('mediant_files')`, two-step confirm); data-export and delete-account are frames (delete routes to a mailto to the team).
- `[Settings]` Billing tab (frame): current-plan card driven by `useAuth()` subscription, Stripe-managed payment-method display (monochrome theme-aware card chip, never blue — no raw card entry), sample invoice history table with paid/refunded status pills. Labeled as sample data pending live Stripe.
- `[Settings.module.css]` Added tab strip, card body, button variants (primary/secondary/ghost/danger), status notes, tags, danger card, payment-card chip, billing table, and status pills; theme-aware via existing CSS variables, with a `max-width:700px` responsive pass.

- `[Record]` Page title updated to sans-serif "Record New Take" + subtitle; checklist redesigned with true radio-button circles (CSS `::after` inner dot); 4th checklist item added (Title & composer); timing note added below Analyze button
- `[Analysis]` Added `PRACTICE_RECS` lookup and practice recommendation box in the flagged issue detail panel (type icon + gold-tinted rec box)
- `[Analysis]` Added `computeAspectScores()` — derives per-dimension scores from flags; Session Summary tab now shows Score Breakdown grid (Intonation, Timing, Dynamics, Articulation, Technique, Tone)
- `[Progress]` Page title updated to sans-serif; added `computeTechniqueScores()` and technique progress bars card in right column
- `[Data Model]` Created `songs` table with RLS and `updated_at` trigger; `song_id` FK added to `takes`. Migration applied to production.
- `[AI Coach]` `coach-chat`: accepts `songId`, persists full chat history to `songs.chat_history` after each turn (capped at 100 messages).
- `[Analysis]` On thread switch: finds or creates a `songs` row, hydrates `chat_history` from DB into local state.
- `[Analysis]` `analyze-performance`: accepts and stores `songId` on the new take row.
- `[Analysis]` Loop: timestamp is now a seek button; gold progress bar under active flag row; Loop button styled gold when active.
- `[DESIGN_RULES]` Documented song-thread data model, DB lookup flow, and Loop interaction spec.

## 2026-06-05

- `[Landing]` Hero logo centering: added `padding-left: 50px; box-sizing: border-box` to `.heroLogoLarge` to compensate for `logo-mark.png` internal canvas offset (+25px visual correction)
- `[Landing]` `.parallaxNode` now uses `width: fit-content; align-self: center` to prevent silent full-width expansion that caused left-aligned heading text
- `[Analysis]` Redesigned Analysis page with timeline UI and WaveformTimeline component
- `[Analysis]` Added Session Summary tab to Analysis page
- `[AI Coach]` Fixed alternating message ordering in `ask-coach` edge function — enforces user/assistant alternation before sending to Anthropic API
- `[AI Coach]` Fixed CORS headers missing on error response paths in edge functions

## Earlier

- `[Landing]` Shuffle cards redesigned to notification-stack layout with green-tinted ghost cards
- `[Landing]` Per-character fade animation on hero text (replaced text scramble)
- `[Landing]` Stacked shuffle cards with blurred ghost content and darker glass
