# Mediant pre-launch security + UX/accessibility audit — 2026-07-01

Multi-agent audit (48 agents, 34 verified findings → 22 after dedupe). This file
records what was **fixed in code** (this branch) and what **only the owner
(matthewwu) can do** in the Supabase / Vercel / Stripe / Modal dashboards.

---

## ✅ Fixed in code (this branch)

### Security
- **CRITICAL — subscription self-grant.** Removed the `Users can upsert own
  subscription` RLS policy (new migration `20260701_security_hardening.sql`).
  It let any logged-in user set their own `subscriptions.status = 'active'`,
  bypassing billing. The Stripe webhook (service role) still writes legitimately.
- **HIGH — open Anthropic-key endpoints.** Deleted the four unauthenticated
  Vercel functions `api/coach-chat.js`, `api/ask-coach.js`,
  `api/progress-feedback.js`, `api/analyze-sheet-music.js` (dead code, superseded
  by the authenticated Supabase edge functions). Kept `api/search-masterclasses.js`.
- **MEDIUM — teacher/student invite bypass.** Dropped the unconstrained
  `ts_student_update` policy (same migration). The app does all invite/accept/
  decline through the `teacher-students` edge function, so nothing breaks.
- **LOW — Stripe webhook crash.** `stripe-webhook` now tolerates deleted
  customers / missing `supabase_user_id` (returns 200 + logs instead of a 500
  that Stripe retries forever).
- **LOW — welcome-email HTML injection.** `send-welcome-email` now HTML-escapes
  and length-caps the user-supplied name.
- Added `WITH CHECK` to `profiles_own_update` (hygiene).

### Accessibility / visibility (dark theme)
- **CRITICAL — dark theme broken by a token leak.** `Landing.module.css` had an
  unscoped `:root{}` that redefined global `--line` (to cream) and defined
  `--surface: #FFFFFF` app-wide, so the teacher dashboard rendered as white
  boxes with invisible text and cream borders appeared everywhere. Scoped those
  tokens to Landing's `.page`, and repointed every off-Landing `var(--surface)`
  (TeacherDashboard, the annotation inputs) to real dark tokens.
- Global keyboard-focus ring (`:focus-visible`) + explicit focus on the Takes
  search/filter and coach-chat inputs (WCAG 2.4.7).
- Raised too-small / too-faint text: table headers, day labels, skill captions,
  waveform status, mobile nav labels (~9.6px → ~11px).
- Icon-only buttons (Metronome/Tuner/UploadPiece close, PracticeLog delete) got
  `aria-label`s; PracticeLog delete is no longer near-invisible and now confirms.
- Score colors unified to `--score-good/ok/bad` tokens (Takes, Summary,
  TeacherDashboard) instead of hardcoded pre-recolor hexes.

### UX
- Login / Signup / Reset / Confirm pages restyled from cream → the dark teal
  theme (consistent landing → signup → app).
- Record page dropzone copy fixed ("under 5 minutes" → "up to 20 minutes",
  matching the real 20-minute limit).
- Session-history table now scrolls horizontally on narrow phones.

---

## 🔧 Owner actions (dashboards — only matthewwu has access)

1. **Apply the new migration to the live database.**
   `supabase db push` (or Supabase Dashboard → SQL Editor, paste
   `supabase/migrations/20260701_security_hardening.sql`). Then verify under
   Database → Policies that `Users can upsert own subscription` and
   `ts_student_update` are gone. **Until this is applied, the subscription
   self-grant hole is still open on the live DB.**

2. **Rotate the Anthropic API key** — it was reachable through the now-deleted
   public `api/*` functions. Anthropic Console → create new key, revoke old →
   update `ANTHROPIC_API_KEY` in Vercel (Project → Settings → Environment
   Variables) and Supabase (Edge Functions → Secrets). Redeploy.

3. **Redeploy Vercel** after the `api/` deletions and confirm
   `search-masterclasses` still works.

4. **Harden the Modal worker** (`modal_worker/worker.py`) — NOT changed in code
   to avoid breaking live analysis without a coordinated deploy. Recommended:
   - Give the worker its own keys via Modal secrets instead of receiving Gemini/
     Anthropic keys in each request body:
     `modal secret create mediant-ai-keys GOOGLE_AI_API_KEY=… ANTHROPIC_API_KEY=…`
   - Add an inbound shared secret the edge function must send:
     `modal secret create mediant-analyze-auth MODAL_ANALYZE_SECRET=<random>`
     add the same value to Supabase Edge Function secrets, have
     `analyze-performance` send it as a header, and have the worker require it.
   - In `worker.py`: set `docs=False`, `follow_redirects=False`, and allowlist
     the `video_url`/`score_url`/`reference_midi_url` hosts to the Supabase
     storage domain (blocks SSRF). Redeploy with `bash modal_worker/deploy.sh`.

5. **send-welcome-email** — consider turning on "Verify JWT" (Supabase → Edge
   Functions) or moving it to an auth hook, so it can't be used as an open
   email relay. (Left callable for now because the signup flow may not yet have
   a session when confirmation is required.)

6. **Stripe (still test mode)** — before going live: confirm the webhook signing
   secret is set, that `create-checkout-session` always writes
   `supabase_user_id` into customer metadata, and enable the
   `customer.subscription.deleted` event on the webhook.

---

## 🤔 Product decisions needed (not code bugs — need your call)

- **Pricing mismatch.** The homepage advertises one **Pro plan at $14/mo,
  "unlimited"**; the `/pricing` page shows **Pro at $19.99/mo** (or $14.99/yr,
  fewer features) **plus a $34.99 "Max" tier**, and contradicts itself on
  "5 uploads" vs "Unlimited uploads". Tell us the real plans/prices and we'll
  make one source of truth used by both pages.
- **Naming.** The same "record + feedback" thing is called **Sessions** (nav),
  **New Take / All Takes**, **Music Library**, and **Analysis** in different
  places. Pick ONE word ("Take" or "Session") and we'll standardize it.
- **Teacher accounts** are currently self-service (anyone can pick "Teacher" at
  signup). If you want teachers vetted before they can see student data, we'll
  move role assignment server-side + lock the column.
