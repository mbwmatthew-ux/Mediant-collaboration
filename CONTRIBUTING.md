# Contributing To Mediant

This project is still early, so the goal is to stay lightweight while avoiding chaos.

## Branching

Do not build directly on `main` unless the team explicitly agrees to it.

Use branches like:

- `landing-page`
- `score-review-ui`
- `follow-along-screen`
- `upload-flow`
- `bugfix/tab-bar-scroll`

## Recommended Flow

1. Pull the latest changes from `main`
2. Create a branch for your task
3. Make your changes
4. Test the prototype locally
5. Commit with a clear message
6. Push the branch
7. Open a pull request

## Commit Message Examples

- `Add landing page hero section`
- `Refine upload flow screen`
- `Fix phone viewport scrolling`
- `Update score review styling`

## Design Expectations

- Keep the current soft green / cream / gold direction unless the team agrees to change it
- Preserve realistic phone sizing and internal scrolling
- Avoid introducing placeholder AI-chat patterns that do not match the product
- Bias toward music-specific UI over generic startup UI

## Scope Expectations

At this stage, prioritize:

- app structure
- user flow
- layout quality
- clarity of the core product loop

Do not overbuild:

- auth
- backend
- databases
- payments
- real AI integrations

until the product direction is more locked in.

## Local Run

Use:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173
```
