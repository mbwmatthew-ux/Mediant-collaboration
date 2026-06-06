# Changelog — Mediant

Format: `[YYYY-MM-DD] Area — Description`

Most recent first.

---

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
