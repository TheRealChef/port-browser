# Motion

| Token | Value | Use |
|---|---|---|
| `--motion-d1` | 90ms | press, hover |
| `--motion-d2` | 160ms | colour, fades |
| `--motion-d3` | 240ms | selection, chevrons |
| `--motion-d4` | 380ms | panels, docking |
| `--motion-e-out` | cubic-bezier(.2,.8,.2,1) | default |
| `--motion-e-spring` | cubic-bezier(.32,1.36,.52,1) | settles within about 8% overshoot |

- **Press:** 1px drop plus 0.985 scale, within 90ms.
- **Selection:** a shared indicator slides between rows and segmented options on the spring curve.
- **Loops:** the running conveyor and the agent weave are linear and only ever mean "alive".
- **Kinetic type:** only values that change move (counters roll, branch names re-type). Static copy never moves.
- **Feedback:** `data-fx="save"` shows spinner → check that pops; `data-fx="deny"` shakes for 360ms.

**Reduced motion:** loops stop and become static dashed patterns, transforms become cross-fades, and every state stays readable. It triggers from the OS (`prefers-reduced-motion`) or `data-motion="reduced"`.
