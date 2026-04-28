# AGENTS & GUIDELINES

Welcome, star-chasers.

This file describes how people and AI assistants should work in this repository.

## Resident Agents

| Name | Role | Typical Context |
|------|------|-----------------|
| **Neuro / Codex** | Friendly AI co-maintainer. Drafts code, reviews PRs, and helps tune gameplay. | Issues, PRs, chat, local maintenance |
| **Quantum Hobo / Hobo** | Human project founder and maintainer. Sets direction, reviews, and approves merges. | All areas |
| **Community Contributors** | Anyone submitting ideas, issues, or pull requests. | GitHub issues and PRs |

## How to Ask for Help

Good prompts are short, concrete, and include constraints.

Examples:

```text
@neuro please tune star scoring without adding build tools
@neuro can you review the canvas resize logic on mobile?
@neuro suggest a beginner-friendly issue for the settings panel
```

## Contribution Etiquette

1. Keep one feature or bug fix per PR.
2. Explain why the change matters.
3. Keep the core repo plain HTML, CSS, and JavaScript.
4. Include a short validation note for gameplay changes.
5. AI-generated code is welcome, but a human maintainer should review it before merge.

Example footer:

```text
Generated with Codex, reviewed by @your-username.
```

## Gameplay Tuning Notes

- Reward precision. Smaller and faster stars should generally be worth more.
- Preserve readability. Players should be able to understand the HUD at a glance.
- Keep mobile playable. Touch targets and modal controls should remain comfortable on narrow screens.
- Respect reduced motion. Visual flair should not rely on high-motion effects.
- Prefer joy over complexity. Additions should make the game feel better without turning it into a framework project.

## Technical Notes

- No build step is expected.
- Keep persistent state small and browser-local.
- Guard optional browser APIs such as `localStorage`, `AudioContext`, and `navigator.vibrate`.
- Avoid analytics, ads, trackers, or external runtime dependencies.
- Test layout at desktop and mobile viewport sizes when changing UI.

## FAQ

| Question | Answer |
|----------|--------|
| **Can I rewrite the game in React or Svelte?** | Prefer a fork for framework rewrites. This repo stays no-build and beginner-friendly. |
| **Can I add new sounds or visuals?** | Yes, if they are lightweight, accessible, and do not require external services. |
| **Can I add ads, tracking, or telemetry?** | No. This project is for learning and fun only. |
| **Who merges PRs?** | A human maintainer makes the final merge decision. |

Happy hacking.
