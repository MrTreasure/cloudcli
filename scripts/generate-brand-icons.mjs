/** Regenerates browser, installed-app and notification icons from the shared C137 logo. */
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(path.join(root, 'src/assets/c137-logo.webp'));
const version = createHash('sha256').update(source).digest('hex').slice(0, 8);
const publicDir = path.join(root, 'public');
await mkdir(path.join(publicDir, 'icons'), { recursive: true });
const render = size => sharp(source).resize(size, size, { fit: 'contain', background: '#00000000' }).png().toBuffer();
const write = (name, data) => writeFile(path.join(publicDir, name), data);
const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];
for (const size of sizes) {
  const png = await render(size);
  await write(`icons/c137-${version}-${size}.png`, png);
  await write(`icons/icon-${size}x${size}.png`, png);
}
for (const size of [32, 64, 128, 256, 512]) await write(`logo-${size}.png`, await render(size));
const png = await render(32);
await write('favicon.png', png);
await write(`favicon-c137-${version}.png`, png);
await write('favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><image width="256" height="256" href="data:image/png;base64,${(await render(256)).toString('base64')}"/></svg>\n`);
// ICO supports PNG-compressed entries. Include real dimensions for browsers
// requesting the conventional /favicon.ico as well as the versioned link.
const frames = await Promise.all([16, 32, 48, 64, 128, 256].map(async size => ({ size, data: await render(size) })));
const header = Buffer.alloc(6 + frames.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(frames.length, 4);
let offset = header.length;
frames.forEach(({ size, data }, index) => {
  const entry = 6 + index * 16;
  header[entry] = header[entry + 1] = size === 256 ? 0 : size;
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(data.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += data.length;
});
const ico = Buffer.concat([header, ...frames.map(frame => frame.data)]);
await write('favicon.ico', ico);
await write(`favicon-c137-${version}.ico`, ico);
const htmlPath = path.join(root, 'index.html');
let html = await readFile(htmlPath, 'utf8');
html = html.replace(/    <link rel="icon"[^>]*\/?>\n/g, '');
html = html.replace('    <meta name="viewport"', `    <link rel="icon" type="image/x-icon" href="/favicon-c137-${version}.ico" />\n    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-c137-${version}.png" />\n    <meta name="viewport"`);
html = html.replace(/(<link rel="apple-touch-icon" sizes=")(\d+)x\d+(" href=")[^"]+(" \/>)/g, (_, before, size, middle, after) => `${before}${size}x${size}${middle}/icons/c137-${version}-${size}.png${after}`);
await writeFile(htmlPath, html);
const manifestPath = path.join(publicDir, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.icons = manifest.icons.map(icon => ({ ...icon, src: `/icons/c137-${version}-${icon.sizes.split('x')[0]}.png` }));
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
const workerPath = path.join(publicDir, 'sw.js');
let worker = await readFile(workerPath, 'utf8');
worker = worker.replace(/const CACHE_NAME = '[^']+';/, `const CACHE_NAME = 'c137-ui-${version}';`)
  .replace("title: 'CloudCLI'", "title: 'C137控制台'")
  .replace(/icon: '[^']+'/, `icon: '/icons/c137-${version}-192.png'`)
  .replace(/badge: '[^']+'/, `badge: '/icons/c137-${version}-96.png'`);
await writeFile(workerPath, worker);
console.log(`C137 icons generated: ${version}`);
