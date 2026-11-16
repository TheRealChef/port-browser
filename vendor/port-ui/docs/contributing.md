# Contributing

1. **Edit `src/`, never `dist/`.**
   - `src/tokens/tokens.json`: every token, with a usage note. Names are `[a-z0-9-]`, and each colour has `light` and `dark`.
   - `src/tokens/presets.json`: preset overrides (only the tokens a preset changes).
   - `src/css/NN-<area>.css`: component styles, concatenated in filename order. Scope every selector under `.port`.
   - `src/js/core.js`: behaviour. It must stay dependency-free and delegated, so markup added later works.
   - `src/icons/*.svg`: 16×16 artboard, 1.5 stroke, round caps and joins, `stroke="currentColor"`, no fills.
2. **Build:** `npm run build`.
3. **Check:** `npm run check`. Every text pair must reach 4.5:1 (7:1 in `contrast`) in both modes. The check exits non-zero on failure, so wire it into CI.
4. **Look at both themes** in `examples/html/index.html`. Light and dark have equal priority, and nothing ships after being reviewed in only one.
5. **Release:** bump `package.json`, add a CHANGELOG entry and commit `dist/` with the source.

## Rules that keep Port consistent

- One primary button per view, in the app's identity hue.
- `violet` only where an agent acts. `focus` only for the keyboard ring.
- State never relies on colour alone; add an icon, shape, weight or motion.
- New components use existing tokens. If a value isn't a token, it probably shouldn't exist.
- Write copy from the user's side: say what the control does ("Discard changes"), and make errors say how to fix the problem.
