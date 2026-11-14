// Compare two preset fingerprints (see tests/e2e/fingerprint.spec.js): for each preset and note, the
// largest change in any octave band that is above the noise floor in either run.
import fs from 'node:fs';
const [a, b] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const BANDS = ['44', '88', '177', '354', '707', '1.4k', '2.8k', '5.7k', '11k'];
for (const key of Object.keys(a)) {
  const d = a[key].map((x, i) => b[key][i] - x);
  const loud = d.map((_, i) => i).filter(i => a[key][i] > -75 || b[key][i] > -75);
  const worst = Math.max(0, ...loud.map(i => Math.abs(d[i])));
  const big = loud.filter(i => Math.abs(d[i]) >= 2).map(i => `${BANDS[i]} Hz ${d[i] > 0 ? '+' : ''}${d[i]}`).join(', ');
  console.log(`${key.padEnd(24)} worst ${String(worst).padStart(3)} dB  ${big}`);
}
