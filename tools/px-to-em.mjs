/**
 * Turn the fixed-pixel stylesheet into one that scales with the window.
 *
 * The design was drawn against a 13px base font; every length is rewritten as
 * `em` against that base, so a single `font-size` on `.ntm-root` scales the whole
 * plugin. Hairlines (1px/2px borders and the radii that go with them) stay literal —
 * they are meant to look like hairlines at every scale.
 *
 * Usage: node tools/px-to-em.mjs [--write]
 */
import { readFileSync, writeFileSync } from 'node:fs';

const BASE = 13;
const KEEP = new Set(['1px', '2px']);
const file = new URL('../src/05-css.js', import.meta.url);
const source = readFileSync(file, 'utf8');

let converted = 0;
const out = source.replace(/(-?\d*\.?\d+)px/g, (match, value) => {
  if (KEEP.has(match)) return match;
  const em = Number(value) / BASE;
  converted += 1;
  const rounded = Math.abs(em) < 0.1 ? Number(em.toFixed(3)) : Number(em.toFixed(2));
  return `${rounded}em`;
});

console.log(`converted ${converted} lengths; ${(out.match(/\d+(\.\d+)?px/g) || []).length} px left`);
if (process.argv.includes('--write')) {
  writeFileSync(file, out);
  console.log('written');
} else {
  const left = out.match(/[^\n]*\d+(\.\d+)?px[^\n]*/g) || [];
  for (const line of left.slice(0, 20)) console.log('  ', line.trim().slice(0, 100));
}
