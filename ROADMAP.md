# Mediant — Product Roadmap & Goals

## North Star
A musician uploads a video of themselves playing sheet music and receives specific, accurate, measure-level coaching feedback within 3 minutes — indistinguishable from what a professional teacher would say.

---

## Phase 0 — Analyzer Infrastructure (Days 1–2)
**Goal:** Make the analysis pipeline reliable and remove the 150s constraint that's causing every accuracy shortcut.

### 0.1 — Async Job Pattern ✅
- [x] DB migration: add `job_status`, `job_started_at`, `job_error` columns to takes
- [x] New Edge Function `job-status`: reads job state from DB, returns it to frontend
- [x] New Edge Function `analysis-webhook`: receives completed result from Modal, writes to DB
- [x] Gut `analyze-performance` Edge Function to ~120 lines (submit job, return jobId, nothing else)
- [x] Frontend (`Record.jsx`): poll `job-status` every 4s, navigate on done, show error on failed

**Success criteria:** User submits a recording, sees a loading screen, and gets results in 1–3 min without a timeout error. The edge function never does analysis itself.

### 0.2 — Modal Owns the Full Pipeline ✅
- [x] Add `analyze_async` endpoint to `modal_worker/worker.py`
- [x] Port Gemini direct-listening evaluation from TypeScript → Python (httpx calls)
- [x] Port Claude coaching from TypeScript → Python (Anthropic SDK)
- [x] `analyze_async` receives `gemini_api_key`, `anthropic_api_key`, `take_id`, `webhook_url` from the Edge Function and runs end-to-end
- [x] On completion: POST result to webhook, update takes row
- [x] Remove 100s video duration gate in `Record.jsx`

**Success criteria:** A 90-second recording processes fully in Modal with no timeout. All three AI sources (CREPE, Gemini, Claude) run to completion.

### 0.3 — DTW Alignment ✅
- [x] Implement `dtw_align_to_score()` in `modal_worker/worker.py` using numpy
- [x] Activate for MusicXML/MXL scores only (note data is exact enough for DTW)
- [x] Fall back to existing beat-grid alignment for image/PDF scores
- [x] Gemini evaluation (listening assessment) runs in Modal — full pitch/rhythm/technique block fed into coaching prompt
- [x] CREPE cents-offset data + Gemini assessment block both present in coaching prompt (corroboration done)
- [n/a] Full Gemini pitch transcription skipped — redundant with CREPE and adds cost; evaluation covers it

**Success criteria:** Measure numbers on flags are correct (verified manually against 3 test recordings). No more off-by-2 or off-by-3 measure errors.

### 0.4 — Cleanup 🔄 ← CURRENT
- [ ] Delete dead code: `geminiTranscribePromise` path in Edge Function, `api/analyze-performance.js` Vercel stub
- [ ] Disable Audiveris OMR path in `analyze_async` (too slow; Claude vision is better for images)
- [ ] `Analysis.jsx`: handle `job_status = processing` state when navigating directly to a pending take

---

## Phase 1 — Analyzer Quality (Days 3–7)
**Goal:** Make the output genuinely useful to a musician. Flags should be specific, correct, and actionable.

### 1.1 — Score Reading Accuracy
- [ ] Validate MusicXML upload path end-to-end (highest accuracy — structured data)
- [ ] Add user-facing option to manually enter piece title, key, time signature if OCR fails
- [ ] Show user a preview of parsed score (which measures were read) before submit

**Success criteria:** For a clean image upload, Claude reads ≥90% of notes correctly on a test set of 5 pieces.

### 1.2 — Flag Quality
- [ ] Test with piano (polyphonic), cello, clarinet — verify flag types are instrument-appropriate
- [ ] Add articulation and phrasing flag types to coaching prompt
- [ ] Ensure "warm teacher" tone holds across all flag types
- [ ] Add confidence indicator to each flag (high / medium badge in UI)
- [ ] If zero flags: show a positive "clean performance" summary instead of empty screen

**Success criteria:** 3 beta musicians review flagged recordings and rate accuracy ≥ 4/5.

### 1.3 — Analysis Quality Feedback to User
- [ ] Display trust level (high / medium / low) visibly on Analysis screen
- [ ] For medium trust: show banner explaining why + how to improve
- [ ] For low trust: don't show empty flags — show quality gate error + improvement suggestions
- [ ] Log analysis backend in DB for debugging

**Success criteria:** User always knows why they got the result they did and always has a path to improve it.

### 1.4 — End-to-End Testing Protocol
- [ ] Define test set of 5 recordings (piano, cello, wind, beginner, advanced)
- [ ] For each: manually note which measures have real issues
- [ ] Run through analyzer, compare — record measure accuracy and flag type accuracy
- [ ] Fix any systematic errors found

