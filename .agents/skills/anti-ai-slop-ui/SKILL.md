---
name: anti-ai-slop-ui
description: Eliminates generic AI visual slop (purple/violet gradients, glowing borders, cartoon bounces, noisy backgrounds) and refactors interfaces to Apple-grade, high-craft human design standards.
---

# Anti-AI Slop UI Refactoring Skill

This skill transforms predictable, cheap-looking AI interfaces into refined, restrained, high-craft software.

## When to Use
- Whenever Claude or another AI generates a UI that defaults to purple gradients, heavy drop shadows, or generic dark-mode tropes.
- When polishing landing pages, authentication modals, dashboards, or settings panels for production.

## The Anti-Slop Design Rules

| AI Slop Trope (Remove) | Human Craft Standard (Apply) |
| :--- | :--- |
| Purple / violet saturated gradients (`from-purple-600 to-indigo-600`) | Disciplined monochrome neutral palette (`slate-900` text, `slate-500` secondary, pure white or clean dark background) |
| Heavy colored glowing drop shadows (`shadow-[0_0_25px_rgba(168,85,247,0.5)]`) | Subtle 1px borders with alpha (`border-black/5` or `border-white/10`) with zero glow |
| Oversized buttons with spring bouncy hover jumps | Subtle scale down (`active:scale-[0.98]`) with 150ms ease-out opacity shifts |
| Centered floating text with random italic words | Strict grid alignment, clear visual hierarchy, system typography |
| Chunky multi-colored input borders on focus | Clean high-contrast ring (`focus:ring-1 focus:ring-slate-400 focus:outline-none`) |

## The Master Anti-Slop Refactoring Prompt
Paste this prompt into Claude Code when reviewing any generated component:
```text
Redesign this UI using high-end human craft standards:
1. Remove all purple/violet gradients, glowing borders, and decorative blurs.
2. Use a disciplined monochrome neutral palette (slate-900 for primary text, slate-500 for secondary, pure white or slate-950 canvas).
3. Enforce a strict 8px spacing grid. Use 12px or 14px text for secondary metadata.
4. Replace heavy shadows with crisp 1px borders with subtle alpha (border-black/5 or border-white/10).
5. Use system font stack with tabular numbers for data.
6. Make micro-interactions quiet: 150ms ease-out transitions, scale-98 active tap states, zero cartoon bounces.
```

## Recommended Primitives
* **Borders:** Use `hairline` utility (`github.com/lucasmarkes/hairline`) for true physical 1px/0.5px borders on high-DPI screens.
* **Component Primitives:** Use `shadcn/ui` and `Radix UI` primitives over heavy opinionated libraries.
* **Avatars:** Use `blobatar` for deterministic geometric SVG avatars without image bloat.
