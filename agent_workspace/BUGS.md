# Bugs & Design Inconsistencies — Mediant

Last updated: 2026-06-05

**Active bugs go here.** For known architectural traps and recurring gotchas, see the Obsidian vault:
`/Users/matthewwu/Documents/Claude (database)/Gotchas/Gotchas — Things That Will Bite You.md`

Format for new entries:
```
## BUG-XXX — Short title
**Status:** Open / In Progress / Fixed
**Found by:** QA Agent / Coding Agent / User
**Date:** YYYY-MM-DD
**Page/Component:** Where it appears
**Severity:** Critical / High / Medium / Low

**Description:** What is wrong.
**Steps to reproduce:** How to see it.
**Expected:** What should happen.
**Notes:** Any relevant context, screenshots, or code pointers.
```

---

## Open Bugs

_No open bugs at this time. QA agent adds entries here._

---

## Known Design Inconsistencies

### DI-001 — `parallaxLogoRef` in Landing.jsx is dead code
**Status:** Low priority, not a bug
**Component:** `src/pages/Landing.jsx`

The ref `parallaxLogoRef` is declared and attached to `.heroLogoLarge` but is never used in the parallax tick function. The logo is intentionally static (does not move with mouse). The ref can be safely removed if desired.

---

### DI-002 — Hero logo centering relies on PNG whitespace compensation
**Status:** Working, fragile
**Component:** `src/pages/Landing.module.css` — `.heroLogoLarge`

The `logo-mark.png` has its visual symbol offset left of the PNG canvas center. The current fix is `padding-left: 50px; box-sizing: border-box` which shifts `justify-content: center` by +25px. If the PNG is ever replaced or re-cropped, this padding must be removed or re-measured.

---

## Fixed Bugs

_Bugs that have been resolved. Keep for reference._

### BUG-001 — AI coach chat history was sending non-alternating messages to Anthropic API
**Status:** Fixed (2026-06-05)
**Component:** `supabase/functions/ask-coach/index.ts`

Anthropic's API requires messages to strictly alternate user/assistant. The raw history from the frontend could contain consecutive user or assistant messages. Fix: trim history to first user message, enforce alternating structure, drop trailing user message before appending current message.

### BUG-002 — CORS errors on Supabase edge function calls from the frontend
**Status:** Fixed (2026-06-05)
**Component:** `supabase/functions/_shared/cors.ts`, `ask-coach/index.ts`

CORS headers were not being returned on all response paths. Fixed by ensuring `corsHeaders(req)` is applied to all responses including errors.
