# MCP Setup Guide — Mediant

Last updated: 2026-06-05

---

## What is MCP?

MCP (Model Context Protocol) is a standard that lets AI tools (Claude, Codex, Cursor, etc.) access external resources — files, databases, browsers — in a structured way.

Instead of pasting file contents into chat, MCP gives the AI a direct read/write connection to the things it needs. You configure it once, and every agent in your workflow has the same access.

---

## Why we use shared files as the coordination layer

We are not building a complex multi-agent orchestration system. The simplest thing that works:

- Agents read Markdown files before starting work
- Agents write Markdown files after making decisions or finding bugs
- No agent needs to talk to another agent in real time

This works because Cursor, Claude, and Codex can all read files from your filesystem. The files in `agent_workspace/` become the shared brain.

---

## Your Obsidian vault as the shared brain

Your Obsidian vault at `/Users/matthewwu/Documents/Claude (database)/` is just a folder of Markdown files.
You do not need a special Obsidian MCP plugin.

If you give agents filesystem access to that folder, they can:
- Read your session notes, fix docs, and decision logs
- Write new notes into the vault automatically

The vault already has a working structure:
- `Sessions/` — per-session logs of what was tried and decided
- `Fixes/` — specific technical fixes with root cause and warning
- `Decisions/` — design and product decisions
- `Gotchas/` — things that surprised you or will surprise future Claude

Claude Code (this tool) already writes to the vault during coding sessions.
For other tools (Cursor, Codex), you grant access via the filesystem MCP config below.

---

## Filesystem MCP — give agents access to the repo and vault

Add this to your MCP config file (location depends on the tool — see below):

```json
{
  "mcpServers": {
    "mediant-files": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-filesystem",
        "/Users/matthewwu/repos/mediant-ui-shell",
        "/Users/matthewwu/Documents/Claude (database)"
      ]
    }
  }
}
```

**Config file locations:**
- **Claude Desktop app:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Cursor:** `.cursor/mcp.json` in the project root, or global Cursor settings
- **Antigravity:** Check Antigravity's documentation for MCP config location

**What this does:**
- Gives the agent read/write access to the Mediant repo
- Gives the agent read/write access to your Obsidian vault
- Does NOT expose your home directory, `.env` files, or anything outside these two paths

---

## Playwright MCP — UI testing

For QA agents that need to open the browser and check the UI:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

**What this does:**
- Lets the agent open `localhost:5173` (or your dev server URL) in a controlled browser
- Lets the agent take screenshots, click elements, and check layout
- Does NOT run in production — only against local dev builds

**To use:** Start your dev server first (`npm run dev`), then ask the QA agent to check a specific page.

---

## How each tool should use the shared files

### Claude Code (this tool — what you're using now)
- Already has filesystem access to the repo
- Reads `agent_workspace/` files before starting major tasks
- Writes Obsidian notes during and after coding sessions
- Updates `CHANGELOG.md` after code changes

### Cursor (with Claude or Codex)
- Add the filesystem MCP config above to `.cursor/mcp.json`
- At the start of a Cursor session, paste: "Read agent_workspace/AGENT_TASKS.md and agent_workspace/DESIGN_RULES.md before starting."
- Cursor agents should write to `CHANGELOG.md` and `BUGS.md` after their changes

### Antigravity
- Point Antigravity at the filesystem MCP config above
- Use `agent_workspace/AGENT_TASKS.md` as the task input source
- Tell Antigravity to write results to `BUGS.md` or `CHANGELOG.md`

---

## Safety Rules

These are non-negotiable. Do not grant agents access beyond what is listed here.

1. **No access to private personal folders.** The filesystem MCP config lists exactly two paths. Do not add `~` or `/Users/matthewwu` as a root path.

2. **No access to production secrets.** The `.env` file in the repo root contains real API keys. It is in `.gitignore`. Do not share it with agents, do not paste it into chat, do not commit it.

3. **No access to billing or Stripe settings.** Agents must never see or modify payment configuration. This is not in the repo and should never be.

4. **No production database writes without explicit approval.** Agents can read from Supabase via the app's existing query layer. They must not run raw SQL against production tables.

5. **No force pushes.** Agents that have git access must not run `git push --force` or `git reset --hard` without explicit user approval.

6. **Scope is limited to:**
   - `/Users/matthewwu/repos/mediant-ui-shell` — the app repo
   - `/Users/matthewwu/Documents/Claude (database)` — the Obsidian vault

---

## Install the filesystem MCP server

If you haven't already:

```bash
npm install -g @modelcontextprotocol/server-filesystem
```

Or run it directly with `npx` as shown in the config above (no install needed).
