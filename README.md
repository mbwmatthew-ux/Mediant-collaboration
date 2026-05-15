# Mediant

This repository contains the early front-end prototype for `Mediant`, a music feedback product for musicians.

Right now the repo is focused on:

- product direction
- app structure
- UI exploration
- clickable prototype behavior

Right now it does **not** include:

- backend logic
- authentication
- real AI analysis
- real uploads
- subscriptions

## What The Product Is

Mediant is intended to help a musician:

1. search for the piece they played
2. upload an audio recording
3. receive generated or aligned sheet music
4. see exact flagged moments in the notation
5. read a constructive summary
6. follow playback inside the app

## Project Structure

- `index.html`: main app and marketing prototype markup
- `styles.css`: design system and page styling
- `script.js`: screen routing and prototype interactions

## Run Locally

You can open `index.html` directly, but using a static server is cleaner:

```bash
python3 -m http.server 4173
```

Then visit:

```text
http://localhost:4173
```

## Collaboration Setup

GitHub remote:

```text
git@github.com:mbwmatthew-ux/Mediant-collaboration.git
```

Main branch:

```text
main
```

Recommended workflow:

1. Pull the latest `main`
2. Create your own branch
3. Make your changes
4. Commit locally
5. Push your branch to GitHub
6. Open a pull request
7. Merge after review

## Quick Git Commands

Clone:

```bash
git clone git@github.com:mbwmatthew-ux/Mediant-collaboration.git
cd Mediant-collaboration
```

Get latest changes:

```bash
git pull origin main
```

Create a branch:

```bash
git checkout -b your-branch-name
```

Push a branch:

```bash
git push -u origin your-branch-name
```

## Team Guidance

- Avoid everyone committing directly to `main`
- Use small branches for separate tasks
- Keep commit messages clear
- If two people are editing the same screen, coordinate first
- Prefer pull requests for every meaningful change

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the working agreement.
See [BRANCHING_PLAN.md](./BRANCHING_PLAN.md) for the first team branching setup.
