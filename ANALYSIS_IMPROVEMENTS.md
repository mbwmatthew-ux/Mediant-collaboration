# Mediant — Analysis Pipeline: Long-Term Improvement Roadmap

**Scope:** the AI performance-analysis pipeline end to end — the Modal worker
(`modal_worker/worker.py`), the orchestrator (`supabase/functions/analyze-performance/index.ts`),
the webhook/job-status functions, the new client-side `src/lib/analysisEvidence.js`,
and the results display (`src/pages/Analysis.jsx`).

**Basis:** a full read of the above as of commit `e753a66` ("Improve performance analysis
evidence pipeline"). Line references are `file:line` and should be re-verified before acting,
since the pipeline is under active development.

**Companion doc:** `ANALYSIS_ARCHITECTURE.md` describes the *intended* design; this doc records
the *current implementation reality* and where it diverges, plus the strategic work to close the gap.

---

## TL;DR

The plumbing is real and reasonably sophisticated — CREPE pitch tracking, librosa onset/beat
detection, music21 parsing, real DTW alignment, per-flag confidence caps, and a hallucination
validation loop. **The foundation is decent.**

But the product's defining promise — *"only give precise feedback when the evidence justifies it"*
(`ANALYSIS_ARCHITECTURE.md:13`) — **is not enforced, not surfaced, and not measurable yet.** Today
the system always emits a confident score and never tells the user how much to trust it. The three
highest-leverage long-term investments are:

1. **Wire up the trust model** — enforce "refuse when evidence is too thin," and surface the trust
   data the backend already computes.
2. **Let deterministic measurement lead** — make the precise CREPE/DTW signal the spine of the
   judgment; demote the LLMs to explaining/prioritizing pre-computed flags.
3. **Build an evaluation harness** — you cannot safely improve accuracy you cannot measure.

---

## How it works today

```
Record.jsx
  ├─ upload video → Storage bucket `recordings`
  ├─ upload score → Storage bucket `sheet-music`
  ├─ (browser) extractScoreFacts() + extractAudioFeatures()   ← client-side evidence
  └─ invoke('analyze-performance')
       │
       ├─ PREFERRED: POST Modal /analyze_async ──→ run_full_analysis (worker.py)
       │     CREPE pitch + librosa beats + music21/Claude-vision score read
       │     + DTW/beat-grid alignment + Gemini direct-listen + Claude coaching
       │     └─ POST results → analysis-webhook  → takes row (job_status: done)
       │
       └─ INLINE FALLBACK (only if Modal absent/dispatch fails):
             Gemini video → Claude vision → Claude coaching → write results directly
  Frontend polls job-status every 4s (≤4 min), then Analysis.jsx renders the take.
```

**The real order of judgment is `measure → align → listen (Gemini) → coach (Claude)`** — not the
doc's "measure → align → coach." Claude is explicitly gated to Gemini's free-text listening
(`worker.py:1206,1311,1323`): it may not flag anything Gemini didn't mention. So two stochastic
models sit on the critical path, and the trustworthy deterministic signal (cents-offset, onsets,
DTW) is treated as secondary candidate evidence (`worker.py:1229–1253,1311`).

**Two backends, two trust models.** The Modal worker is preferred; an inline LLM chain in the
orchestrator is the fallback. They compute analysis quality differently
(`worker.py:assess_quality 1422` vs `index.ts:buildQuality 286–313`), so a take's
`analysis_quality` shape/semantics depend on which backend ran.

---

## What's already solid (keep / build on)

- **Audio analysis is genuine.** CREPE (`torchcrepe.predict`, `worker.py:249`, tiny model/40 ms hop
  for latency), librosa onsets (`:268`) and beat/tempo (`:403`); per-event cents-offset, loudness,
  and confidence (`:360–370`). The candidate-window strategy (`:280–317`) is a thoughtful way to
  catch soft/sustained notes between onsets.
- **DTW alignment is real** (`worker.py:680`), with an octave-confusion discount and a Sakoe-Chiba
  band — for MusicXML/MXL scores.
- **Defense-in-depth against hallucination.** `normalizeFlag` lowers per-flag confidence when the
  audio contradicts a claim (rest-only measure, silent window, no onsets — `index.ts:159–189`); the
  worker's coaching pass runs a post-hoc validation loop that drops invalid flags
  (`worker.py:1355–1377`). This is real, not prompt-trust.
- **The async pattern is structurally sound** (dispatch → spawn → webhook → poll). The bones are right.

---

## The core gap: the trust promise isn't wired up

This is the single most important theme; two independent failures compound it.

- **It never refuses.** `ANALYSIS_ARCHITECTURE.md:104–110` promises a structured low-confidence
  error instead of fake precision. **No code path ever sets `canProceed:false`.** Both trust models
  return `canProceed:true` in every branch (`worker.py:1435–1436`; `index.ts:buildQuality` omits the
  field entirely). The system always produces a score + flags.
- **It never shows trust.** The backend computes and stores `analysis_quality`
  (`trust`, `evidence`, `reasons`, `limitations` — `index.ts:286–313`), but `Analysis.jsx` reads it
  into a variable (`:1199`) and renders only an averaged confidence number
  (`overallConfidence`, `:1121–1130`). `trust`/`reasons`/`limitations` are discarded.

Net: the product *looks* equally confident on a clean MusicXML + clear audio take and on a blurry
photo with no aligned events. That is the exact failure mode the architecture set out to avoid.

---

## Prioritized long-term improvements

### P1 — Make the trust model real and visible
*The differentiator. Highest leverage, partly already built.*
- **Enforce:** define one shared quality contract; return an honest "not enough evidence" state
  (`canProceed:false` + `reasons`) when there are no aligned events / unparsed score with no onsets,
  rather than a fabricated score.
- **Surface:** render `analysis_quality.trust` + `reasons` + `limitations`; visually de-rate
  score-only / visual-only flags so a guess never looks like an audio-verified measurement
  (the caps already exist — `index.ts:159–189,1096`; the UI just ignores them).
- *Evidence:* `index.ts:286–313`; `Analysis.jsx:1199,1121–1130`; `ANALYSIS_ARCHITECTURE.md:104–110,152–154`.

### P2 — Deterministic measurement leads; LLMs explain
*The accuracy ceiling and defensibility.*
- Pitch-vs-score correctness is currently delegated to Gemini/Claude even though the precise data
  exists. Compute per-note verdicts deterministically (heard MIDI vs DTW-matched written MIDI, cents
  deviation, onset deviation in ms) as the **spine**; use the LLMs to *explain and prioritize*
  pre-computed flags, not to *originate* them.
- The worker already does this for intonation/timing candidates (`worker.py:1229–1253`) — generalize
  it to wrong-notes and dynamics, and stop gating Claude to Gemini (`worker.py:1206,1323`).
- Snap final flag timestamps to the nearest **actual** CREPE onset time instead of reconstructing
  them from the LLM's stated beat over a coarse linear range (`worker.py:1388–1391`).

### P3 — Evidence integrity & provenance
*Trust holes that undermine any "provenance" claim.*
- **Client-side evidence is spoofable and non-reproducible.** `extractScoreFacts` /
  `extractAudioFeatures` run in the browser (`analysisEvidence.js`) and the server trusts the
  results unverified (`index.ts:1173–1177`); they raise/lower flag confidence and drive the measure
  timeline, vary by device/codec, and vanish silently on failure (`Record.jsx:292,300,303`).
  Re-derive authoritative evidence server-side — i.e. **make the Modal worker the default**
  (`ANALYSIS_ARCHITECTURE.md` Priority 1) — and treat client data as low-trust *hints* that can only
  lower confidence, never raise it.
- **Flags have no stable identity or evidence link.** They're keyed by array index
  (`flag_${i}`, `Analysis.jsx:706–721,749–757`) and dedupe/reorder on re-analysis
  (`index.ts:250–251`). The deterministic evidence (`measure_layout`, `audio_alignment`) is written
  only on the Modal/webhook path (`analysis-webhook/index.ts:84–85`) and is `NULL` on the inline
  path (`index.ts:1411–1418`). Give each flag a durable `id` and a pointer to the onset/aligned-note
  that justified it; persist alignment data on both paths.

### P4 — Reliability at scale: stuck jobs, retries, idempotency
*Operational must-have before real users.*
- The webhook has **no retry and no persistence** — a dropped/500'd delivery orphans the take at
  `job_status:'processing'` forever (`worker.py:post_webhook 1445–1449`). `job_started_at` is written
  at insert (`index.ts:1202`) but **never read**; there is **no reaper** (the only cron,
  `cleanup-storage`, never touches `job_status`).
- *Direction:* add a scheduled reaper that fails out `processing` rows older than N minutes (using
  `job_started_at`); add bounded webhook retries with backoff; persist results keyed by `take_id`
  independent of the webhook; make the write idempotent and guarded
  (`UPDATE ... WHERE job_status='processing'`) so retries/duplicates can't clobber.

### P5 — Cost, abuse, and secrets controls
*Before scale/launch.*
- The free-tier quota is **commented out** (`index.ts:1133–1145`); there is no per-user rate limit
  or concurrency cap. Each analysis can fan out to a Gemini Files upload + up to 4 model attempts +
  Claude vision + Claude coaching — uncapped.
- `analyze_async` has **no inbound auth** (`worker.py:1630–1641`): anyone with the Modal URL can
  spawn jobs on your bill and supply their own webhook URL.
- AI keys are passed in the request **body** to Modal (`index.ts:1246–1247` → `worker.py:1480–1481`),
  landing in payloads/logs, rather than configured as Modal secrets.
- *Direction:* re-enable quotas + add per-user rate limit/concurrency cap; authenticate the Modal
  dispatch endpoint (shared secret, like the webhook already uses); move provider keys to Modal
  secrets.

### P6 — Make the comparison feature and the numbers real
*This is the retention hook (PD-003) — and it's currently cosmetic.*
- Take-to-take comparison is **LLM-narrated prose**, not a computed diff: the prior take's flags are
  pasted into the prompt (`index.ts:739–749`); there's no algorithmic matching of old→new flags and
  no stored comparison artifact. The concrete "[RESOLVED]/[REMAINING]" text users see is
  **hardcoded mock copy** (`Analysis.jsx:1059`), and the Library's per-aspect deltas are fabricated
  (`Takes.jsx:78–79`).
- The numeric score is `95 − 6 × flagCount` (`worker.py:1606`) — independent of severity/confidence.
  The Session-Summary "Score Breakdown" uses `Math.random()` (`Analysis.jsx:computeAspectScores 72`).
- *Direction:* compute a deterministic flag-level diff (resolved/recurring/new, keyed off the stable
  flag id from P3), store it on the take, and render that; feed the structured diff to the model for
  wording, not detection. Replace the synthetic numbers with real per-type measures (or label them
  clearly as estimates).

### P7 — Evaluation harness + maintainability
*The foundation that makes P1–P3 safe to pursue.*
- **There are zero tests** for a system tuned by LLM prompts and hand-picked thresholds
  (e.g. `|cents|≥10`, `worker.py:1238`; gap `>2.2×median`, `:1248`). Any prompt/model change is a
  blind regression. Build a labeled corpus (recordings with known errors at known measures) and an
  offline harness that scores measure-attribution accuracy and flag precision/recall against
  **pinned** model versions, run in CI.
- **Consolidate the duplication:** the orchestrator is ~1,455 lines with the
  parse-and-normalize block copy-pasted three times (`index.ts:841–859,955–972,1087–1103`) and the
  Anthropic JSON parse duplicated again in `analyze-sheet-music`. Extract shared helpers; template
  the prompts; unify the two trust models.
- **Remove dead weight:** Audiveris OMR is fully built but **never called**
  (`worker.py:559` defined, disabled at `:875–877`) and still installed in the image (`:42`),
  inflating cold-starts; `CLAUDE_MODEL` is defined but unused (`:1217`); `takes.chat_history` is a
  dead column (live code uses `songs.chat_history`); the image/PDF `f.spot` highlight path in
  `Analysis.jsx:1231–1248` has no producer. Centralize hardcoded model ids
  (`gemini-2.5-flash`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`) into config and stamp
  `{model, prompt_version}` into results for reproducibility.

---

## Divergences from `ANALYSIS_ARCHITECTURE.md`

1. **`canProceed:false` / structured low-confidence error is never produced** — the biggest gap (doc `:104–110`).
2. **Audiveris OMR is not used** — visual scores route to Claude vision; the OMR code is dead (doc `:62–66`).
3. **Gemini's role is inverted** — the doc casts it as lower-trust corroboration; the inline path makes it the highest-trust, primary source (`index.ts:1338`).
4. **Two divergent trust models** instead of one shared `analysis_quality` contract.
5. **`canProceed` is dropped on the inline path**, so the stored shape differs by backend.
6. **Client-side evidence extraction** (`analysisEvidence.js`) isn't acknowledged in the architecture narrative or its trust model.

---

## Suggested sequencing

1. **P7 first (a thin slice):** stand up the eval harness with a handful of labeled recordings — so every change below is measurable.
2. **P1 + P3:** enforce + surface trust, make Modal the default measurement engine, give flags stable ids + evidence links.
3. **P2:** move the core judgment onto deterministic signal.
4. **P4 + P5:** reliability, cost, abuse, secrets — before opening to real users.
5. **P6:** turn the comparison/progress story into something real (retention).

---

*Prepared from a structured read of the pipeline; intended as input for the maintainer, not a final
plan. Every line reference should be confirmed against current `main` before implementation.*
