# Contributing

Thanks for your interest. This is a starter template, so PRs are most useful
when they keep the surface area small and the defaults sensible.

## Workflow

1. Fork and create a feature branch off `main`.
2. Make your change. Both backend and frontend have CI guards — please run
   them locally before opening a PR.
3. Open a PR with a description that explains *why* the change is needed.
   Screenshots help for anything visual.

## Local checks

### Backend (Drupal)

```bash
cd drupal
composer validate --strict
vendor/bin/phpcs --standard=Drupal,DrupalPractice web/modules/custom
vendor/bin/phpstan analyse web/modules/custom --level=6
```

### Frontend (Next.js)

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
```

## Commit style

Short imperative subject line, optional body explaining the *why*. Conventional
Commits are welcome but not required. Squash-merge on GitHub keeps history
linear.

## Reporting issues

Please include:

- Drupal core version and recipe hash (`drush status`)
- Node version and `next info` output
- Steps to reproduce (CodeSandbox or a minimal repo if possible)
