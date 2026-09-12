import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const classic = existsSync(resolve(root, 'js/game.js'));
const sources = ['core.mjs', 'renderer.mjs', 'game.mjs'].map(name => readFileSync(resolve(root, 'lineage', name), 'utf8').replace(/^import .*?;\s*$/gm, '').replace(/^export /gm, ''));
const js = `'use strict';\n(()=>{\n${sources.join('\n')}\n})();`;
// Parsing the final joined bytes catches namespace and bundling errors before delivery.
new Function(js);
const css = readFileSync(resolve(root, 'lineage/style.css'), 'utf8');
const html = readFileSync(resolve(root, 'lineage/template.html'), 'utf8').replace('/*__CSS__*/', css).replace('/*__JS__*/', js).replace('<!-- CLASSIC_LINK -->', (classic || process.argv.includes('--with-classic')) ? '<a id="classic-link" href="index.html">Classic runner ↗</a>' : '');
const outputArg = process.argv.find(x => x.startsWith('--out='));
const output = outputArg ? outputArg.slice(6) : (classic ? 'lineage.html' : 'index.html');
if (!['index.html', 'lineage.html'].includes(output)) throw new Error('Unsupported build output');
if (classic && output === 'index.html') throw new Error('Refusing to overwrite the classic runner. Build lineage.html instead.');
writeFileSync(resolve(root, output), html);
console.log(`Built standalone ${output}: ${Buffer.byteLength(html)} bytes. No network runtime dependencies.`);
