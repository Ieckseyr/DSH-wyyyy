/**
 * Concatenate `src/*.js` into the single browser artifact `client.js`.
 *
 * The Harness Client loads one lazily-evaluated factory per plugin, so several source
 * files have to become one. Each chunk is an IIFE over a shared `NT` namespace, which
 * keeps names from colliding and lets every chunk stay readable on its own.
 *
 * Usage: node build-client.mjs
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const root = new URL('./', import.meta.url);
const sourceDir = new URL('./src/', import.meta.url);
const packageJson = JSON.parse(readFileSync(new URL('./package.json', root), 'utf8'));

const files = readdirSync(sourceDir)
  .filter((name) => name.endsWith('.js'))
  .sort();

if (!files.length) {
  console.error('no sources found in src/');
  process.exit(1);
}

const chunks = files.map((name) => {
  const body = readFileSync(new URL(name, sourceDir), 'utf8');
  return `/* ---- ${name} ---- */\n${body.trimEnd()}\n`;
});

const out = `window.__ModuleLoader__.load({
  id: ${JSON.stringify(packageJson.name)},
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const NT = { React, h };

${chunks.join('\n')}
    return {
      inject: ['slots'],
      apply(ctx) {
        NT.apply(ctx);
      },
    };
  },
});
`;

writeFileSync(new URL('./client.js', root), out, 'utf8');
console.log(`client.js: ${files.length} chunks, ${(out.length / 1024).toFixed(1)} KiB`);
