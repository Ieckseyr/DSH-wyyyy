/**
 * Read files out of an Electron `.asar` archive without Electron.
 * Usage: node asar-read.mjs <archive> <inner/path> [outFile]
 *        node asar-read.mjs <archive> --list <prefix>
 */
import { readFileSync, writeFileSync } from 'node:fs';

const archive = process.argv[2];
const target = process.argv[3];
const out = process.argv[4];

const buffer = readFileSync(archive);
const headerSize = buffer.readUInt32LE(4);
// Pickle layout: [u32 inner size][u32 header size][u32 payload size][u32 string len][json…]
const jsonLength = buffer.readUInt32LE(12);
const jsonStart = 16;
const header = JSON.parse(buffer.subarray(jsonStart, jsonStart + jsonLength).toString('utf8'));
const dataStart = 8 + headerSize;

function lookup(node, parts) {
  let current = node;
  for (const part of parts) {
    if (!current || !current.files) return null;
    current = current.files[part];
  }
  return current || null;
}

if (target === '--list') {
  const prefix = (out || '').split('/').filter(Boolean);
  const node = prefix.length ? lookup(header, prefix) : header;
  const walk = (entry, depth) => {
    for (const [name, child] of Object.entries(entry.files || {})) {
      if (depth < 3) console.log(`${' '.repeat(depth * 2)}${name}${child.files ? '/' : ''}`);
      if (child.files) walk(child, depth + 1);
    }
  };
  if (node) walk(node, 0);
  process.exit(0);
}

const entry = lookup(header, target.split('/').filter(Boolean));
if (!entry) {
  console.error('not found:', target);
  process.exit(1);
}
if (entry.files) {
  console.error('is a directory');
  process.exit(1);
}
const start = dataStart + Number(entry.offset);
const bytes = buffer.subarray(start, start + entry.size);
if (out) writeFileSync(out, bytes);
else process.stdout.write(bytes);
