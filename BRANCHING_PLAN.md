# Mediant Branching Plan

This is the first collaboration workflow for the Mediant repo.

It is intentionally simple.

The goal is:

- let multiple people work at once
- reduce merge conflicts
- keep `main` stable
- make it obvious who is working on what

## Main Rule

Do not work directly on `main`.

`main` should be the shared branch that only receives reviewed or agreed-on work.

## First Team Setup

For now, use this structure:

- `main`
  This is the stable shared branch.

- one branch per task
  Every feature, design pass, or bugfix should happen on its own branch.

## First Branches To Use

These are the best first branches for the current state of the project:

- `landing-page`
  For homepage copy, marketing sections, and overall first impression.

- `dashboard-home`
  For the main in-app home screen and app-shell polish.

- `upload-flow`
  For search, upload, and recording submission flow.

- `score-review`
  For generated notation review, flagged moments, and summary UI.

- `follow-along`
  For playback, score-following, and transport controls.

- `bugfix/general-cleanup`
  For small fixes that do not belong to a larger feature branch.

## If There Are Only 2 People Right Now

Use this split first:

- Person 1: `landing-page`
- Person 2: `upload-flow`

After one branch merges, create the next one:

- `score-review`
- `follow-along`

This keeps both people from editing the same screen too early.

## Branch Naming Format

Use short descriptive names:

- `landing-page`
- `upload-flow`
- `score-review`
- `follow-along`
- `profile-screen`
- `bugfix/tab-bar-scroll`

Avoid names like:

- `matt-branch`
- `newstuff`
- `final-final`

because they do not tell the team what the branch is for.

## Daily Workflow

Every time someone starts work:

1. Get the latest shared code

```bash
git checkout main
git pull origin main
```

2. Create or switch to your task branch

```bash
git checkout -b your-branch-name
```

If the branch already exists locally:

```bash
git checkout your-branch-name
```

3. Make changes

4. Commit your work

```bash
git add .
git commit -m "Describe what changed"
```

5. Push the branch

```bash
git push -u origin your-branch-name
```

6. Open a pull request into `main`

## How To Decide Who Works On What

Pick branches based on screen ownership.

Good example:

- one person owns marketing / landing page
- one person owns search + upload flow
- one person owns score review
- one person owns follow-along
- one person owns cleanup / consistency / profile / settings

That is better than multiple people editing the same main screen at the same time.

## Merge Rules

Before merging a branch:

- make sure it still works locally
- pull the latest `main` if needed
- resolve any conflicts
- push the updated branch
- then merge

## Very Simple Team Rule

Before starting new work, send the team:

- what branch you are on
- what screen or feature you are editing

Example:

```text
I’m working on `upload-flow` today and editing the search + upload screens.
```

That one habit alone prevents a lot of confusion.

## First Recommended Assignment

If you and one friend are starting now:

- You: `landing-page`
- Friend: `upload-flow`

Then after those are merged:

- You: `dashboard-home`
- Friend: `score-review`

Then:

- one of you takes `follow-along`
- the other takes `profile-screen` or `saved-takes`

## What To Avoid

- both people editing `index.html` in the same section at the same time without talking
- direct commits to `main`
- giant branches that change everything at once
- waiting too long to merge

## Best Next Step

Right now, the easiest move is:

1. keep `main` as the stable branch
2. create `landing-page`
3. create `upload-flow`
4. each person works separately
5. merge one branch at a time
