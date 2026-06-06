# Agent Workspace — Mediant

This folder is the shared coordination layer for all AI agents working on Mediant.
Agents read and write here instead of talking to each other directly.

---

## How it works

1. **Read before acting.** Every agent reads the relevant files in this folder before starting any work.
2. **Write decisions back.** Product and design decisions go into the shared files immediately — not just in chat logs.
3. **Approved before coded.** Coding agents only implement tasks that appear in the `Approved Tasks` section of `AGENT_TASKS.md`.
4. **Bugs go in `BUGS.md`.** QA agents log all findings there with enough detail to reproduce.
5. **Changelog is updated after every code change.**

---

## Files

| File | Owner | Purpose |
|---|---|---|
| `AGENT_TASKS.md` | All agents | Task board — what to do, what's in progress, what's done |
| `AGENT_ROLES.md` | Reference | Defines each agent's responsibilities and boundaries |
| `DESIGN_RULES.md` | Design Agent | Mediant's visual system — colors, type, layout, rules |
| `PRODUCT_DECISIONS.md` | Product Agent | Approved product decisions — source of truth for feature logic |
| `BUGS.md` | QA Agent | Reproducible bug reports and design inconsistencies |
| `CHANGELOG.md` | Coding Agent | Record of every code change made |
| `MCP_SETUP.md` | Setup reference | How to configure MCP for file access, testing, and Obsidian |

---

## Obsidian vault — deeper context

This folder handles the short-term operational layer. For deeper context, read the Obsidian vault:

**Path:** `/Users/matthewwu/Documents/Claude (database)/`

| Vault section | What's in it |
|---|---|
| `🏠 Start Here.md` | Project overview and how to navigate everything |
| `Project/Mediant — State of the Product.md` | Honest picture of what works, what's broken, what's stubbed |
| `Knowledge/` | Architecture, flag data structure, Supabase schema, score rendering |
| `Decisions/` | Full product decisions with context and rationale |
| `Fixes/` | Specific technical fixes — root cause, solution, warnings |
| `Gotchas/` | Things that will bite you; read before touching any area |
| `Sessions/` | Per-session logs of what was tried and decided |

**Division of responsibility:**
- Vault = knowledge base (history, architecture, context, rationale)
- This folder = task board (what to do now, active bugs, changelog)

---

## Ground rules

- Do not make product or design decisions in code comments. Write them here first.
- Do not implement a feature that doesn't have an entry in `Approved Tasks`.
- Do not resolve a bug in `BUGS.md` without confirming it's fixed.
- Keep files clean. Completed tasks move to the `Completed` section. Old bugs get marked `[FIXED]`.
