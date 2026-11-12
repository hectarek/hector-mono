# U26. Motion

| | |
|---|---|
| Batch | 8, Motion (`feat/community-game-library-b8-motion`) |
| Model | Standard |
| After | Batch 7 merged. Needs Hector's pick of the motion |
| Serves | D13; KTD25 |

The moves Hector picks from the design system's Motion proposals, added last, as D13 decided.

## Read first

Besides step 2 of [How to build a unit](../build-plan.md#how-to-build-a-unit):

- The design system: `project/components/Motion/README.md` and `preview.html`, and the README's Motion section.
- Recipes' Motion rules in `apps/hectors-recipes/AGENTS.md` (UI Rules), and its `app/_components/page-motion.tsx`.
- [build-plan.md](../build-plan.md): D13; KTD25.

## Build

1. **First, Hector's pick.** Show him the four proposals in the design system's Motion component, and build only the ones he picks. Write his pick in the task.
2. **The rules for whatever is built:** transforms and opacity only, nothing loops, one moment at a time on a screen, and with reduced motion every change is instant. Moves between pages go through React's `<ViewTransition>`, as recipes' do.

## Tests

- With reduced motion, nothing moves.
- Each move's start and end states, in screen tests.

## Done when

- [ ] Hector's pick is in the task
- [ ] The checks, dead code and tests pass
- [ ] Each move is checked by hand on a phone, and with reduced motion on
- [ ] Committed as `feat(community-game-library): U26 motion`, and Batch 8 is pushed and its PR opened
