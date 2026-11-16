// Contrast check for every theme and preset. `node scripts/check.mjs` — exits 1 on any failure.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const T = JSON.parse(fs.readFileSync(path.join(root, "src/tokens/tokens.json"), "utf8"));
const PRE = JSON.parse(fs.readFileSync(path.join(root, "src/tokens/presets.json"), "utf8"));
const lum = (h) => { const n = h.replace("#", ""); const c = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const hues = ["brand", "mineral", "clay", "cobalt", "violet", "teal", "amber", "coral", "lichen", "heather", "graphite"];
let fails = 0, checks = 0;
for (const p of PRE.presets) for (const th of ["light", "dark"]) {
  const v = {}; for (const t of T.color.tokens) { let x = typeof t.value === "string" ? t.value : t.value[th]; v[t.name] = x; }
  for (const k in v) { const m = /^\{(.+)\}$/.exec(v[k]); if (m) v[k] = v[m[1]]; }
  Object.assign(v, p[th]);
  const text = p.id === "contrast" ? 7 : 4.5, mark = p.id === "contrast" ? 4.5 : 3;
  const pairs = [];
  for (const s of ["surface-0", "surface-1", "surface-2"]) { pairs.push(["ink", s, text], ["ink-2", s, text], ["ink-3", s, text], ["line-strong", s, mark], ["focus", s, mark]); }
  for (const h of hues) pairs.push([h + "-ink", h + "-tint", text], [h + "-ink", "surface-1", text], ["on-fill", h, text], ["ink", h + "-tint", text], [h, "surface-1", 3]);
  for (const [a, b, min] of pairs) { checks++; const r = ratio(v[a], v[b]); if (r < min) { fails++; console.log(`✗ ${p.id}/${th}: ${a} on ${b} = ${r.toFixed(2)} (needs ${min})`); } }
}
console.log(fails ? `${fails} of ${checks} contrast checks failed` : `All ${checks} contrast checks pass across ${PRE.presets.length} presets × 2 modes`);
process.exit(fails ? 1 : 0);