**Success criteria:** ≥80% of flagged measures correspond to real issues. No ghost flags.

---

## Phase 2 — Full Product (Days 8–14)
**Goal:** Everything a user needs from landing page → analysis → history → subscription.

### 2.1 — Auth & Onboarding Flow
- [ ] Confirm email → login redirect works reliably in production
- [ ] Welcome screen after signup: 3-step onboarding
- [ ] Profile: let users update name, instrument, coaching style preference

**Success criteria:** New user signs up, confirms email, submits first recording within 5 minutes.

### 2.2 — Session History & Progress
- [ ] `Home.jsx`: pull real session data from Supabase instead of hardcoded mocks
- [ ] `Takes.jsx`: show real saved takes with scores, flags, dates
- [ ] `ProgressFeedback.jsx`: wire to real session data from DB
- [ ] Streak calculation: use real session dates from DB

**Success criteria:** User with 5 sessions sees real history, scores, and streak on dashboard.

### 2.3 — Payments & Subscription
- [ ] Verify Stripe checkout Edge Function works end-to-end in test mode
- [ ] Verify Stripe webhook updates `subscriptions` table correctly
- [ ] Re-enable subscription checks in `AuthContext.jsx` (currently stubbed)
- [ ] Define free vs. paid features (suggestion: 3 uploads/month free, unlimited Pro)

**Success criteria:** Test user can subscribe, gain Pro, cancel, and lose Pro — all reflected correctly.

### 2.4 — Coach Chat
- [ ] Verify `/api/coach-chat` works with real take context (flags, score, piece title)
- [ ] Load most recent take's data into coach context automatically
- [ ] Persist chat history per-take in Supabase (currently in-memory only)
- [ ] Rate-limit the coach endpoint per user

**Success criteria:** User can ask follow-up questions about a specific flag and get accurate, context-aware answers.

### 2.5 — Search & Library
- [ ] Connect `Search.jsx` to real pieces table or expand static library to 30+
- [ ] Selecting a piece prefills instrument and title on Record page
- [ ] Add "Upload your own score" shortcut from Search → Record

---

## Phase 3 — Launch Readiness (Days 14–21)
**Goal:** Ship to real users without breaking.

### 3.1 — Reliability
- [ ] Modal worker health check: Edge Function pings Modal on startup, degrades gracefully
- [ ] Supabase storage cleanup: delete video/score files after 30 days
- [ ] Error monitoring: add Sentry to Edge Functions and React frontend
- [ ] Rate limit `analyze-performance` per user (10/day free, unlimited Pro)
- [ ] Test cold-start latency: first request after cold start < 30s

### 3.2 — Landing Page
- [ ] Replace static mockup preview with real screenshot or looped demo video
- [ ] Add "See an example" CTA showing a demo analysis (pre-loaded take, read-only)
- [ ] SEO: title tags, meta descriptions, og:image
- [ ] Lighthouse score ≥ 90

### 3.3 — Beta
- [ ] Invite 5–10 real musicians (different instruments, different levels)
- [ ] Collect structured feedback: measure accuracy, feedback usefulness, missing features
- [ ] Fix top 3 issues found in beta before public launch

### 3.4 — Final Checklist Before Launch
- [ ] HTTPS and custom domain configured in Vercel
- [ ] Supabase RLS policies verified — users can only read their own takes
- [ ] Stripe live mode enabled
- [ ] All production secrets set: `MODAL_WORKER_URL`, `GOOGLE_AI_API_KEY`, `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`
- [ ] Privacy policy and terms pages live
- [ ] Basic analytics (Plausible or similar)

---

## Summary Timeline

| Phase | Days | Outcome |
|-------|------|---------|
| Phase 0 | 1–2 | Async pipeline, no timeouts, DTW alignment |
| Phase 1 | 3–7 | Accurate, instrument-tested, quality feedback |
| Phase 2 | 8–14 | Full product: auth, history, payments, coach |
| Phase 3 | 14–21 | Launch-ready: reliable, monitored, real users |

---

## What "Done" Looks Like

A musician plays 60 seconds of a Brahms sonata on cello, uploads the video and a photo of the score, and 90 seconds later sees:

- 3 flagged measures with **correct measure numbers**
- **Intonation flag on m.8:** "The D string entrance here sits about 20 cents flat. Try playing this note in isolation first and match it to a tuner, then bring it back into the phrase."
- **Timing flag on m.14:** "The dotted rhythm shortens under tempo — the long note gets clipped. Count the dot explicitly until the subdivision feels natural."
- **Trust badge:** high confidence (MusicXML + CREPE + Gemini all agreed)
- A coach chat where they can ask "how do I fix the intonation?"

That is the bar. Phase 0 gets the infrastructure to make it possible. Phases 1–3 get the bar consistently met.
