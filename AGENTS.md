# Working on PC Airflow

A free, open source web app that simulates air and heat inside a PC case, in the browser on the user's GPU. Read these before writing code:

| Doc                                      | What it is                                                   |
| ---------------------------------------- | ------------------------------------------------------------ |
| [docs/features.md](docs/features.md)     | What the app does                                            |
| [docs/tech-stack.md](docs/tech-stack.md) | What it's built with and why                                 |
| [docs/engine.md](docs/engine.md)         | The physics, exactly                                         |
| [docs/scene.md](docs/scene.md)           | How a PC build becomes cells, and how results are worked out |
| [docs/data.md](docs/data.md)             | The JSON data files and share links                          |
| [docs/ui.md](docs/ui.md)                 | Screens and controls                                         |
| [docs/TODO.md](docs/TODO.md)             | The work queue                                               |

The specs are the plan. If one looks wrong, say so in the PR and explain why before building something different.

## Picking up a task

1. See what's taken: `gh pr list --repo LeahyCC/pc-airflow --state open`. A PR titled `T3: …` means T3 is taken. A row marked `doing` is taken too.
2. Take the first `todo` row whose **Needs** are all `done` and whose **Touches** files aren't in someone else's task. If Colin named a task, take that one.
3. Branch from main: `git switch -c feature/t3-build-service origin/main`.
4. Claim it: set the row's status to `doing`, commit, push, open a draft PR titled `T3: <task name>`.
5. Do the task. **Done when** is the bar. If it turns out bigger than its size, finish a useful part and split the rest into a new task.
6. In the same PR: set the row to `done YYYY-MM-DD`, update any doc whose behaviour changed, and add anything found but not fixed as a new task at the bottom of `docs/TODO.md` with the next free id.
7. `npm run check` passes (and `npm run test:physics` for engine changes). Mark the PR ready. Colin merges.

Rebase on main before asking for a merge. `docs/TODO.md` rows conflict often; keep every row's newest status.

## Code rules

- TypeScript strict. Never `any`: use `unknown` and narrow.
- Prettier formats everything. Don't hand-format.
- Comment complex functions: why, not what. Every WGSL kernel gets a short header saying what it reads and writes.
- **Layers:** `src/engine/` knows nothing about PCs. All PC rules live in `src/build/` (the service layer). `src/lib/` is small generic helpers only (maths, colour, compression), with no PC rules in them. `src/view/` draws, `src/ui/` is React.
- Every number marked _estimate_ in the specs lives in one named constant, so it can be tuned later.
- New data files must pass the schema and carry a `source` if they're real products.

## House rules

- Commits and PRs go out under Colin's name and read like he wrote them: no co-author trailers, no mention of an AI, no bot-style branch names.
- No em dashes in code comments, docs, commits or PRs.
- Plain words in docs. Say what it does, not how clever it is.
