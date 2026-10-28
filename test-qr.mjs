/**
 * Prove the hand-written QR encoder: encode text → rasterise → decode with zxing-cpp.
 * A successful round trip means a phone camera can read the login code.
 * Usage: node test-qr.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const source = readFileSync(new URL('./src/10-qr.js', import.meta.url), 'utf8');
const NT = {};
new Function('NT', source)(NT);

const samples = [
  'https://music.163.com/login?codekey=0680aac5-ada9-4fbd-b0f1-dcde1d1f21a6',
  'https://music.163.com/login?codekey=0123456789abcdef0123456789abcdef',
  'HELLO',
  'https://music.163.com/login?codekey=' + 'a1b2c3d4'.repeat(4),
  '短链测试 https://music.163.com/login?codekey=zzz',
  'https://music.163.com/login?codekey=' + 'f'.repeat(60),
];

const dir = mkdtempSync(join(tmpdir(), 'ntm-qr-'));
const jobs = [];
samples.forEach((text, index) => {
  const symbol = NT.qrEncode(text);
  const rows = symbol.modules.map((row) => row.map((v) => (v ? 1 : 0)));
  jobs.push({ index, text, version: symbol.type, size: symbol.size, rows });
});

const py = `
import json, sys, zxingcpp
from PIL import Image
jobs = json.loads(sys.argv[1])
dir = sys.argv[2]
SCALE, BORDER = 8, 4
out = []
for job in jobs:
    rows = job['rows']; n = len(rows)
    img = Image.new('L', ((n + BORDER * 2) * SCALE, (n + BORDER * 2) * SCALE), 255)
    px = img.load()
    for r in range(n):
        for c in range(n):
            if rows[r][c]:
                for dy in range(SCALE):
                    for dx in range(SCALE):
                        px[(c + BORDER) * SCALE + dx, (r + BORDER) * SCALE + dy] = 0
    path = f"{dir}/qr-{job['index']}.png"
    img.save(path)
    res = zxingcpp.read_barcode(img)
    out.append({'index': job['index'], 'decoded': res.text if res else None, 'format': str(res.format) if res else None})
print(json.dumps(out))
`;

const decoded = JSON.parse(
  execFileSync('python', ['-c', py, JSON.stringify(jobs), dir], { encoding: 'utf8', maxBuffer: 1 << 26 }),
);

let failures = 0;
for (const job of jobs) {
  const got = decoded.find((d) => d.index === job.index);
  const ok = got && got.decoded === job.text;
  if (!ok) failures += 1;
  console.log(
    `${ok ? 'PASS' : 'FAIL'} v${job.version} ${job.size}x${job.size} ` +
      `${Buffer.byteLength(job.text)}B -> ${got?.decoded === null ? 'UNREADABLE' : JSON.stringify((got?.decoded || '').slice(0, 40))}`,
  );
}

// Keep one artefact for eyeballing.
if (jobs.length) {
  writeFileSync(new URL('./scratch-qr-sample.txt', import.meta.url), jobs[0].rows.map((r) => r.map((v) => (v ? '##' : '  ')).join('')).join('\n'), 'utf8');
}

console.log(failures ? `${failures} FAILED` : 'ALL DECODE OK');
process.exit(failures ? 1 : 0);
