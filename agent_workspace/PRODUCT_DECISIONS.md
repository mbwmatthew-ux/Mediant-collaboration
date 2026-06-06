# Product Decisions — Mediant

Last updated: 2026-06-05

This file contains the key approved decisions in short form.
For full context, rationale, and history, read the Obsidian vault:
`/Users/matthewwu/Documents/Claude (database)/Decisions/`

Coding and design agents treat these as constraints, not suggestions.
New decisions require Product Agent approval before being added here.

---

## Core Model

### PD-001 — One persistent thread per song
Each song in a user's library has exactly one thread. The thread persists indefinitely.
It is not reset when the user uploads a new take.
The thread is the primary container for the user's relationship with that piece.

**Rationale:** Musicians study the same piece for weeks or months. Progress is only meaningful if the full history is visible in one place.

---

### PD-002 — Multiple takes per thread
A thread contains one or more takes. Each take is one recording session.
Takes appear in chronological order within the thread.
The user adds a new take by uploading a new recording from the thread view.

**Rationale:** The first upload is just the starting point. The product only becomes valuable after the second and third takes.

---

### PD-003 — AI compares newer takes to older takes
When a second (or later) take is uploaded, the AI analysis must explicitly compare it to the most recent prior take.
Comparisons should be specific: "Measure 8 is cleaner than your previous take — the rhythm issue is no longer flagged."
Comparisons should be present in the flag summary, not hidden.

**Rationale:** Progress feedback is the primary reason a musician would return. Without comparison, each take feels isolated.

---

### PD-004 — Loop is tied to specific feedback sections
Every flag in the analysis output has a timestamp range (start, end).
Loop plays that exact section — not the whole recording.
The user should be able to hear exactly what the AI heard with one tap.

**Rationale:** Abstract feedback ("your rhythm was off in measure 8") is less useful than audible feedback. Loop closes the gap between text and sound.

---

### PD-005 — Feedback is specific, measure-linked, and actionable
Every AI flag must include:
- The measure number
- The timestamp range in the recording
- The type of issue (rhythm, pitch, articulation, dynamics, etc.)
- A concrete improvement suggestion

Vague feedback ("this section could be better") is not acceptable output.

**Rationale:** Mediant is a coach, not a rating machine. Ratings without guidance don't help musicians improve.

---

### PD-006 — Mediant is a music coach, not a chatbot
The AI coach chat interface exists to answer specific follow-up questions about a take.
It is not a general music theory tutor. It is not a support bot.
The AI's first message in a conversation should always reference the specific take and its key issues.
The AI should never ask the user what notes they played — it has the analysis data.

**Rationale:** Generic AI chat experiences are already abundant. Mediant's value is specificity to this recording, this take, this performance.

---

### PD-007 — Sheet music stays visible during analysis
On desktop, the score image (if uploaded) is always visible alongside the flag list.
Flagged measures are highlighted on the score.
Analysis does not collapse or hide the score by default.

**Rationale:** Musicians think spatially about music. The score is the primary reference — hiding it forces the user to mentally reconstruct what "measure 8" means.

---

## Pending Decisions

_These have not been approved. Do not implement._

- [ ] Should the AI coach respond to voice messages, or only text?
- [ ] Should users be able to share their thread with a teacher?
- [ ] What is the privacy model for recordings — are they stored indefinitely?
- [ ] Should Mediant support ensemble recordings (multiple parts)?
