## Agent skills

### Skill bootstrap

Project-local agent skills are intentionally excluded from Git because they add substantial repository bloat. If no project-local skills are installed under `.agents/skills/`, run `npx skills experimental_install`; it restores the expected skills from `./skills-lock.json`.

### Package manager

Always use pnpm as the package manager for this repository.

### Issue tracker

Issues and PRDs are tracked in GitHub Issues for `up2dul/habit-shaper`. See `docs/agents/issue-tracker.md`.

### Domain docs

This repository uses a single-context domain documentation layout. See `docs/agents/domain.md`.
