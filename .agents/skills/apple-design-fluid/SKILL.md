---
name: apple-design-fluid
description: Apple's approach to interface design and fluid physical motion translated for the web. Use when building gesture-driven UI, spring animations, drag/swipe interactions, momentum, interruptible transitions, materials, depth, and WWDC-grade UX.
---

# Apple Design for Web

> "When we align the interface to the way we think and move, something magical happens — it stops feeling like a computer and starts feeling like a seamless extension of us."

This skill translates Apple's core design philosophies — chiefly presented at WWDC (*Designing Fluid Interfaces*, WWDC 2018) — into web development techniques using modern CSS, Pointer Events, `requestAnimationFrame`, and spring motion libraries (Framer Motion / Motion).

---

## 1. Zero-Latency Response — Kill Latency on Pointer-Down

- **Respond on `pointerdown`, not on `click` or release:** Highlight or compress a button the millisecond the finger or mouse touches it. Waiting for `click` / mouseup introduces a perceptible lag.
- **Audit input latency:** Eliminate artificial debounces on direct gestures, transition delays, and mobile 300ms tap delays.
- **Continuous 1:1 manipulation:** For sliders, sheets, or drags, update the transform strictly 1:1 with pointer coordinates during movement, never animating only at the end.

```css
/* Immediate response on press */
.apple-button {
  transition: transform 100ms ease-out;
  touch-action: manipulation;
}
.apple-button:active {
  transform: scale(0.97);
}
```

---

## 2. Direct Manipulation & Grab Offsets

- When dragging an item, pin the element to the pointer preserving the exact grab point offset (`e.clientY - rect.top`). Do not snap the element's center to the cursor.
- Use `element.setPointerCapture(e.pointerId)` so fast flick gestures never lose tracking outside element boundaries.

---

## 3. Velocity-Aware, Interruptible Springs

In fluid interfaces, animations are never pre-baked CSS `@keyframes` with fixed durations. They are **springs** that carry physical properties:
- **Presentation value continuity:** If an animation is interrupted mid-flight, the new animation starts from the current on-screen position with the current velocity vector.
- **Spring tuning guidelines:**
  - *Smooth resting transitions:* `damping: 1.0` (critically damped, zero oscillation), `response: 0.35s - 0.45s`.
  - *Flick / Throw momentum:* `damping: 0.75 - 0.85` (slight bounce to convey weight and momentum).

---

## 4. Materials, Translucency & Typography

- **Vibrant Blur Materials:** Use `backdrop-filter: blur(20px) saturate(180%)` with translucent rgba backgrounds (`rgba(255, 255, 255, 0.7)` in light mode, `rgba(20, 20, 25, 0.7)` in dark mode).
- **Subtle Boundaries:** Use 1px interior borders (`box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1)`) instead of heavy outer drop shadows.
- **Typography:** Match SF Pro conventions — optical sizing, tight tracking on large display headers (`letter-spacing: -0.02em`), and generous leading on body prose.

---

## Source & Upstream References
- Upstream skill repository: `https://github.com/emilkowalski/skills/tree/main/skills/apple-design`
- Apple Developer WWDC: *Designing Fluid Interfaces* (WWDC 2018)

